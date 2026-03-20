"""Integration tests for the storage endpoints against a real Supabase instance."""

import pytest
from tests.integration.conftest import requires_infra, requires_rooms_table


pytestmark = [requires_infra, requires_rooms_table]


class TestStorageLifecycle:
    """End-to-end test for upload → get URL → delete of a chat image."""

    def test_full_image_lifecycle(self, http_client, api_url, auth_headers):
        # ---- UPLOAD ----
        file_content = b"\x89PNG\r\n\x1a\n"  # minimal PNG header
        resp = http_client.post(
            f"{api_url}/storage/upload",
            files={"file": ("test-image.png", file_content, "image/png")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        upload_data = resp.json()
        assert "path" in upload_data
        assert "url" in upload_data
        file_path = upload_data["path"]

        # ---- GET URL ----
        resp = http_client.get(
            f"{api_url}/storage/url/{file_path}", headers=auth_headers
        )
        assert resp.status_code == 200
        assert "url" in resp.json()

        # ---- DELETE ----
        resp = http_client.delete(
            f"{api_url}/storage/delete/{file_path}", headers=auth_headers
        )
        assert resp.status_code == 204


class TestStorageEdgeCases:
    def test_upload_non_image_returns_400(self, http_client, api_url, auth_headers):
        resp = http_client.post(
            f"{api_url}/storage/upload",
            files={"file": ("test.txt", b"text content", "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_storage_requires_authentication(self, http_client, api_url):
        resp = http_client.post(
            f"{api_url}/storage/upload",
            files={"file": ("t.png", b"x", "image/png")},
        )
        assert resp.status_code == 401

    def test_delete_other_user_file_returns_403(self, http_client, api_url, auth_headers):
        resp = http_client.delete(
            f"{api_url}/storage/delete/other-user-id/image.png",
            headers=auth_headers,
        )
        assert resp.status_code == 403
