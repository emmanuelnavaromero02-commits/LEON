from abc import ABC, abstractmethod
from typing import Dict, Any, List

class AIProvider(ABC):
    @abstractmethod
    async def generate_lesson(self, learner_profile: Dict, skill: Dict, source_content: str, mastery_score: float) -> Dict:
        pass

    @abstractmethod
    async def generate_question(self, learner_profile: Dict, skill: Dict, source_content: str, difficulty: str) -> Dict:
        pass

    @abstractmethod
    async def generate_feedback(self, learner_profile: Dict, question: Dict, answer: str, is_correct: bool) -> Dict:
        pass
