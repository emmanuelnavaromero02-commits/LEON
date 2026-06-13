"""Shared base for real LLM providers (Anthropic, OpenAI).

Subclasses only implement `_generate`, which sends a system + user prompt to
the underlying API and returns the raw JSON text. Prompt construction, JSON
decoding and Pydantic validation (belt and braces, even when the API already
guarantees schema-conforming JSON) live here so every provider behaves the
same way.
"""
import json
from abc import abstractmethod
from typing import Any, Dict, List, Optional, Type

from pydantic import BaseModel, ValidationError

from ...core.logging import get_logger
from ...schemas.ai import FeedbackContent, GeneratedQuestion, LessonContent
from .base_provider import AIProvider, ProviderError
from .prompt_manager import PromptManager

logger = get_logger(__name__)


class BaseLLMProvider(AIProvider):
    provider_name = "llm"

    @abstractmethod
    async def _generate(self, system_prompt: str, user_prompt: str, schema_model: Type[BaseModel]) -> str:
        """Call the LLM API and return the raw JSON text of the response."""

    async def _generate_validated(self, system_prompt: str, user_prompt: str, schema_model: Type[BaseModel]) -> Dict[str, Any]:
        raw_text = await self._generate(system_prompt, user_prompt, schema_model)
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            logger.warning("%s provider returned invalid JSON: %s", self.provider_name, exc)
            raise ProviderError(f"{self.provider_name} provider returned invalid JSON.") from exc
        try:
            validated = schema_model.model_validate(data)
        except ValidationError as exc:
            logger.warning(
                "%s provider returned JSON that does not match %s: %s",
                self.provider_name,
                schema_model.__name__,
                exc,
            )
            raise ProviderError(
                f"{self.provider_name} provider response does not match the {schema_model.__name__} schema."
            ) from exc
        return validated.model_dump(exclude_none=True)

    async def generate_lesson(
        self,
        learner_profile: Dict,
        skill: Dict,
        source_content: str,
        mastery_score: float,
        bits: Optional[List] = None,
    ) -> Dict:
        system_prompt = PromptManager.get_tutor_system_prompt(learner_profile, skill, bits)
        user_prompt = f"Contenido de referencia:\n{source_content}\n\nNivel de maestría actual: {mastery_score}"
        return await self._generate_validated(system_prompt, user_prompt, LessonContent)

    async def generate_question(self, learner_profile: Dict, skill: Dict, source_content: str, difficulty: str) -> Dict:
        system_prompt = PromptManager.get_question_system_prompt(learner_profile, skill, difficulty)
        user_prompt = (
            f"Contenido de referencia:\n{source_content}\n\n"
            f"Genera UNA pregunta de dificultad '{difficulty}'."
        )
        question = await self._generate_validated(system_prompt, user_prompt, GeneratedQuestion)
        question.setdefault("difficulty", difficulty)
        return question

    async def generate_feedback(self, learner_profile: Dict, question: Dict, answer: str, is_correct: bool) -> Dict:
        system_prompt = PromptManager.get_feedback_system_prompt(learner_profile)
        result = "CORRECTA" if is_correct else "INCORRECTA"
        user_prompt = (
            f"Pregunta: {question.get('prompt')}\n"
            f"Opciones: {question.get('options')}\n"
            f"Respuesta correcta: {question.get('correct_answer')}\n"
            f"Respuesta del estudiante: {answer}\n"
            f"La respuesta del estudiante es {result}."
        )
        return await self._generate_validated(system_prompt, user_prompt, FeedbackContent)
