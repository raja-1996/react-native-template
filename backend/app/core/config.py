import os

from pydantic_settings import BaseSettings


def _env_first(*names: str, default: str = "") -> str:
    """Return the first non-empty env var value found, or *default*."""
    for name in names:
        val = os.getenv(name, "")
        if val:
            return val
    return default


class Settings(BaseSettings):
    # App
    app_name: str = "FastAPI Supabase Backend"
    debug: bool = False

    # Supabase — new publishable/secret keys take precedence over legacy JWT keys
    supabase_url: str = _env_first("SUPABASE_URL", default="http://localhost:54321")
    supabase_publishable_key: str = _env_first(
        "SUPABASE_PUBLISHABLE_DEFAULT_KEY", "SUPABASE_ANON_KEY"
    )
    supabase_secret_key: str = _env_first(
        "SUPABASE_SECRET_DEFAULT_KEY", "SUPABASE_SERVICE_ROLE_KEY"
    )

    # CORS
    cors_origins: list[str] = ["http://localhost:8081", "http://localhost:19006"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
