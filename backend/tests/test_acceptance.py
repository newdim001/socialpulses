"""
Acceptance Tests — Business Workflows
Test real-world business scenarios end-to-end.
"""
from __future__ import annotations
import pytest


class WorkflowHelpers:
    """Helper methods for workflow tests."""

    ACCEPT_STATUSES = (200, 429)

    @staticmethod
    def create_post(client, headers, content="Test post content", post_type="draft"):
        resp = client.post("/api/posts", json={"content": content, "type": post_type}, headers=headers)
        assert resp.status_code in (200, 429), f"Failed to create post: {resp.status_code}"
        if resp.status_code == 429:
            pytest.skip("Rate limited — cannot complete workflow test")
        return resp.json()["id"]

    @staticmethod
    def create_campaign(client, headers, name="Test Campaign"):
        resp = client.post("/api/campaigns",
                          json={"name": name, "start_date": "2026-06-01",
                                "end_date": "2026-07-01", "description": "Acceptance test"},
                          headers=headers)
        assert resp.status_code in (200, 429), f"Expected 200 or 429, got {resp.status_code}"
        if resp.status_code == 429:
            pytest.skip("Rate limited — cannot complete workflow test")
        return resp.json()["id"]

    @staticmethod
    def create_influencer(client, headers, name="Influencer"):
        resp = client.post("/api/influencers",
                          json={"name": name, "handle": f"@{name.lower()}",
                                "topics": '["tech","social"]'},
                          headers=headers)
        assert resp.status_code in (200, 429), f"Expected 200 or 429, got {resp.status_code}"
        if resp.status_code == 429:
            pytest.skip("Rate limited — cannot complete workflow test")
        return resp.json()["id"]

    @staticmethod
    def create_listening_topic(client, headers, name="Brand Watch"):
        resp = client.post("/api/listening/topics",
                          json={"name": name, "keywords": '["brand","mention"]',
                                "platforms": '["twitter","instagram"]'},
                          headers=headers)
        assert resp.status_code in (200, 429), f"Expected 200 or 429, got {resp.status_code}"
        if resp.status_code == 429:
            pytest.skip("Rate limited — cannot complete workflow test")
        return resp.json()["id"]


