"""Integration tests for the rooms & messages CRUD endpoints against a real Supabase instance."""

import pytest
from tests.integration.conftest import requires_infra, requires_rooms_table


pytestmark = [requires_infra, requires_rooms_table]


class TestRoomsLifecycle:
    """End-to-end test for the full rooms & messages CRUD lifecycle."""

    def test_full_crud_lifecycle(self, http_client, api_url, auth_headers):
        # ---- CREATE ROOM ----
        resp = http_client.post(
            f"{api_url}/rooms",
            json={"name": "Integration Room"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        room = resp.json()
        room_id = room["id"]
        assert room["name"] == "Integration Room"
        assert "created_at" in room

        # ---- LIST ROOMS ----
        resp = http_client.get(f"{api_url}/rooms", headers=auth_headers)
        assert resp.status_code == 200
        rooms = resp.json()
        assert any(r["id"] == room_id for r in rooms)

        # ---- GET ROOM ----
        resp = http_client.get(f"{api_url}/rooms/{room_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Integration Room"

        # ---- UPDATE ROOM ----
        resp = http_client.patch(
            f"{api_url}/rooms/{room_id}",
            json={"name": "Updated Room"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Room"

        # ---- CREATE MESSAGE ----
        resp = http_client.post(
            f"{api_url}/rooms/{room_id}/messages",
            json={"content": "Hello from integration test"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        msg = resp.json()
        msg_id = msg["id"]
        assert msg["content"] == "Hello from integration test"

        # ---- LIST MESSAGES ----
        resp = http_client.get(
            f"{api_url}/rooms/{room_id}/messages", headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert any(m["id"] == msg_id for m in data["data"])

        # ---- UPDATE MESSAGE ----
        resp = http_client.patch(
            f"{api_url}/rooms/{room_id}/messages/{msg_id}",
            json={"content": "Edited message"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["content"] == "Edited message"

        # ---- DELETE MESSAGE ----
        resp = http_client.delete(
            f"{api_url}/rooms/{room_id}/messages/{msg_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 204

        # ---- DELETE ROOM ----
        resp = http_client.delete(f"{api_url}/rooms/{room_id}", headers=auth_headers)
        assert resp.status_code == 204


class TestRoomsEdgeCases:
    def test_create_room_missing_name_returns_422(self, http_client, api_url, auth_headers):
        resp = http_client.post(
            f"{api_url}/rooms",
            json={},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_update_room_empty_body_returns_400(self, http_client, api_url, auth_headers):
        resp = http_client.post(
            f"{api_url}/rooms",
            json={"name": "To Update"},
            headers=auth_headers,
        )
        room_id = resp.json()["id"]

        resp = http_client.patch(
            f"{api_url}/rooms/{room_id}",
            json={},
            headers=auth_headers,
        )
        assert resp.status_code == 400

        http_client.delete(f"{api_url}/rooms/{room_id}", headers=auth_headers)

    def test_rooms_require_authentication(self, http_client, api_url):
        resp = http_client.get(f"{api_url}/rooms")
        assert resp.status_code == 401
