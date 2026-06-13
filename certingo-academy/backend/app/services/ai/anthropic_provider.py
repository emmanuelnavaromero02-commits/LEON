"""Anthropic provider built on the official `anthropic` SDK.

Uses the async client with structured outputs (output_config json_schema):
the first text block of the response is guaranteed by the API to contain
valid JSON conforming to the schema; we still validate with Pydantic in
BaseLLMProvider (belt and braces).
"""
from typing import Optional, Type

import anthropic
from anthropic import AsyncAnthropic
from pydantic import BaseModel

from ...core.logging import get_logger
from ...schemas.ai import build_structured_output_schema
from .base_provider import ProviderError
from .llm_provider import BaseLLMProvider

logger = get_logger(__name__)

# Exact current model IDs (aliases, no date suffixes).
SUPPORTED_MODELS = ("claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5")
DEFAULT_MODEL = "claude-opus-4-8"
MAX_TOKENS = 4096
REQUEST_TIMEOUT_SECONDS = 60.0
MAX_RETRIES = 2


class AnthropicProvider(BaseLLMProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str, model_name: Optional[str] = None):
        if model_name not in SUPPORTED_MODELS:
            if model_name:
                logger.warning(
                    "Unsupported Anthropic model '%s'; using default '%s'.", model_name, DEFAULT_MODEL
                )
            model_name = DEFAULT_MODEL
        self.model_name = model_name
        self.client = AsyncAnthropic(
            api_key=api_key,
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=MAX_RETRIES,
        )

    async def _generate(self, system_prompt: str, user_prompt: str, schema_model: Type[BaseModel]) -> str:
        schema = build_structured_output_schema(schema_model)
        try:
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=MAX_TOKENS,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                output_config={"format": {"type": "json_schema", "schema": schema}},
            )
        except anthropic.AuthenticationError as exc:
            logger.error("Anthropic authentication failed: %s", exc)
            raise ProviderError("Anthropic authentication failed (invalid API key).") from exc
        except anthropic.RateLimitError as exc:
            logger.warning("Anthropic rate limit exceeded: %s", exc)
            raise ProviderError("Anthropic rate limit exceeded.") from exc
        except anthropic.APIConnectionError as exc:
            logger.warning("Could not reach the Anthropic API: %s", exc)
            raise ProviderError("Could not connect to the Anthropic API.") from exc
        except anthropic.APIStatusError as exc:
            logger.warning("Anthropic API returned status %s: %s", exc.status_code, exc)
            raise ProviderError(f"Anthropic API error (status {exc.status_code}).") from exc

        if response.stop_reason == "max_tokens":
            raise ProviderError(
                "Anthropic response was truncated (stop_reason=max_tokens); the JSON may be incomplete."
            )
        if response.stop_reason == "refusal":
            raise ProviderError("Anthropic declined the request (stop_reason=refusal).")

        text = next((block.text for block in response.content if block.type == "text"), None)
        if text is None:
            raise ProviderError("Anthropic response contained no text block.")
        return text
