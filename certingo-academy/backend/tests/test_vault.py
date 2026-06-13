from app.database import models
from app.services.ai.ai_service import AIService
from app.services.ai.mock_provider import MockProvider
from app.services.vault.vault_service import VaultService


def test_get_secret_missing_returns_none_without_crashing(db, tenants):
    tenant1, _ = tenants
    vault = VaultService()
    assert vault.get_secret(db, tenant1.id, "DOES_NOT_EXIST") is None


def test_secret_roundtrip(db, tenants):
    tenant1, tenant2 = tenants
    vault = VaultService()
    vault.set_secret(db, tenant1.id, "OPENAI_API_KEY", "sk-test-123456789", "user-1")

    assert vault.get_secret(db, tenant1.id, "OPENAI_API_KEY") == "sk-test-123456789"
    # Same key name in another tenant stays isolated
    assert vault.get_secret(db, tenant2.id, "OPENAI_API_KEY") is None


def test_decrypt_invalid_payload_returns_none(db):
    vault = VaultService()
    assert vault.decrypt(None) is None
    assert vault.decrypt("") is None
    assert vault.decrypt("not-a-fernet-token") is None


def test_ai_service_falls_back_to_mock_when_api_key_missing(db, tenants):
    """Callers of get_secret must not crash when the secret does not exist."""
    tenant1, _ = tenants
    db.add(models.TenantAISettings(tenant_id=tenant1.id, provider="openai"))
    db.commit()

    service = AIService(db, tenant1.id)
    assert isinstance(service.provider, MockProvider)
