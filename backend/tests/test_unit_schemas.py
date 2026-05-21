"""
Unit Tests — Pydantic Schemas
Test request/response validation for all schemas.
"""
from __future__ import annotations
import pytest
import sys, os
from datetime import datetime, date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from schemas import (
    PostCreate, PostOut, PostUpdate, PostTagCreate, PostTagOut,
    CampaignCreate, CampaignOut, CampaignPhaseCreate, CampaignPhaseOut,
    InboxConversationOut, InboxMessageOut, InboxSendBody,
    InfluencerCreate, InfluencerOut, InfluencerCampaignCreate, InfluencerCampaignOut,
    InfluencerContentCreate, InfluencerContentOut, InfluencerCampaignMemberCreate,
    BotRuleCreate, BotRuleOut, BotRuleTest, BotRuleUpdate,
    KanbanColumnCreate, KanbanCardCreate, KanbanCardOut,
    SavedReplyCreate, SavedReplyUpdate,
    ListeningTopicCreate, ListeningTopicOut, ListeningMentionCreate,
    LinkPageCreate, LinkPageOut, LinkItemCreate,
    UtmTemplateCreate, UtmTemplateOut, UtmApplyBody,
    SpikeAlertCreate, SpikeAlertOut,
    ReportTemplateCreate, ReportTemplateOut,
    LoginRequest, ChangePasswordRequest, PlatformCredentialUpdate,
    ApprovalCommentCreate, ApprovalCommentOut,
    FirstCommentContent,
    CampaignStatusUpdate,
    RecurringSlotCreate, RecurringSlotOut,
    HashtagGroupCreate,
    SocialPlatformOut, SocialAccountOut,
    CalendarDay, CalendarResponse,
    DashboardStats,
    NotificationOut, NotificationCount,
    PremiumAnalyticsDashboard, PremiumReport,
    ChartData,
)


class TestPostSchemas:
    """Test Post-related schema validation."""

    def test_post_create_valid(self):
        data = PostCreate(content="Hello World")
        assert data.content == "Hello World"

    def test_post_create_minimal(self):
        data = PostCreate()
        assert data.content == ""

    def test_post_create_with_schedule(self):
        data = PostCreate(content="Scheduled", scheduled_at="2026-06-01T10:00:00")
        assert data.scheduled_at == "2026-06-01T10:00:00"

    def test_post_update(self):
        data = PostUpdate(content="Updated")
        assert data.content == "Updated"

    def test_post_out(self):
        data = PostOut(
            id=1, client_id=1, content="Test", status="draft",
            scheduled_at=None, published_at=None, telegram_message_id=None,
            created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1),
            post_accounts=[], media=[]
        )
        assert data.id == 1
        assert data.status == "draft"

    def test_post_tag_create(self):
        data = PostTagCreate(name="Urgent", color="#ff0000")
        assert data.name == "Urgent"

    def test_post_tag_out(self):
        data = PostTagOut(id=1, client_id=1, name="Urgent", color="#ff0000")
        assert data.name == "Urgent"


class TestCampaignSchemas:
    """Test Campaign-related schemas."""

    def test_campaign_create(self):
        data = CampaignCreate(
            name="Summer Campaign", start_date="2026-06-01", end_date="2026-07-01",
            description="Summer promo"
        )
        assert data.name == "Summer Campaign"

    def test_campaign_create_minimal(self):
        data = CampaignCreate(name="Mini", start_date="2026-06-01", end_date="2026-06-15")
        assert data.name == "Mini"

    def test_campaign_phase_create(self):
        data = CampaignPhaseCreate(
            name="Phase 1", order=0,
            start_date="2026-06-01", end_date="2026-06-15"
        )
        assert data.order == 0

    def test_campaign_status_update(self):
        data = CampaignStatusUpdate(status="active")
        assert data.status == "active"

    def test_campaign_out(self):
        data = CampaignOut(
            id=1, client_id=1, name="Test", status="draft",
            start_date=date(2026, 1, 1), end_date=date(2026, 2, 1),
            created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1)
        )
        assert data.name == "Test"


class TestInboxSchemas:
    """Test Inbox-related schemas."""

    def test_inbox_send_body(self):
        data = InboxSendBody(content="Reply message")
        assert data.content == "Reply message"
    def test_inbox_conversation_out(self):
        data = InboxConversationOut(
            id=1, platform="twitter",
            participant_name=None, participant_avatar=None,
            participant_username=None, subject=None,
            last_message_at=None, last_message_preview=None,
            is_assigned=None,
            is_read=False, is_archived=False,
            created_at=datetime(2026, 1, 1)
        )
        assert data.platform == "twitter"

    def test_inbox_message_out(self):
        data = InboxMessageOut(
            id=1, conversation_id=1, content="Hello", direction="incoming",
            media_urls=None, author_name=None, author_avatar=None,
            is_read=False, created_at=datetime(2026, 1, 1)
        )
        assert data.direction == "incoming"


