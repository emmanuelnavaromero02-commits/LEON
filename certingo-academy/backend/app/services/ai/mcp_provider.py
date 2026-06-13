from typing import Dict, List, Optional

from .base_provider import AIProvider


class MCPProvider(AIProvider):
    """Not implemented yet. AIService never instantiates it: tenants that
    select "mcp" fall back to MockProvider with a warning."""

    provider_name = "mcp"

    def __init__(self, mcp_server_url: str):
        self.mcp_server_url = mcp_server_url

    async def generate_lesson(self, learner_profile: Dict, skill: Dict, source_content: str, mastery_score: float, bits: Optional[List] = None) -> Dict:
        # Implementation for MCP server communication would go here
        raise NotImplementedError("MCP API integration requires valid server connection.")

    async def generate_question(self, learner_profile: Dict, skill: Dict, source_content: str, difficulty: str) -> Dict:
        raise NotImplementedError("MCP API integration requires valid server connection.")

    async def generate_feedback(self, learner_profile: Dict, question: Dict, answer: str, is_correct: bool) -> Dict:
        raise NotImplementedError("MCP API integration requires valid server connection.")
