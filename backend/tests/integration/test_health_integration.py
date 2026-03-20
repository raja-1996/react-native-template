"""Integration tests for the health and root endpoints."""

import pytest
from tests.integration.conftest import requires_backend


pytestmark = requires_backend


class TestHealthIntegration:
    def test_health_returns_ok(self, http_client, backend_url):
        resp = http_client.get(f"{backend_url}/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_openapi_schema_accessible(self, http_client, backend_url):
        resp = http_client.get(f"{backend_url}/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert "paths" in schema
        assert "/api/v1/auth/signup" in schema["paths"]
        assert "/api/v1/notes" in schema["paths"]
