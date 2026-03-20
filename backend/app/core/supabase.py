from supabase import create_client, Client

from app.core.config import settings

_service_client: Client | None = None


def get_supabase() -> Client:
    """Service-role client (bypasses RLS). Use only for admin operations."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(settings.supabase_url, settings.supabase_secret_key)
    return _service_client


def get_user_supabase(access_token: str) -> Client:
    """Create a Supabase client authenticated as the user (respects RLS)."""
    client = create_client(settings.supabase_url, settings.supabase_publishable_key)
    client.auth.set_session(access_token, "")
    return client
