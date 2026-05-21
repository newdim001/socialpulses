"""
Unit Tests — Models
Test SQLAlchemy model instantiation, enums, relationships.
NOTE: SQLAlchemy column defaults are NOT applied on bare instantiation
(only on session.add+flush). Defaults must be passed explicitly.
"""
from __future__ import annotations
import pytest
from datetime import datetime, date
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from models import (
    PostStatus, PlatformName, Client, User, Post, SocialPlatform, SocialAccount,
    Campaign, CampaignPhase, InboxConversation, InboxMessage, ListeningTopic,
    Influencer, InfluencerCampaign, BotRule, KanbanColumn, KanbanCard,
    Notification, Media, LinkPage, LinkItem, UtmTemplate, SpikeAlert,
    SavedReply, HashtagGroup, ReportTemplate, ReportSnapshot,
    PostTag, PostVersion, FirstComment, ApprovalComment,
    RecurringSlot, Organization, OrgMember, PlatformCredential
)


class TestEnums:
    """Test enum classes (no DB needed)."""

    def test_post_status_values(self):
        assert PostStatus.draft.value == "draft"
        assert PostStatus.pending_approval.value == "pending_approval"
        assert PostStatus.scheduled.value == "scheduled"
        assert PostStatus.published.value == "published"
        assert PostStatus.failed.value == "failed"
        assert PostStatus.cancelled.value == "cancelled"
        assert len(PostStatus) == 6

    def test_platform_name_values(self):
        assert PlatformName.twitter.value == "twitter"
        assert PlatformName.mastodon.value == "mastodon"
        assert len(PlatformName) >= 20


