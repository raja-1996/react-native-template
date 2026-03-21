"""
Integration tests for /api/v1/storage endpoints.

Requires a running Supabase instance with an `uploads` storage bucket.

Create the bucket before running:
    - Via Supabase Studio (http://localhost:54323) → Storage → New bucket "uploads"
    - Or via SQL: insert into storage.buckets (id, name) values ('uploads', 'uploads');

Tests are skipped if Supabase is not reachable OR if the bucket is not present.
"""
import io
import uuid
import pytest

from tests.integration.conftest import skip_if_no_supabase, _SUPABASE_AVAILABLE

pytestmark = skip_if_no_supabase


def _bucket_exists() -> bool:
    """Return True if the 'uploads' bucket is accessible."""
    if not _SUPABASE_AVAILABLE:
        return False
    try:
        from app.core.supabase import get_supabase
        buckets = get_supabase().storage.list_buckets()
        return any(getattr(b, "id", None) == "uploads" or (isinstance(b, dict) and b.get("id") == "uploads") for b in buckets)
    except Exception:
        return False


skip_if_no_bucket = pytest.mark.skipif(
    not _bucket_exists(),
    reason="Supabase 'uploads' bucket not found. Create it before running storage tests.",
)


@pytest.fixture
def uploaded_file(integration_client, test_user):
    """Upload a small text file and yield its path. Deleted after the test."""
    resp = integration_client.post(
        "/api/v1/storage/upload",
        files={"file": ("hello.txt", io.BytesIO(b"hello integration"), "text/plain")},
        headers=test_user["auth_headers"],
    )
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    path = resp.json()["path"]
    yield path
    integration_client.delete(
        f"/api/v1/storage/delete/{path}",
        headers=test_user["auth_headers"],
    )


@skip_if_no_bucket
class TestUploadIntegration:
    def test_upload_returns_path_and_url(self, integration_client, test_user):
        resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("test.txt", io.BytesIO(b"test content"), "text/plain")},
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "path" in data
        assert data["path"]
        assert data["url"].startswith("http")
        # Cleanup
        integration_client.delete(
            f"/api/v1/storage/delete/{data['path']}",
            headers=test_user["auth_headers"],
        )

    def test_upload_custom_path(self, integration_client, test_user):
        custom_path = f"{test_user['user_id']}/custom/{uuid.uuid4().hex}.txt"
        resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("custom.txt", io.BytesIO(b"custom"), "text/plain")},
            data={"path": custom_path},
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["path"] == custom_path
        integration_client.delete(
            f"/api/v1/storage/delete/{custom_path}",
            headers=test_user["auth_headers"],
        )

    def test_upload_auto_generates_path_with_user_prefix(self, integration_client, test_user):
        resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("auto.png", io.BytesIO(b"\x89PNG"), "image/png")},
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 200
        path = resp.json()["path"]
        assert path.startswith(test_user["user_id"])
        assert path.endswith(".png")
        integration_client.delete(
            f"/api/v1/storage/delete/{path}",
            headers=test_user["auth_headers"],
        )

    def test_upload_no_extension_uses_bin(self, integration_client, test_user):
        resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("noext", io.BytesIO(b"data"), "application/octet-stream")},
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 200
        path = resp.json()["path"]
        assert path.endswith(".bin")
        integration_client.delete(
            f"/api/v1/storage/delete/{path}",
            headers=test_user["auth_headers"],
        )

    def test_upload_requires_auth(self, integration_client):
        resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        )
        assert resp.status_code == 422


@skip_if_no_bucket
class TestDownloadIntegration:
    def test_download_returns_signed_url(self, integration_client, test_user, uploaded_file):
        resp = integration_client.get(
            f"/api/v1/storage/download/{uploaded_file}",
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["url"].startswith("http")

    def test_download_nonexistent_file(self, integration_client, test_user):
        resp = integration_client.get(
            "/api/v1/storage/download/nonexistent/path/file.txt",
            headers=test_user["auth_headers"],
        )
        assert resp.status_code == 404

    def test_download_requires_auth(self, integration_client, uploaded_file):
        resp = integration_client.get(f"/api/v1/storage/download/{uploaded_file}")
        assert resp.status_code == 422


@skip_if_no_bucket
class TestDeleteFileIntegration:
    def test_delete_file(self, integration_client, test_user):
        # Upload first
        up_resp = integration_client.post(
            "/api/v1/storage/upload",
            files={"file": ("todelete.txt", io.BytesIO(b"bye"), "text/plain")},
            headers=test_user["auth_headers"],
        )
        assert up_resp.status_code == 200
        path = up_resp.json()["path"]

        # Delete
        del_resp = integration_client.delete(
            f"/api/v1/storage/delete/{path}",
            headers=test_user["auth_headers"],
        )
        assert del_resp.status_code == 204

    def test_delete_requires_auth(self, integration_client, uploaded_file):
        resp = integration_client.delete(f"/api/v1/storage/delete/{uploaded_file}")
        assert resp.status_code == 422
