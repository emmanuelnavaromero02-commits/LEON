from sqlalchemy.orm import Session
from ...database import models
from ..vault.vault_service import VaultService
from .mock_provider import MockProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
import os

class AIService:
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.vault = VaultService()
        self.settings = self._get_settings()
        self.provider = self._init_provider()

    def _get_settings(self):
        settings = self.db.query(models.TenantAISettings).filter(
            models.TenantAISettings.tenant_id == self.tenant_id
        ).first()
        if not settings:
            return models.TenantAISettings(tenant_id=self.tenant_id, provider="mock")
        return settings

    def _init_provider(self):
        provider_name = os.getenv("AI_PROVIDER", self.settings.provider)
        if provider_name == "openai":
            api_key = self.vault.get_secret(self.db, self.tenant_id, "OPENAI_API_KEY")
            return OpenAIProvider(api_key=api_key, model=self.settings.model_name or "gpt-4o")
        elif provider_name == "anthropic":
            api_key = self.vault.get_secret(self.db, self.tenant_id, "ANTHROPIC_API_KEY")
            return AnthropicProvider(api_key=api_key, model=self.settings.model_name or "claude-3-5-sonnet")
        else:
            return MockProvider()

    async def generate_lesson(self, learner_profile: dict, skill: dict, source_content: str, mastery: float):
        if not source_content or len(source_content.strip()) < 50:
            return {
                "status": "insufficient_context",
                "message": f"No hay suficiente contenido validado para generar esta lección sobre {skill.get('name')}."
            }

        prompt = f"Learner: {learner_profile}\nSkill: {skill}\nContext: {source_content}\nMastery: {mastery}"
        return await self.provider.generate_lesson(prompt)

    async def generate_question(self, skill: dict, source_content: str, difficulty: str):
        if not source_content or len(source_content.strip()) < 50:
            return {
                "status": "insufficient_context",
                "message": "Insufficient context to generate questions."
            }
        return await self.provider.generate_question(skill, source_content, difficulty)