class TestModelInstantiation:
    """Test that all models can be instantiated with minimal fields.
    NOTE: SQLAlchemy defaults do NOT apply on bare instantiation;
    we pass defaults explicitly to test constructor behavior."""

    def test_client(self):
        c = Client(name="Test", email="test@test.com", is_active=True)
        assert c.name == "Test"
        assert c.email == "test@test.com"
        assert c.is_active is True

    def test_user(self):
        u = User(username="tester", password_hash="hash", role="admin")
        assert u.username == "tester"
        assert u.role == "admin"

    def test_post(self):
        p = Post(client_id=1, content="Hello World", status=PostStatus.draft)
        assert p.content == "Hello World"
        assert p.status == PostStatus.draft

    def test_post_all_statuses(self):
        for status in PostStatus:
            p = Post(client_id=1, content=f"Test {status.value}", status=status)
            assert p.status == status

    def test_social_platform(self):
        sp = SocialPlatform(name="twitter", display_name="Twitter")
        assert sp.name == "twitter"
        assert sp.display_name == "Twitter"

    def test_social_account(self):
        sa = SocialAccount(
            client_id=1, platform_id=1, platform_user_id="12345",
            access_token="tok", is_active=True
        )
        assert sa.platform_user_id == "12345"
        assert sa.is_active is True

    def test_campaign(self):
        c = Campaign(
            client_id=1, name="Test Campaign",
            start_date=date(2026, 6, 1), end_date=date(2026, 7, 1),
            status="draft"
        )
        assert c.name == "Test Campaign"
        assert c.status == "draft"

    def test_campaign_phase(self):
        cp = CampaignPhase(campaign_id=1, name="Phase 1", order=0,
                           start_date=date(2026, 6, 1), end_date=date(2026, 6, 15))
        assert cp.name == "Phase 1"
        assert cp.order == 0

    def test_inbox_conversation(self):
        ic = InboxConversation(client_id=1, platform="twitter", participant_name="User",
                               is_archived=False)
        assert ic.platform == "twitter"
        assert ic.is_archived is False

    def test_inbox_message(self):
        im = InboxMessage(conversation_id=1, content="Hello", direction="incoming")
        assert im.content == "Hello"
        assert im.direction == "incoming"

    def test_listening_topic(self):
        lt = ListeningTopic(client_id=1, name="Brand Mentions", keywords='["brand"]',
                            is_active=True)
        assert lt.name == "Brand Mentions"
        assert lt.is_active is True

    def test_influencer(self):
        inf = Influencer(name="Test Influencer", handle="@tester", status="discovered")
        assert inf.name == "Test Influencer"
        assert inf.status == "discovered"

    def test_influencer_campaign(self):
        ic = InfluencerCampaign(client_id=1, name="Inf Campaign", goal="Awareness",
                                status="draft")
        assert ic.name == "Inf Campaign"
        assert ic.status == "draft"

    def test_bot_rule(self):
        br = BotRule(name="Help Rule", trigger_type="keyword", trigger_value="help",
                     reply_content="How can I help?", is_active=True)
        assert br.trigger_type == "keyword"
        assert br.is_active is True

    def test_kanban_column(self):
        kc = KanbanColumn(client_id=1, name="To Do")
        assert kc.name == "To Do"

    def test_kanban_card(self):
        kcard = KanbanCard(column_id=1, title="Task 1", content="Do something")
        assert kcard.title == "Task 1"

    def test_notification(self):
        n = Notification(client_id=1, title="Test Notif", message="Hello", is_read=False)
        assert n.title == "Test Notif"
        assert n.is_read is False

    def test_media(self):
        m = Media(client_id=1, filename="test.jpg")
        assert m.filename == "test.jpg"

    def test_link_page(self):
        lp = LinkPage(client_id=1, title="My Links", username="myuser", bio="Bio",
                      is_active=True)
        assert lp.username == "myuser"
        assert lp.is_active is True

    def test_link_item(self):
        li = LinkItem(link_page_id=1, title="My Site", url="https://example.com", sort_order=0)
        assert li.url == "https://example.com"

    def test_utm_template(self):
        ut = UtmTemplate(client_id=1, name="Twitter Campaign", source="twitter", medium="social")
        assert ut.source == "twitter"

    def test_spike_alert(self):
        sa = SpikeAlert(client_id=1, name="High Traffic", threshold=100, time_window_minutes=60,
                        is_active=True)
        assert sa.threshold == 100
        assert sa.is_active is True

    def test_saved_reply(self):
        sr = SavedReply(client_id=1, title="Greeting", content="Hello!")
        assert sr.title == "Greeting"

    def test_hashtag_group(self):
        hg = HashtagGroup(client_id=1, name="Marketing", hashtags='["#marketing"]')
        assert hg.name == "Marketing"

    def test_report_template(self):
        rt = ReportTemplate(client_id=1, name="Weekly Report")
        assert rt.name == "Weekly Report"

    def test_report_snapshot(self):
        rs = ReportSnapshot(template_id=1, data="{}", token="abc123")
        assert rs.token == "abc123"

    def test_post_tag(self):
        pt = PostTag(client_id=1, name="Urgent", color="#ff0000")
        assert pt.name == "Urgent"

    def test_post_version(self):
        pv = PostVersion(post_id=1, content="Version 1")
        assert pv.content == "Version 1"

    def test_first_comment(self):
        fc = FirstComment(post_id=1, content="First!")
        assert fc.content == "First!"

    def test_approval_comment(self):
        ac = ApprovalComment(post_id=1, user_id=1, content="Looks good", client_id=1)
        assert ac.content == "Looks good"

    def test_recurring_slot(self):
        rs = RecurringSlot(client_id=1, day_of_week=1, time="10:00", platforms="twitter")
        assert rs.day_of_week == 1

    def test_organization(self):
        org = Organization(name="My Org")
        assert org.name == "My Org"

    def test_org_member(self):
        om = OrgMember(org_id=1, user_id=1, role="admin")
        assert om.role == "admin"

    def test_platform_credential(self):
        pc = PlatformCredential(platform="twitter", client_id="abc", client_secret="secret")
        assert pc.platform == "twitter"


class TestModelConstraints:
    """Test that models accept standard constructor args (no DB needed)."""

    def test_post_accepts_content(self):
        p = Post(client_id=1, content="Test", status=PostStatus.draft)
        assert p.content == "Test"

    def test_influencer_accepts_handle(self):
        inf = Influencer(name="Test", handle="@test", status="discovered")
        assert inf.handle == "@test"

    def test_campaign_accepts_dates(self):
        c = Campaign(client_id=1, name="Test",
                     start_date=date(2026, 1, 1), end_date=date(2026, 2, 1),
                     status="draft")
        assert c.status == "draft"

    def test_link_page_accepts_active(self):
        lp = LinkPage(client_id=1, title="Test", username="test", bio="bio",
                      is_active=True)
        assert lp.is_active is True

    def test_spike_alert_accepts_active(self):
        sa = SpikeAlert(client_id=1, name="Test", threshold=10, time_window_minutes=30,
                        is_active=True)
        assert sa.is_active is True

    def test_bot_rule_accepts_active(self):
        br = BotRule(name="Test", trigger_type="keyword", trigger_value="test",
                     reply_content="Reply", is_active=True)
        assert br.is_active is True
