"""Integration tests for the storage endpoints against a real Supabase instance."""

import pytest
from tests.integration.conftest import requires_infra, requires_notes_table


pytestmark = [requires_infra, requires_notes_table]


class TestStorageLifecycle:
    """End-to-end test for upload → download → delete of an attachment."""

    def test_full_attachment_lifecycle(self, http_client, api_url, auth_headers):
        # Create a note to attach a file to
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "Storage Test Note", "content": "For attachment testing"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        note_id = resp.json()["id"]

        try:
            # ---- UPLOAD ----
            file_content = b"Hello, this is a test file."
            resp = http_client.post(
                f"{api_url}/storage/upload/{note_id}",
                files={"file": ("test-file.txt", file_content, "text/plain")},
                headers=auth_headers,
            )
            assert resp.status_code == 200
            upload_data = resp.json()
            assert "path" in upload_data
            assert "url" in upload_data
            assert note_id in upload_data["path"]
            assert "test-file.txt" in upload_data["path"]

            # Verify note was updated with attachment_path
            resp = http_client.get(
                f"{api_url}/notes/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 200
            assert resp.json()["attachment_path"] == upload_data["path"]

            # ---- DOWNLOAD URL ----
            resp = http_client.get(
                f"{api_url}/storage/download/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 200
            assert "url" in resp.json()
            signed_url = resp.json()["url"]
            assert "token=" in signed_url or "sign" in signed_url.lower()

            # ---- DELETE ATTACHMENT ----
            resp = http_client.delete(
                f"{api_url}/storage/delete/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 204

            # Verify attachment_path cleared on note
            resp = http_client.get(
                f"{api_url}/notes/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 200
            assert resp.json()["attachment_path"] is None

        finally:
            # Cleanup: delete the test note
            http_client.delete(f"{api_url}/notes/{note_id}", headers=auth_headers)


class TestStorageEdgeCases:
    def test_upload_to_nonexistent_note(self, http_client, api_url, auth_headers):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = http_client.post(
            f"{api_url}/storage/upload/{fake_id}",
            files={"file": ("test.txt", b"content", "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code in (404, 406)

    def test_download_note_without_attachment(self, http_client, api_url, auth_headers):
        # Create a note with no attachment
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "No Attachment"},
            headers=auth_headers,
        )
        note_id = resp.json()["id"]

        try:
            resp = http_client.get(
                f"{api_url}/storage/download/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 404
            assert "No attachment found" in resp.json()["detail"]
        finally:
            http_client.delete(f"{api_url}/notes/{note_id}", headers=auth_headers)

    def test_delete_attachment_from_note_without_one(
        self, http_client, api_url, auth_headers
    ):
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "No Attachment Delete"},
            headers=auth_headers,
        )
        note_id = resp.json()["id"]

        try:
            resp = http_client.delete(
                f"{api_url}/storage/delete/{note_id}", headers=auth_headers
            )
            assert resp.status_code == 404
        finally:
            http_client.delete(f"{api_url}/notes/{note_id}", headers=auth_headers)

    def test_storage_requires_authentication(self, http_client, api_url):
        resp = http_client.post(
            f"{api_url}/storage/upload/some-note-id",
            files={"file": ("t.txt", b"x", "text/plain")},
        )
        assert resp.status_code == 401

        resp = http_client.get(f"{api_url}/storage/download/some-note-id")
        assert resp.status_code == 401

        resp = http_client.delete(f"{api_url}/storage/delete/some-note-id")
        assert resp.status_code == 401
