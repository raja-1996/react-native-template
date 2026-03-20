from supabase import create_client, Client
from app.core.config import settings


def get_supabase() -> Client:
    """Service role client for admin operations."""
    return create_client(settings.supabase_url, settings.supabase_secret_default_key)


def get_user_supabase(access_token: str) -> Client:
    """User-scoped client that inherits RLS context from JWT."""
    from supabase.lib.client_options import ClientOptions
    client = create_client(
        settings.supabase_url,
        settings.supabase_publishable_default_key,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {access_token}"}
        ),
    )
    return client
