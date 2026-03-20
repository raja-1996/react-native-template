"""Integration tests for the notes CRUD endpoints against a real Supabase instance."""

import pytest
from tests.integration.conftest import requires_infra


pytestmark = requires_infra


class TestNotesLifecycle:
    """End-to-end test for the full notes CRUD lifecycle."""

    def test_full_crud_lifecycle(self, http_client, api_url, auth_headers):
        # ---- CREATE ----
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "Integration Note", "content": "Created by integration test"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        note = resp.json()
        note_id = note["id"]
        assert note["title"] == "Integration Note"
        assert note["content"] == "Created by integration test"
        assert note["attachment_path"] is None
        assert "created_at" in note
        assert "updated_at" in note

        # ---- READ (single) ----
        resp = http_client.get(f"{api_url}/notes/{note_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == note_id
        assert resp.json()["title"] == "Integration Note"

        # ---- LIST ----
        resp = http_client.get(f"{api_url}/notes", headers=auth_headers)
        assert resp.status_code == 200
        notes = resp.json()
        assert any(n["id"] == note_id for n in notes)

        # ---- UPDATE ----
        resp = http_client.patch(
            f"{api_url}/notes/{note_id}",
            json={"title": "Updated Title", "content": "Updated content"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["title"] == "Updated Title"
        assert updated["content"] == "Updated content"

        # ---- PARTIAL UPDATE (title only) ----
        resp = http_client.patch(
            f"{api_url}/notes/{note_id}",
            json={"title": "Partial Update"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Partial Update"
        assert resp.json()["content"] == "Updated content"  # unchanged

        # ---- DELETE ----
        resp = http_client.delete(f"{api_url}/notes/{note_id}", headers=auth_headers)
        assert resp.status_code == 204

        # ---- VERIFY DELETED ----
        resp = http_client.get(f"{api_url}/notes/{note_id}", headers=auth_headers)
        assert resp.status_code in (404, 406)  # 406 from Supabase single() with no rows


class TestNotesEdgeCases:
    def test_create_note_with_default_content(self, http_client, api_url, auth_headers):
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "No Content"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        note = resp.json()
        assert note["content"] == ""
        # Cleanup
        http_client.delete(f"{api_url}/notes/{note['id']}", headers=auth_headers)

    def test_update_with_empty_body_returns_400(self, http_client, api_url, auth_headers):
        # Create a note first
        resp = http_client.post(
            f"{api_url}/notes",
            json={"title": "To Update"},
            headers=auth_headers,
        )
        note_id = resp.json()["id"]

        resp = http_client.patch(
            f"{api_url}/notes/{note_id}",
            json={},
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "No fields to update"

        # Cleanup
        http_client.delete(f"{api_url}/notes/{note_id}", headers=auth_headers)

    def test_get_nonexistent_note_returns_error(self, http_client, api_url, auth_headers):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = http_client.get(f"{api_url}/notes/{fake_id}", headers=auth_headers)
        assert resp.status_code in (404, 406)

    def test_delete_nonexistent_note_returns_error(self, http_client, api_url, auth_headers):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = http_client.delete(f"{api_url}/notes/{fake_id}", headers=auth_headers)
        assert resp.status_code in (404, 406)

    def test_notes_require_authentication(self, http_client, api_url):
        resp = http_client.get(f"{api_url}/notes")
        assert resp.status_code == 401

    def test_create_note_missing_title_returns_422(self, http_client, api_url, auth_headers):
        resp = http_client.post(
            f"{api_url}/notes",
            json={"content": "no title"},
            headers=auth_headers,
        )
        assert resp.status_code == 422
