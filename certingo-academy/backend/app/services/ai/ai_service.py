from typing import Optional

from sqlalchemy.orm import Session

from ...config import get_settings
from ...core.logging import get_logger
from ...database import models
from ..vault.vault_service import VaultService
from .anthropic_provider import AnthropicProvider
from .base_provider import AIProvider
from .mock_provider import MockProvider
from .openai_provider import OpenAIProvider

logger = get_logger(__name__)


class AIService:
    """Orchestrates AI content generation for a tenant.

    Picks the provider from TenantAISettings (vault API key first, then the
    process environment as a dev fallback, then mock) and wraps every provider
    call so an LLM failure degrades to a mock response instead of a 500.
    """

    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.vault = VaultService()
        self.settings = self._get_settings()
        self.provider = self._init_provider()
        # Provider that actually produced the last response (updated on fallback).
        self.last_provider_used = self.provider_name

    @property
    def provider_name(self) -> str:
        return getattr(self.provider, "provider_name", "mock")

    def _get_settings(self):
        settings = self.db.query(models.TenantAISettings).filter(
            models.TenantAISettings.tenant_id == self.tenant_id
        ).first()
        if not settings:
            return models.TenantAISettings(tenant_id=self.tenant_id, provider="mock")
        return settings

    def _resolve_api_key(self, key_name: str) -> Optional[str]:
        """Tenant vault first; process environment as a dev fallback."""
        api_key = self.vault.get_secret(self.db, self.tenant_id, key_name)
        if api_key:
            return api_key
        env_key = getattr(get_settings(), key_name, None)
        if env_key:
            logger.info(
                "%s not found in the vault for tenant %s; using the environment fallback.",
                key_name,
                self.tenant_id,
            )
        return env_key

    def _init_provider(self) -> AIProvider:
        app_settings = get_settings()
        provider_name = self.settings.provider or app_settings.AI_PROVIDER
        if app_settings.AI_PROVIDER != "mock":
            provider_name = app_settings.AI_PROVIDER

        if provider_name == "openai":
            api_key = self._resolve_api_key("OPENAI_API_KEY")
            if not api_key:
                logger.warning(
                    "OPENAI_API_KEY not found in vault or environment for tenant %s. "
                    "Falling back to mock provider.",
                    self.tenant_id,
                )
                return MockProvider()
            return OpenAIProvider(api_key=api_key, model_name=self.settings.model_name)
        elif provider_name == "anthropic":
            api_key = self._resolve_api_key("ANTHROPIC_API_KEY")
            if not api_key:
                logger.warning(
                    "ANTHROPIC_API_KEY not found in vault or environment for tenant %s. "
                    "Falling back to mock provider.",
                    self.tenant_id,
                )
                return MockProvider()
            return AnthropicProvider(api_key=api_key, model_name=self.settings.model_name)
        elif provider_name == "mcp":
            logger.warning(
                "MCP provider is not implemented yet. Falling back to mock provider for tenant %s.",
                self.tenant_id,
            )
            return MockProvider()
        else:
            return MockProvider()

    async def _with_fallback(self, method_name: str, *args, **kwargs):
        """Run a provider method; on any failure serve the mock response.

        An external LLM failure must never take an endpoint down (no 500s
        caused by the provider API).
        """
        self.last_provider_used = self.provider_name
        try:
            return await getattr(self.provider, method_name)(*args, **kwargs)
        except Exception as exc:
            logger.warning(
                "AI provider '%s' failed during %s (%s). Serving mock response instead.",
                self.provider_name,
                method_name,
                exc,
            )
            self.last_provider_used = "mock"
            return await getattr(MockProvider(), method_name)(*args, **kwargs)

    async def generate_lesson(self, learner_profile: dict, skill: dict, source_content: str, mastery: float):
        if not source_content or len(source_content.strip()) < 50:
            return {
                "status": "insufficient_context",
                "message": f"No hay suficiente contenido validado para generar esta lección sobre {skill.get('name')}."
            }

        # Fetch relevant Learning Bits to enrich the tutor prompt
        bits = self.db.query(models.LearningBit).filter(
            models.LearningBit.skill_id == skill.get('id'),
            models.LearningBit.status == "published"
        ).all()

        return await self._with_fallback(
            "generate_lesson", learner_profile, skill, source_content, mastery, bits=bits
        )

    async def generate_question(self, learner_profile: dict, skill: dict, source_content: str, difficulty: str):
        if not source_content or len(source_content.strip()) < 50:
            return {
                "status": "insufficient_context",
                "message": "Insufficient context to generate questions."
            }
        return await self._with_fallback(
            "generate_question", learner_profile, skill, source_content, difficulty
        )

    async def generate_feedback(self, learner_profile: dict, question: dict, answer: str, is_correct: bool):
        return await self._with_fallback(
            "generate_feedback", learner_profile, question, answer, is_correct
        )
