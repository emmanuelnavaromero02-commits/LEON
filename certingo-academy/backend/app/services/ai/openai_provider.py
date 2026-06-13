"""OpenAI provider built directly on httpx (no OpenAI SDK dependency).

Calls the Chat Completions API with response_format json_object, which
requires the prompt to mention the word "JSON" — every system prompt in
PromptManager does. The JSON text is validated against the Pydantic schema
in BaseLLMProvider.
"""
from typing import Optional, Type

import httpx
from pydantic import BaseModel

from ...core.logging import get_logger
from .base_provider import ProviderError
from .llm_provider import BaseLLMProvider

logger = get_logger(__name__)

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o"
REQUEST_TIMEOUT_SECONDS = 60.0


class OpenAIProvider(BaseLLMProvider):
    provider_name = "openai"

    def __init__(self, api_key: str, model_name: Optional[str] = None):
        self.api_key = api_key
        self.model_name = model_name or DEFAULT_MODEL

    async def _generate(self, system_prompt: str, user_prompt: str, schema_model: Type[BaseModel]) -> str:
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(OPENAI_CHAT_COMPLETIONS_URL, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            logger.warning("Could not reach the OpenAI API: %s", exc)
            raise ProviderError("Could not connect to the OpenAI API.") from exc

        if response.status_code != 200:
            logger.warning(
                "OpenAI API returned status %s: %s", response.status_code, response.text[:500]
            )
            raise ProviderError(f"OpenAI API error (status {response.status_code}).")

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            logger.warning("Unexpected OpenAI response shape: %s", exc)
            raise ProviderError("Unexpected OpenAI response shape.") from exc

        if not isinstance(content, str):
            raise ProviderError("OpenAI response did not contain text content.")
        return content
