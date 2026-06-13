from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class ProviderError(Exception):
    """Raised when an AI provider fails to produce a valid response.

    AIService catches this (and any other exception) and falls back to the
    mock provider so an LLM failure never takes an endpoint down.
    """


class AIProvider(ABC):
    # Short identifier reported back to API consumers ("mock", "openai", ...).
    provider_name: str = "unknown"

    @abstractmethod
    async def generate_lesson(
        self,
        learner_profile: Dict,
        skill: Dict,
        source_content: str,
        mastery_score: float,
        bits: Optional[List] = None,
    ) -> Dict:
        pass

    @abstractmethod
    async def generate_question(self, learner_profile: Dict, skill: Dict, source_content: str, difficulty: str) -> Dict:
        pass

    @abstractmethod
    async def generate_feedback(self, learner_profile: Dict, question: Dict, answer: str, is_correct: bool) -> Dict:
        pass
