"""Phase 2 AI provider tests. No real network calls: the Anthropic client is
monkeypatched at messages.create and httpx.AsyncClient.post is monkeypatched
for the OpenAI provider."""
import asyncio
import json
import uuid

import anthropic
import httpx
import pytest

from app.config import get_settings
from app.database import models
from app.schemas.ai import LessonContent, build_structured_output_schema
from app.services.ai.ai_service import AIService
from app.services.ai.anthropic_provider import DEFAULT_MODEL, AnthropicProvider
from app.services.ai.base_provider import ProviderError
from app.services.ai.mock_provider import MockProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.vault.vault_service import VaultService
from tests.conftest import auth_headers

SKILL = {"id": "skill-1", "name": "IAM"}
SOURCE_CONTENT = "IAM lets you manage access to AWS services and resources securely. " * 3

# Shape produced by the tutor prompt (no "objective"/"next_recommendation").
VALID_LESSON = {
    "title": "IAM en la práctica",
    "analogy": "IAM es como el portero de un edificio.",
    "simple_explanation": "IAM controla quién puede hacer qué.",
    "example": "Crear una policy de solo lectura para S3.",
    "common_mistake": "Usar el usuario root para el día a día.",
    "exam_tip": "Busca la opción de mínimo privilegio.",
    "question": {
        "prompt": "¿Qué servicio controla el acceso?",
        "options": ["IAM", "S3", "EC2", "VPC"],
        "correct_answer": "IAM",
        "explanation": "IAM gestiona identidades y permisos.",
    },
}

VALID_QUESTION = {
    "prompt": "¿Qué describe mejor IAM?",
    "options": ["Identidad y acceso", "Almacenamiento", "Cómputo", "Redes"],
    "correct_answer": "Identidad y acceso",
    "explanation": "IAM gestiona identidades y permisos.",
    "difficulty": "medium",
}


class _FakeTextBlock:
    type = "text"

    def __init__(self, text):
        self.text = text


class _FakeResponse:
    def __init__(self, text, stop_reason="end_turn"):
        self.content = [_FakeTextBlock(text)]
        self.stop_reason = stop_reason


def _patch_anthropic_create(monkeypatch, provider, response=None, error=None):
    async def fake_create(**kwargs):
        if error is not None:
            raise error
        return response

    monkeypatch.setattr(provider.client.messages, "create", fake_create)


def _auth_error():
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(401, request=request)
    return anthropic.AuthenticationError("invalid x-api-key", response=response, body=None)


@pytest.fixture()
def anthropic_tenant(db, tenants, users):
    """tenant-1 configured for Anthropic with an API key in the vault."""
    tenant1, _ = tenants
    db.add(models.TenantAISettings(tenant_id=tenant1.id, provider="anthropic"))
    db.commit()
    VaultService().set_secret(db, tenant1.id, "ANTHROPIC_API_KEY", "sk-ant-test-key", users["admin1"].id)
    return tenant1


# --- AnthropicProvider unit tests -------------------------------------------

def test_anthropic_provider_parses_valid_response(monkeypatch):
    provider = AnthropicProvider(api_key="sk-test")
    _patch_anthropic_create(monkeypatch, provider, response=_FakeResponse(json.dumps(VALID_LESSON)))

    result = asyncio.run(provider.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))

    assert result["title"] == VALID_LESSON["title"]
    assert result["question"]["correct_answer"] == "IAM"
    assert len(result["question"]["options"]) == 4
    # exclude_none: optional fields the LLM did not produce are not in the payload
    assert "objective" not in result


@pytest.mark.parametrize("stop_reason", ["max_tokens", "refusal"])
def test_anthropic_provider_bad_stop_reason_raises(monkeypatch, stop_reason):
    provider = AnthropicProvider(api_key="sk-test")
    _patch_anthropic_create(
        monkeypatch, provider, response=_FakeResponse('{"title": "trunc', stop_reason=stop_reason)
    )

    with pytest.raises(ProviderError):
        asyncio.run(provider.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))