class TestInfluencerSchemas:
    """Test Influencer-related schemas."""

    def test_influencer_create(self):
        data = InfluencerCreate(name="John Doe", handle="@johndoe", topics='["tech"]')
        assert data.name == "John Doe"

    def test_influencer_create_minimal(self):
        data = InfluencerCreate(name="Jane", handle="@jane")
        assert data.name == "Jane"

    def test_influencer_content_create_requires_influencer_id(self):
        """influencer_id is required — should fail without it."""
        with pytest.raises(ValueError):
            InfluencerContentCreate(content="Test")

    def test_influencer_content_create_valid(self):
        data = InfluencerContentCreate(influencer_id=1, content="Sponsored post")
        assert data.influencer_id == 1
        assert data.content == "Sponsored post"

    def test_influencer_campaign_create(self):
        data = InfluencerCampaignCreate(name="Campaign 1", goal="Awareness")
        assert data.goal == "Awareness"

    def test_influencer_campaign_member_create(self):
        data = InfluencerCampaignMemberCreate(influencer_id=1)
        assert data.influencer_id == 1


class TestBotRuleSchemas:
    """Test Bot Rule schemas."""

    def test_bot_rule_create(self):
        data = BotRuleCreate(
            name="Help", trigger_type="keyword", trigger_value="help",
            reply_content="How can I help?"
        )
        assert data.trigger_type == "keyword"

    def test_bot_rule_test(self):
        data = BotRuleTest(test_content="I need help!")
        assert data.test_content == "I need help!"

    def test_bot_rule_update(self):
        data = BotRuleUpdate(reply_content="Updated reply")
        assert data.reply_content == "Updated reply"


class TestKanbanSchemas:
    """Test Kanban-related schemas."""

    def test_kanban_column_create(self):
        data = KanbanColumnCreate(name="To Do")
        assert data.name == "To Do"

    def test_kanban_card_create(self):
        data = KanbanCardCreate(title="Task", content="Details")
        assert data.title == "Task"

    def test_kanban_card_out(self):
        data = KanbanCardOut(
            id=1, column_id=1, title="Card", position=0,
            content=None, labels=None, platform=None,
            due_date=None, post_id=None, created_by=None,
            created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1)
        )
        assert data.title == "Card"


class TestListeningSchemas:
    """Test Listening-related schemas."""

    def test_listening_topic_create(self):
        data = ListeningTopicCreate(
            name="Brand", keywords='["brand","mention"]', platforms='["twitter"]'
        )
        assert data.name == "Brand"
        assert isinstance(data.keywords, str)

    def test_listening_mention_create(self):
        data = ListeningMentionCreate(
            author_name="User", author_handle="@user", content="Mention",
            platform="twitter"
        )
        assert data.platform == "twitter"


class TestLinkBioSchemas:
    """Test Link-in-Bio schemas."""

    def test_link_page_create(self):
        data = LinkPageCreate(title="My Links", username="myuser", bio="Hello")
        assert data.username == "myuser"

    def test_link_item_create(self):
        data = LinkItemCreate(title="Site", url="https://example.com")
        assert data.url == "https://example.com"


class TestUtmSchemas:
    """Test UTM schemas."""

    def test_utm_template_create(self):
        data = UtmTemplateCreate(
            name="Twitter", source="twitter", medium="social", campaign="spring"
        )
        assert data.source == "twitter"

    def test_utm_apply_body(self):
        data = UtmApplyBody(post_content="Visit https://example.com")
        assert "example.com" in data.post_content


class TestOtherSchemas:
    """Test remaining schemas."""

    def test_spike_alert_create(self):
        data = SpikeAlertCreate(name="High Traffic", threshold=100, time_window_minutes=60)
        assert data.threshold == 100

    def test_saved_reply_create(self):
        data = SavedReplyCreate(title="Greeting", shortcut="/hi", content="Hello!")
        assert data.title == "Greeting"

    def test_report_template_create(self):
        data = ReportTemplateCreate(name="Weekly")
        assert data.name == "Weekly"

    def test_login_request(self):
        data = LoginRequest(username="admin", password="admin123")
        assert data.username == "admin"

    def test_change_password_request(self):
        data = ChangePasswordRequest(current_password="old", new_password="new")
        assert data.new_password == "new"

    def test_platform_credential_update(self):
        data = PlatformCredentialUpdate(client_id="abc123", client_secret="secret456")
        assert data.client_id == "abc123"

    def test_approval_comment_create(self):
        """ApprovalCommentCreate expects 'content' not 'comment'."""
        data = ApprovalCommentCreate(content="Looks good!")
        assert data.content == "Looks good!"

    def test_first_comment_content(self):
        """FirstCommentContent uses 'content' field."""
        data = FirstCommentContent(content="First!")
        assert data.content == "First!"

    def test_recurring_slot_create(self):
        data = RecurringSlotCreate(day_of_week=1, time="10:00", platform="twitter")
        assert data.day_of_week == 1

    def test_hashtag_group_create(self):
        data = HashtagGroupCreate(name="Test", hashtags='["#test"]')
        assert data.name == "Test"

    def test_social_platform_out(self):
        data = SocialPlatformOut(id=1, name="twitter", display_name="Twitter",
                                 icon=None, is_active=True)
        assert data.name == "twitter"
