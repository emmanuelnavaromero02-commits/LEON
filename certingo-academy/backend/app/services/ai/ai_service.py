from .mock_provider import MockProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .mcp_provider import MCPProvider
import os

class AIService:
    def __init__(self, provider_type: str = None, api_key: str = None, mcp_url: str = None):
        # Prioritize passed params, then env vars
        self.provider_type = provider_type or os.getenv("AI_PROVIDER", "mock").lower()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        self.mcp_url = mcp_url or os.getenv("MCP_SERVER_URL")

        if self.provider_type == "openai" and self.api_key:
            self.provider = OpenAIProvider(self.api_key)
        elif self.provider_type == "anthropic" and self.api_key:
            self.provider = AnthropicProvider(self.api_key)
        elif self.provider_type == "mcp" and self.mcp_url:
            self.provider = MCPProvider(self.mcp_url)
        else:
            self.provider = MockProvider()

    async def generate_lesson(self, learner_profile, skill, source_content, mastery_score):
        return await self.provider.generate_lesson(learner_profile, skill, source_content, mastery_score)

    async def generate_question(self, learner_profile, skill, source_content, difficulty):
        return await self.provider.generate_question(learner_profile, skill, source_content, difficulty)

    async def generate_feedback(self, learner_profile, question, answer, is_correct):
        return await self.provider.generate_feedback(learner_profile, question, answer, is_correct)