def test_anthropic_model_selection():
    assert AnthropicProvider(api_key="k").model_name == DEFAULT_MODEL == "claude-opus-4-8"
    assert AnthropicProvider(api_key="k", model_name="claude-sonnet-4-6").model_name == "claude-sonnet-4-6"
    assert AnthropicProvider(api_key="k", model_name="claude-haiku-4-5").model_name == "claude-haiku-4-5"
    # Unknown / legacy names fall back to the default
    assert AnthropicProvider(api_key="k", model_name="claude-3-5-sonnet").model_name == DEFAULT_MODEL


def test_structured_output_schema_follows_anthropic_rules():
    schema = build_structured_output_schema(LessonContent)

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                assert node["additionalProperties"] is False
            for forbidden in ("minimum", "maximum", "minLength", "maxLength", "default", "format"):
                assert forbidden not in node
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(schema)
    assert schema["type"] == "object"
    assert "title" in schema["required"]


# --- AIService resilience (fallback to mock) --------------------------------

def test_aiservice_falls_back_to_mock_on_truncated_response(db, anthropic_tenant, monkeypatch):
    service = AIService(db, anthropic_tenant.id)
    assert isinstance(service.provider, AnthropicProvider)
    _patch_anthropic_create(
        monkeypatch, service.provider, response=_FakeResponse('{"title": "trunc', stop_reason="max_tokens")
    )

    result = asyncio.run(service.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))

    assert result["title"] == f"Mastering {SKILL['name']}"  # mock response
    assert service.last_provider_used == "mock"


def test_aiservice_falls_back_to_mock_on_invalid_json(db, anthropic_tenant, monkeypatch):
    service = AIService(db, anthropic_tenant.id)
    _patch_anthropic_create(monkeypatch, service.provider, response=_FakeResponse("this is not JSON {"))

    result = asyncio.run(service.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))

    assert result["title"] == f"Mastering {SKILL['name']}"
    assert service.last_provider_used == "mock"


def test_aiservice_falls_back_to_mock_on_schema_mismatch(db, anthropic_tenant, monkeypatch):
    service = AIService(db, anthropic_tenant.id)
    # Valid JSON, but missing required LessonContent fields
    _patch_anthropic_create(monkeypatch, service.provider, response=_FakeResponse(json.dumps({"title": "x"})))

    result = asyncio.run(service.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))

    assert result["title"] == f"Mastering {SKILL['name']}"
    assert service.last_provider_used == "mock"


def test_aiservice_falls_back_to_mock_on_authentication_error(db, anthropic_tenant, monkeypatch):
    service = AIService(db, anthropic_tenant.id)
    _patch_anthropic_create(monkeypatch, service.provider, error=_auth_error())

    result = asyncio.run(service.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))

    assert result["title"] == f"Mastering {SKILL['name']}"
    assert service.last_provider_used == "mock"


def test_aiservice_insufficient_context_short_circuits(db, anthropic_tenant):
    service = AIService(db, anthropic_tenant.id)

    result = asyncio.run(service.generate_lesson({}, SKILL, "too short", 0.5))

    assert result["status"] == "insufficient_context"


# --- Provider selection ------------------------------------------------------

def test_missing_api_key_uses_mock_provider(db, tenants, monkeypatch):
    tenant1, _ = tenants
    db.add(models.TenantAISettings(tenant_id=tenant1.id, provider="anthropic"))
    db.commit()
    monkeypatch.setattr(get_settings(), "ANTHROPIC_API_KEY", None)

    service = AIService(db, tenant1.id)

    assert isinstance(service.provider, MockProvider)
    assert service.provider_name == "mock"


def test_vault_key_selects_anthropic_provider(db, anthropic_tenant):
    service = AIService(db, anthropic_tenant.id)

    assert isinstance(service.provider, AnthropicProvider)
    assert service.provider.model_name == DEFAULT_MODEL