class TestPostLifecycle(WorkflowHelpers):
    """
    Acceptance: Post creation → edit → duplicate → publish → archive
    Business Value: Content creators need to draft, refine, duplicate, and publish posts.
    """

    def test_full_post_lifecycle(self, client, auth_headers):
        # 1. Create draft post
        pid = self.create_post(client, auth_headers, "Draft post for approval")

        # 2. Edit the post
        resp = client.put(f"/api/posts/{pid}", json={"content": "Refined draft post"},
                         headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200
        assert resp.json()["content"] == "Refined draft post"

        # 3. Duplicate for variants
        resp = client.post(f"/api/posts/{pid}/duplicate", headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200
        dup_id = resp.json()["id"]

        # 4. Post a first comment
        resp = client.put(f"/api/posts/{pid}/first-comment", json={"comment": "Check out our new post!"},
                         headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200

        # 5. Publish
        resp = client.post(f"/api/posts/{pid}/publish-now", headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200

        # 6. Delete duplicate
        resp = client.delete(f"/api/posts/{dup_id}", headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200

        # 7. Verify post exists
        resp = client.get(f"/api/posts/{pid}", headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200
        assert resp.json()["status"] == "published"

        # Cleanup
        resp = client.delete(f"/api/posts/{pid}", headers=auth_headers)
        if resp.status_code == 429:
            pytest.skip("Rate limited")
        assert resp.status_code == 200


class TestCampaignLifecycle(WorkflowHelpers):
    """
    Acceptance: Campaign creation → phases → status change
    Business Value: Marketing teams plan campaigns, add phases, activate them.
    """

    def test_campaign_with_phases(self, client, auth_headers):
        # 1. Create campaign
        cid = self.create_campaign(client, auth_headers, "Summer Launch 2026")

        # 2. Add phases
        phases = [
            ("Research", 0, "2026-06-01", "2026-06-07"),
            ("Creation", 1, "2026-06-08", "2026-06-21"),
            ("Publishing", 2, "2026-06-22", "2026-06-30"),
        ]
        phase_ids = []
        for name, order, start, end in phases:
            resp = client.post(f"/api/campaigns/{cid}/phases",
                              json={"name": name, "order": order,
                                    "start_date": start, "end_date": end},
                              headers=auth_headers)
            assert resp.status_code == 200
            phase_ids.append(resp.json()["id"])

        # 3. Verify phases are listed
        resp = client.get(f"/api/campaigns/{cid}/phases", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 3

        # 4. Activate campaign
        resp = client.put(f"/api/campaigns/{cid}/status",
                         json={"status": "active"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # 5. Verify campaign details
        resp = client.get(f"/api/campaigns/{cid}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

        # Cleanup
        for phid in phase_ids:
            client.delete(f"/api/campaigns/phases/{phid}", headers=auth_headers)
        client.delete(f"/api/campaigns/{cid}", headers=auth_headers)


class TestInfluencerCampaignLifecycle(WorkflowHelpers):
    """
    Acceptance: Create influencer → create campaign → add member → add content → manage statuses
    Business Value: Brands manage influencer relationships and campaign content.
    """

    def test_influencer_campaign_workflow(self, client, auth_headers):
        # 1. Create influencer
        inf_id = self.create_influencer(client, auth_headers, "Tech Reviewer")

        # 2. Create influencer campaign
        resp = client.post("/api/influencer-campaigns",
                          json={"name": "Product Launch", "goal": "Generate 10 reviews"},
                          headers=auth_headers)
        assert resp.status_code == 200
        ic_id = resp.json()["id"]

        # 3. Add influencer as member
        resp = client.post(f"/api/influencer-campaigns/{ic_id}/members",
                          json={"influencer_id": inf_id},
                          headers=auth_headers)
        assert resp.status_code == 200
        mem_id = resp.json()["id"]

        # 4. Confirm member
        resp = client.put(f"/api/influencer-campaigns/members/{mem_id}/status",
                         json={"status": "confirmed"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # 5. Add content to campaign (must include influencer_id)
        resp = client.post(f"/api/influencer-campaigns/{ic_id}/content",
                          json={"content": "Sponsored review post", "influencer_id": inf_id},
                          headers=auth_headers)
        assert resp.status_code == 200
        cnt_id = resp.json()["id"]

        # 6. Approve content
        resp = client.put(f"/api/influencer-campaigns/content/{cnt_id}/status",
                         json={"status": "approved"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # 7. Get campaign detail
        resp = client.get(f"/api/influencer-campaigns/{ic_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Product Launch"

        # Cleanup
        client.delete(f"/api/influencer-campaigns/content/{cnt_id}", headers=auth_headers)
        client.delete(f"/api/influencer-campaigns/members/{mem_id}", headers=auth_headers)
        client.delete(f"/api/influencer-campaigns/{ic_id}", headers=auth_headers)
        client.delete(f"/api/influencers/{inf_id}", headers=auth_headers)


class TestSocialListeningWorkflow(WorkflowHelpers):
    """
    Acceptance: Create topic → add mentions → view dashboard → delete
    Business Value: Marketing teams monitor brand mentions across platforms.
    """

    def test_listening_workflow(self, client, auth_headers):
        # 1. Create topic
        tid = self.create_listening_topic(client, auth_headers, "Brand Monitoring")

        # 2. Add multiple mentions
        mentions = [
            ("Happy User", "@happy", "Love this brand!", "twitter"),
            ("Critic", "@critic", "Could be better", "instagram"),
            ("Fan", "@fan", "Best product ever!", "twitter"),
        ]
        mention_ids = []
        for name, handle, content, platform in mentions:
            resp = client.post(f"/api/listening/topics/{tid}/mentions",
                              json={"author_name": name, "author_handle": handle,
                                    "content": content, "platform": platform},
                              headers=auth_headers)
            assert resp.status_code == 200
            mention_ids.append(resp.json()["id"])

        # 3. View topic dashboard
        resp = client.get(f"/api/listening/topics/{tid}/dashboard", headers=auth_headers)
        assert resp.status_code == 200

        # 4. View aggregate dashboard
        resp = client.get("/api/listening/dashboard", headers=auth_headers)
        assert resp.status_code == 200

        # Cleanup
        for mid in mention_ids:
            client.delete(f"/api/listening/mentions/{mid}", headers=auth_headers)
        client.delete(f"/api/listening/topics/{tid}", headers=auth_headers)


class TestBotAutomationWorkflow(WorkflowHelpers):
    """
    Acceptance: Create auto-reply rule → test it → check logs
    Business Value: Support teams automate common response patterns.
    """

    def test_bot_rule_workflow(self, client, auth_headers):
        # 1. Create bot rules
        rules = [
            ("Help Response", "keyword", "help", "How can I assist you today?"),
            ("Pricing", "keyword", "price", "Our plans start at $9.99/month"),
            ("Contact", "keyword", "contact", "Please email support@example.com"),
        ]
        rule_ids = []
        for name, trigger_type, trigger_value, reply in rules:
            resp = client.post("/api/bot-rules",
                              json={"name": name, "trigger_type": trigger_type,
                                    "trigger_value": trigger_value, "reply_content": reply},
                              headers=auth_headers)
            assert resp.status_code == 200
            rule_ids.append(resp.json()["id"])

        # 2. Test each rule
        for rid in rule_ids:
            resp = client.post(f"/api/bot-rules/{rid}/test",
                              json={"test_content": "I need help with price and contact info"},
                              headers=auth_headers)
            assert resp.status_code == 200
            assert resp.json()["matches"] is True

        # 3. View activity logs
        resp = client.get("/api/bot-rules/logs", headers=auth_headers)
        assert resp.status_code == 200

        # Cleanup
        for rid in rule_ids:
            client.delete(f"/api/bot-rules/{rid}", headers=auth_headers)


class TestInboxCommunicationWorkflow(WorkflowHelpers):
    """
    Acceptance: Receive message → reply → archive → delete
    Business Value: Social media managers handle customer conversations.
    """

    def test_inbox_workflow(self, client, auth_headers):
        # 1. Create conversation (incoming)
        resp = client.post("/api/inbox/conversations",
                          json={"contact_name": "John Doe", "platform": "twitter",
                                "first_message": "I have a question about your product"},
                          headers=auth_headers)
        assert resp.status_code == 200
        cvid = resp.json()["id"]

        # 2. Reply to conversation
        resp = client.post(f"/api/inbox/conversations/{cvid}/reply",
                          json={"content": "Thanks for reaching out! How can I help?"},
                          headers=auth_headers)
        assert resp.status_code == 200

        # 3. Assign to team member
        resp = client.put(f"/api/inbox/conversations/{cvid}/assign",
                         json={"assigned_to": 1},
                         headers=auth_headers)
        assert resp.status_code == 200

        # 4. Archive the conversation
        resp = client.put(f"/api/inbox/conversations/{cvid}/archive",
                         headers=auth_headers)
        assert resp.status_code == 200

        # 5. Hard-delete (NEWLY FIXED)
        resp = client.delete(f"/api/inbox/conversations/{cvid}", headers=auth_headers)
        assert resp.status_code == 200

        # 6. Verify deleted
        resp = client.get(f"/api/inbox/conversations/{cvid}", headers=auth_headers)
        assert resp.status_code == 404


class TestReportGenerationWorkflow(WorkflowHelpers):
    """
    Acceptance: Create template → generate report → view shared → export CSV
    Business Value: Managers generate and share performance reports with stakeholders.
    """

    def test_report_workflow(self, client, auth_headers):
        # 1. Create report template
        resp = client.post("/api/report-templates",
                          json={"name": "Monthly Performance"},
                          headers=auth_headers)
        assert resp.status_code == 200
        rtid = resp.json()["id"]

        # 2. Generate report from template
        resp = client.post(f"/api/report-templates/{rtid}/generate", headers=auth_headers)
        assert resp.status_code == 200
        token = resp.json()["token"]
        assert token is not None

        # 3. View shared reports
        resp = client.get("/api/reports/shared", headers=auth_headers)
        assert resp.status_code == 200

        # 4. View premium reports
        resp = client.get("/api/reports/premium", headers=auth_headers)
        assert resp.status_code == 200

        # 5. Export as CSV
        resp = client.get("/api/reports/export", headers=auth_headers)
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

        # 6. Summary
        resp = client.get("/api/reports/summary", headers=auth_headers)
        assert resp.status_code == 200

        # Cleanup
        client.delete(f"/api/report-templates/{rtid}", headers=auth_headers)


class TestKanbanWorkflow(WorkflowHelpers):
    """
    Acceptance: Manage tasks via Kanban board
    Business Value: Teams track content creation progress visually.
    """

    def test_kanban_workflow(self, client, auth_headers):
        # 1. Create default columns (To Do, In Progress, Done)
        col_names = ["To Do", "In Progress", "Done"]
        col_ids = []
        for i, name in enumerate(col_names):
            resp = client.post("/api/kanban/columns",
                              json={"name": name, "position": i},
                              headers=auth_headers)
            assert resp.status_code == 200
            col_ids.append(resp.json()["id"])

        # 2. View columns — should have all 3 now
        resp = client.get("/api/kanban/columns", headers=auth_headers)
        assert resp.status_code == 200
        columns = resp.json()
        assert len(columns) >= 3

        # 3. Create cards in different columns
        card_ids = []
        for i, col_id in enumerate(col_ids):
            resp = client.post("/api/kanban/cards",
                              json={"title": f"Task {i+1}", "content": f"Details for task {i+1}",
                                    "column_id": col_id},
                              headers=auth_headers)
            assert resp.status_code == 200
            card_ids.append(resp.json()["id"])

        # 3. Update a card
        resp = client.put(f"/api/kanban/cards/{card_ids[0]}",
                         json={"title": "Updated Task 1"},
                         headers=auth_headers)
        assert resp.status_code == 200

        # Cleanup
        for cid in card_ids:
            client.delete(f"/api/kanban/cards/{cid}", headers=auth_headers)
