from functools import lru_cache
from typing import Annotated, List, Optional, Union

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Insecure fallback used ONLY when ENV=dev and no JWT_SECRET is provided.
DEV_JWT_SECRET = "dev-insecure-jwt-secret-do-not-use-in-production"


class Settings(BaseSettings):
    """Central application settings, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Environment: "dev" or "production"
    ENV: str = "dev"

    # Database
    DATABASE_URL: str = "sqlite:///./certingo.db"

    # CORS (JSON list or comma-separated string in env)
    CORS_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000"]

    # Auth / JWT
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Field-level encryption key (Fernet) for the tenant secrets vault.
    # Optional in dev (a local key is generated and persisted), required in production.
    FIELD_ENCRYPTION_KEY: Optional[str] = None

    # AI provider override: "mock", "openai", "anthropic", "mcp"
    AI_PROVIDER: str = "mock"

    # Tenant slug used when registering/logging in without an explicit tenant
    DEFAULT_TENANT_SLUG: str = "demo"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                import json
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() in ("production", "prod")

    @model_validator(mode="after")
    def validate_production_requirements(self) -> "Settings":
        if self.is_production:
            if not self.JWT_SECRET:
                raise ValueError(
                    "JWT_SECRET must be set when ENV=production. Refusing to start."
                )
            if self.JWT_SECRET == DEV_JWT_SECRET:
                raise ValueError(
                    "JWT_SECRET is set to the insecure dev default in production. Refusing to start."
                )
            if not self.FIELD_ENCRYPTION_KEY:
                raise ValueError(
                    "FIELD_ENCRYPTION_KEY must be set when ENV=production. Refusing to start."
                )
        elif not self.JWT_SECRET:
            # Dev-only insecure fallback so local setups work out of the box.
            self.JWT_SECRET = DEV_JWT_SECRET
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
