import asyncio
from typing import Dict, List, Optional

from .base_provider import AIProvider


class MockProvider(AIProvider):
    provider_name = "mock"

    async def generate_lesson(self, learner_profile: Dict, skill: Dict, source_content: str, mastery_score: float, bits: Optional[List] = None) -> Dict:
        # Simulate AI processing time
        await asyncio.sleep(0.5)
        return {
            "title": f"Mastering {skill['name']}",
            "objective": f"Understand the core concepts of {skill['name']}.",
            "analogy": f"Think of {skill['name']} like a specialized tool in a toolkit. You use it when you need a specific result.",
            "simple_explanation": f"This skill allows you to manage {skill['name']} effectively within the cloud environment.",
            "example": f"For instance, when setting up a new project, you would use {skill['name']} to ensure security.",
            "question": {
                "prompt": f"What is the primary benefit of {skill['name']}?",
                "options": ["Increased cost", "Better security", "Slower performance", "Less control"],
                "correct_answer": "Better security",
                "explanation": f"{skill['name']} is designed to enhance the security posture of your cloud resources.",
                "difficulty": "easy"
            },
            "next_recommendation": "Try the advanced practice module for this skill."
        }

    async def generate_question(self, learner_profile: Dict, skill: Dict, source_content: str, difficulty: str) -> Dict:
        await asyncio.sleep(0.3)
        return {
            "prompt": f"Which of the following best describes {skill['name']} at a {difficulty} level?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": f"Option A is correct because it follows the {difficulty} principles of {skill['name']}.",
            "difficulty": difficulty
        }

    async def generate_feedback(self, learner_profile: Dict, question: Dict, answer: str, is_correct: bool) -> Dict:
        if is_correct:
            return {
                "message": "Excellent work! You've grasped this concept perfectly.",
                "encouragement": "Keep up the momentum!",
                "technical_note": "Your answer aligns with best practices."
            }
        else:
            return {
                "message": "Not quite right, but a great learning opportunity.",
                "encouragement": "Let's review the core concept and try again.",
                "technical_note": "Remember that the focus here is on efficiency and security."
            }
