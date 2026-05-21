"""
System Tests — Full Application
Test the app as a whole: all endpoints working together, data flow,
error handling, edge cases, and concurrent operations.
"""
from __future__ import annotations
import pytest


class TestHealth:
    """System health checks."""

    def test_health_endpoint(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_settings(self, client, auth_headers):
        resp = client.get("/api/settings", headers=auth_headers)
        assert resp.status_code == 200

    def test_publisher_status(self, client, auth_headers):
        resp = client.get("/api/publisher/status", headers=auth_headers)
        assert resp.status_code == 200


class TestSavedReplies:
    """Saved replies CRUD system test."""

    def test_crud_lifecycle(self, client, auth_headers):
        # Create
        resp = client.post("/api/saved-replies",
                          json={"title": "Greeting", "shortcut": "/hi", "content": "Hello!"},
                          headers=auth_headers)
        assert resp.status_code == 200
        sid = resp.json()["id"]

        # Read
        resp = client.get("/api/saved-replies", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        # Update
        resp = client.put(f"/api/saved-replies/{sid}",
                         json={"content": "Updated greeting"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Delete
        resp = client.delete(f"/api/saved-replies/{sid}", headers=auth_headers)
        assert resp.status_code == 200


class TestLinkBio:
    """Link-in-Bio CRUD system test."""

    def test_crud_lifecycle(self, client, auth_headers):
        # Create page
        resp = client.post("/api/link-bio",
                          json={"title": "My Links", "username": "myuser", "bio": "Hello"},
                          headers=auth_headers)
        assert resp.status_code == 200
        pid = resp.json()["id"]

        # Create link
        resp = client.post(f"/api/link-bio/{pid}/links",
                          json={"title": "My Site", "url": "https://example.com"},
                          headers=auth_headers)
        assert resp.status_code == 200
        lid = resp.json()["id"]

        # Get links
        resp = client.get(f"/api/link-bio/{pid}/links", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        # Delete link
        resp = client.delete(f"/api/link-bio/links/{lid}", headers=auth_headers)
        assert resp.status_code == 200

        # Delete page
        resp = client.delete(f"/api/link-bio/{pid}", headers=auth_headers)
        assert resp.status_code == 200


class TestUtmTemplates:
    """UTM template system test."""

    def test_crud_lifecycle(self, client, auth_headers):
        # Create
        resp = client.post("/api/utm-templates",
                          json={"name": "Twitter", "source": "twitter", "medium": "social",
                                "campaign": "spring"},
                          headers=auth_headers)
        assert resp.status_code == 200
        uid = resp.json()["id"]

        # Apply to content
        resp = client.post(f"/api/utm-templates/{uid}/apply",
                          json={"post_content": "Visit https://example.com"},
                          headers=auth_headers)
        assert resp.status_code == 200
        assert "utm_source" in resp.json()["content"]

        # Set as default
        resp = client.put(f"/api/utm-templates/{uid}",
                         json={"name": "Twitter", "is_default": True},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Get default
        resp = client.get("/api/utm-templates/default", headers=auth_headers)
        assert resp.status_code == 200

        # Delete
        resp = client.delete(f"/api/utm-templates/{uid}", headers=auth_headers)
        assert resp.status_code == 200


class TestSpikeAlerts:
    """Spike alerts system test."""

    def test_crud_lifecycle(self, client, auth_headers):
        # Create
        resp = client.post("/api/spike-alerts",
                          json={"name": "High Traffic", "threshold": 100, "time_window_minutes": 60},
                          headers=auth_headers)
        assert resp.status_code == 200
        sid = resp.json()["id"]

        # Check spikes
        resp = client.post("/api/spike-alerts/check", headers=auth_headers)
        assert resp.status_code == 200

        # Update
        resp = client.put(f"/api/spike-alerts/{sid}",
                         json={"threshold": 200},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Delete
        resp = client.delete(f"/api/spike-alerts/{sid}", headers=auth_headers)
        assert resp.status_code == 200


class TestCampaigns:
    """Campaigns system test."""

    def test_crud_with_phases(self, client, auth_headers):
        # Create campaign
        resp = client.post("/api/campaigns",
                          json={"name": "Summer Campaign", "start_date": "2026-06-01",
                                "end_date": "2026-07-01", "description": "Summer promo"},
                          headers=auth_headers)
        assert resp.status_code == 200
        cid = resp.json()["id"]

        # Create phase
        resp = client.post(f"/api/campaigns/{cid}/phases",
                          json={"name": "Phase 1", "order": 0,
                                "start_date": "2026-06-01", "end_date": "2026-06-15"},
                          headers=auth_headers)
        assert resp.status_code == 200
        phid = resp.json()["id"]

        # List phases
        resp = client.get(f"/api/campaigns/{cid}/phases", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        # Change status
        resp = client.put(f"/api/campaigns/{cid}/status",
                         json={"status": "active"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Delete phase
        resp = client.delete(f"/api/campaigns/phases/{phid}", headers=auth_headers)
        assert resp.status_code == 200

        # Delete campaign
        resp = client.delete(f"/api/campaigns/{cid}", headers=auth_headers)
        assert resp.status_code == 200


class TestBotRules:
    """Bot rules system test."""

    def test_crud_with_test_and_logs(self, client, auth_headers):
        # Create
        resp = client.post("/api/bot-rules",
                          json={"name": "Help", "trigger_type": "keyword",
                                "trigger_value": "help", "reply_content": "How can I help?"},
                          headers=auth_headers)
        assert resp.status_code == 200
        bid = resp.json()["id"]

        # Test
        resp = client.post(f"/api/bot-rules/{bid}/test",
                          json={"test_content": "I need help!"},
                          headers=auth_headers)
        assert resp.status_code == 200

        # Logs
        resp = client.get("/api/bot-rules/logs", headers=auth_headers)
        assert resp.status_code == 200

        # Update
        resp = client.put(f"/api/bot-rules/{bid}",
                         json={"reply_content": "Updated reply"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Delete
        resp = client.delete(f"/api/bot-rules/{bid}", headers=auth_headers)
        assert resp.status_code == 200


class TestListening:
    """Social listening system test."""

    def test_topic_with_mentions(self, client, auth_headers):
        # Create topic
        resp = client.post("/api/listening/topics",
                          json={"name": "Brand Watch", "keywords": '["brand","mention"]',
                                "platforms": '["twitter","instagram"]'},
                          headers=auth_headers)
        assert resp.status_code == 200
        tid = resp.json()["id"]

        # Dashboard
        resp = client.get(f"/api/listening/topics/{tid}/dashboard", headers=auth_headers)
        assert resp.status_code == 200

        # Create mention
        resp = client.post(f"/api/listening/topics/{tid}/mentions",
                          json={"author_name": "User", "author_handle": "@user",
                                "content": "Brand mention!", "platform": "twitter"},
                          headers=auth_headers)
        assert resp.status_code == 200
        mid = resp.json()["id"]

        # Delete mention
        resp = client.delete(f"/api/listening/mentions/{mid}", headers=auth_headers)
        assert resp.status_code == 200

        # Aggregate dashboard
        resp = client.get("/api/listening/dashboard", headers=auth_headers)
        assert resp.status_code == 200

        # Delete topic
        resp = client.delete(f"/api/listening/topics/{tid}", headers=auth_headers)
        assert resp.status_code == 200


class TestReports:
    """Reports system test."""

    def test_premium_reports(self, client, auth_headers):
        resp = client.get("/api/reports/premium", headers=auth_headers)
        assert resp.status_code == 200

    def test_chart_data(self, client, auth_headers):
        resp = client.get("/api/reports/premium/chart-data", headers=auth_headers)
        assert resp.status_code == 200

    def test_summary(self, client, auth_headers):
        resp = client.get("/api/reports/summary", headers=auth_headers)
        assert resp.status_code == 200

    def test_export_csv(self, client, auth_headers):
        resp = client.get("/api/reports/export", headers=auth_headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

    def test_template_crud_with_generate(self, client, auth_headers):
        # Create template
        resp = client.post("/api/report-templates",
                          json={"name": "Weekly Report"},
                          headers=auth_headers)
        assert resp.status_code == 200
        rtid = resp.json()["id"]

        # Generate
        resp = client.post(f"/api/report-templates/{rtid}/generate", headers=auth_headers)
        assert resp.status_code == 200
        assert "token" in resp.json()

        # Shared reports
        resp = client.get("/api/reports/shared", headers=auth_headers)
        assert resp.status_code == 200

        # Delete template
        resp = client.delete(f"/api/report-templates/{rtid}", headers=auth_headers)
        assert resp.status_code == 200


class TestOrganizations:
    """Organization system test."""

    def test_list_orgs(self, client, auth_headers):
        resp = client.get("/api/orgs", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
