from supabase import create_client, Client

from app.core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Service-role / secret-key client (bypasses RLS)."""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_secret_key)
    return _client


def get_supabase_anon() -> Client:
    """Anonymous / publishable-key client (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_publishable_key)
