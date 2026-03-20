from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "FastAPI Supabase Backend"
    debug: bool = False

    # Supabase
    supabase_url: str = "http://localhost:54321"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:8081", "http://localhost:19006"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