def test_env_fallback_key_selects_anthropic_provider(db, tenants, monkeypatch):
    tenant1, _ = tenants
    db.add(models.TenantAISettings(tenant_id=tenant1.id, provider="anthropic", model_name="claude-sonnet-4-6"))
    db.commit()
    monkeypatch.setattr(get_settings(), "ANTHROPIC_API_KEY", "sk-ant-from-env")

    service = AIService(db, tenant1.id)

    assert isinstance(service.provider, AnthropicProvider)
    assert service.provider.model_name == "claude-sonnet-4-6"


def test_mcp_tenant_falls_back_to_mock(db, tenants):
    tenant1, _ = tenants
    db.add(models.TenantAISettings(tenant_id=tenant1.id, provider="mcp"))
    db.commit()

    service = AIService(db, tenant1.id)

    assert isinstance(service.provider, MockProvider)


# --- OpenAIProvider unit tests ------------------------------------------------

def test_openai_provider_parses_valid_response(monkeypatch):
    payload = {"choices": [{"message": {"content": json.dumps(VALID_QUESTION)}}]}

    async def fake_post(self, url, **kwargs):
        assert kwargs["json"]["response_format"] == {"type": "json_object"}
        # json_object mode requires the prompt to mention "JSON"
        assert "JSON" in kwargs["json"]["messages"][0]["content"]
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = OpenAIProvider(api_key="sk-test")

    result = asyncio.run(provider.generate_question({}, SKILL, SOURCE_CONTENT, "medium"))

    assert result["correct_answer"] == "Identidad y acceso"
    assert result["difficulty"] == "medium"


def test_openai_provider_http_error_raises(monkeypatch):
    async def fake_post(self, url, **kwargs):
        return httpx.Response(500, text="upstream exploded", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = OpenAIProvider(api_key="sk-test")

    with pytest.raises(ProviderError):
        asyncio.run(provider.generate_feedback({}, {"prompt": "Q?"}, "A", True))


def test_openai_provider_network_error_raises(monkeypatch):
    async def fake_post(self, url, **kwargs):
        raise httpx.ConnectError("connection refused", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = OpenAIProvider(api_key="sk-test")

    with pytest.raises(ProviderError):
        asyncio.run(provider.generate_lesson({}, SKILL, SOURCE_CONTENT, 0.5))


# --- /api/admin/ai-studio/generate-test endpoint ------------------------------

def _seed_knowledge(db, tenant_id):
    db.add(models.KnowledgeChunk(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        chunk_index=0,
        content=SOURCE_CONTENT,
    ))
    db.commit()


def test_generate_test_endpoint_lesson_with_mock_provider(client, db, users):
    _seed_knowledge(db, users["admin1"].tenant_id)

    resp = client.post(
        "/api/admin/ai-studio/generate-test",
        json={"skill_id": "skill-1", "prompt_type": "lesson"},
        headers=auth_headers(users["admin1"]),
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "mock"
    assert body["output"]["title"] == "Mastering Test Skill"
    assert body["output"]["question"]["options"]


def test_generate_test_endpoint_question_with_mock_provider(client, db, users):
    _seed_knowledge(db, users["admin1"].tenant_id)

    resp = client.post(
        "/api/admin/ai-studio/generate-test",
        json={"skill_id": "skill-1", "prompt_type": "question"},
        headers=auth_headers(users["admin1"]),
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "mock"
    assert body["output"]["difficulty"] == "medium"


def test_generate_test_endpoint_invalid_prompt_type_is_400(client, db, users):
    resp = client.post(
        "/api/admin/ai-studio/generate-test",
        json={"skill_id": "skill-1", "prompt_type": "haiku"},
        headers=auth_headers(users["admin1"]),
    )
    assert resp.status_code == 400


def test_generate_test_endpoint_missing_fields_is_400(client, db, users):
    resp = client.post(
        "/api/admin/ai-studio/generate-test",
        json={"prompt_type": "lesson"},
        headers=auth_headers(users["admin1"]),
    )
    assert resp.status_code == 400
