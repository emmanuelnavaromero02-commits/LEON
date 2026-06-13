"""Pydantic models that validate AI-generated content.

The shapes mirror what MockProvider returns so the frontend sees the same
structure whether content came from the mock or a real LLM. Fields produced
by only one source (mock vs. the tutor prompt in PromptManager) are optional;
the required core (title, explanation, example, question) is shared by both.

`build_structured_output_schema` turns these models into JSON Schemas that
satisfy the Anthropic structured-outputs rules:
- every object carries "additionalProperties": false
- only basic types + enum (no numeric/string constraints, no recursion)
"""
from typing import Any, Dict, List, Optional, Type

from pydantic import BaseModel


class GeneratedQuestion(BaseModel):
    prompt: str
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: Optional[str] = None


class LessonContent(BaseModel):
    title: str
    objective: Optional[str] = None
    analogy: Optional[str] = None
    simple_explanation: str
    example: str
    common_mistake: Optional[str] = None
    exam_tip: Optional[str] = None
    question: GeneratedQuestion
    next_recommendation: Optional[str] = None


class FeedbackContent(BaseModel):
    message: str
    encouragement: str
    technical_note: str


# Keys that Anthropic structured outputs do not accept (constraints/metadata).
_UNSUPPORTED_SCHEMA_KEYS = {
    "default",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "pattern",
    "minItems",
    "maxItems",
    "format",
}


def _clean_schema_node(node: Any) -> Any:
    if isinstance(node, dict):
        cleaned = {
            key: _clean_schema_node(value)
            for key, value in node.items()
            if key not in _UNSUPPORTED_SCHEMA_KEYS
        }
        if cleaned.get("type") == "object":
            cleaned["additionalProperties"] = False
        return cleaned
    if isinstance(node, list):
        return [_clean_schema_node(item) for item in node]
    return node


def build_structured_output_schema(model_cls: Type[BaseModel]) -> Dict[str, Any]:
    """Build an Anthropic structured-outputs compatible JSON Schema."""
    return _clean_schema_node(model_cls.model_json_schema())
