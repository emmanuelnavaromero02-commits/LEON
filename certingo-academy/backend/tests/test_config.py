import pytest

from app.config import DEV_JWT_SECRET, Settings


def _base_env(**overrides):
    env = {
        "ENV": "dev",
        "DATABASE_URL": "sqlite://",
        "JWT_SECRET": "",
        "FIELD_ENCRYPTION_KEY": "",
    }
    env.update(overrides)
    return env


def test_dev_falls_back_to_insecure_jwt_secret(monkeypatch):
    for key, value in _base_env().items():
        monkeypatch.setenv(key, value)
    settings = Settings()
    assert settings.JWT_SECRET == DEV_JWT_SECRET
    assert settings.is_production is False


def test_production_without_jwt_secret_refuses_to_start(monkeypatch):
    for key, value in _base_env(ENV="production", FIELD_ENCRYPTION_KEY="some-key").items():
        monkeypatch.setenv(key, value)
    with pytest.raises(Exception):
        Settings()


def test_production_without_field_encryption_key_refuses_to_start(monkeypatch):
    for key, value in _base_env(ENV="production", JWT_SECRET="a-strong-secret").items():
        monkeypatch.setenv(key, value)
    with pytest.raises(Exception):
        Settings()


def test_production_with_all_secrets_starts(monkeypatch):
    env = _base_env(
        ENV="production",
        JWT_SECRET="a-strong-secret",
        FIELD_ENCRYPTION_KEY="x9y0Vn3PfYwGUVmZS9CY6kvIRI9dWFBGLZ3334Vc2tk=",
    )
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    settings = Settings()
    assert settings.is_production is True
    assert settings.JWT_SECRET == "a-strong-secret"


def test_cors_origins_accepts_comma_separated_string(monkeypatch):
    for key, value in _base_env(CORS_ORIGINS="http://a.com, http://b.com").items():
        monkeypatch.setenv(key, value)
    settings = Settings()
    assert settings.CORS_ORIGINS == ["http://a.com", "http://b.com"]


def test_dev_vault_key_is_generated_once_and_persisted(tmp_path, monkeypatch):
    from app.services.vault import vault_service

    key_file = tmp_path / ".field_key"
    monkeypatch.setattr(vault_service, "DEV_KEY_FILE", str(key_file))

    first = vault_service._load_or_create_dev_key()
    assert key_file.exists()
    second = vault_service._load_or_create_dev_key()
    # Key survives "restarts" (same file re-read, not regenerated)
    assert first == second
