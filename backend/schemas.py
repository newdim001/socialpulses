from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ── Auth ──

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    username: str
    role: str
    client_id: Optional[int] = None
    client_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Client ──

class ClientCreate(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    username: str
    password: str


class ClientOut(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Social Accounts ──

class SocialAccountOut(BaseModel):
    id: int
    platform_id: int
    platform_name: str
    platform_display: str
    platform_icon: Optional[str]
    platform_user_id: str
    platform_username: Optional[str]
    display_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SocialPlatformOut(BaseModel):
    id: int
    name: str
    display_name: str
    icon: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# ── Posts ──

class PostCreate(BaseModel):
    content: str = Field(default="", max_length=5000)
    scheduled_at: Optional[str] = None  # ISO datetime string or null for draft
    account_ids: List[int] = Field(default_factory=list)
    platforms: Optional[List[str]] = None
    media_ids: List[int] = Field(default_factory=list)


class PostUpdate(BaseModel):
    content: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    account_ids: Optional[List[int]] = None


class PostAccountOut(BaseModel):
    id: int
    social_account_id: int
    platform_name: str
    platform_username: Optional[str]
    status: str
    platform_post_id: Optional[str]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class PostMediaOut(BaseModel):
    id: int
    media_id: int
    filename: str
    original_filename: Optional[str]
    mime_type: Optional[str]
    url: str
    position: int

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    client_id: int
    content: Optional[str]
    scheduled_at: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    telegram_message_id: Optional[int]
    post_accounts: List[PostAccountOut] = Field(default_factory=list)
    media: List[PostMediaOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ── Media ──

class MediaUploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: Optional[str]
    mime_type: Optional[str]
    alt_text: Optional[str] = None
    folder_id: Optional[int] = None
    file_size: Optional[int]
    width: Optional[int]
    height: Optional[int]
    url: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ──

class DashboardStats(BaseModel):
    total_scheduled: int
    total_published: int
    total_failed: int
    total_drafts: int
    total_accounts: int
    upcoming_posts: List[PostOut] = Field(default_factory=list)


# ── Calendar ──

class CalendarDay(BaseModel):
    date: str  # YYYY-MM-DD
    posts: List[PostOut] = Field(default_factory=list)


class CalendarResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDay] = Field(default_factory=list)


# ── Telegram ──

class TelegramWebhook(BaseModel):
    message: Optional[dict] = None
    callback_query: Optional[dict] = None


# ── Organization / Multi-tenant ──

class OrganizationCreate(BaseModel):
    name: str
    slug: Optional[str] = None

class OrganizationOut(BaseModel):
    id: int
    name: str
    slug: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class OrgMemberOut(BaseModel):
    id: int
    org_id: int
    user_id: int
    username: str
    role: str
    invited_at: datetime
    accepted_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Kanban / Idea Board ──

class KanbanColumnCreate(BaseModel):
    name: str
    position: Optional[int] = None
    color: Optional[str] = None

class KanbanColumnOut(BaseModel):
    id: int
    name: str
    position: int
    color: Optional[str]
    card_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class KanbanCardCreate(BaseModel):
    title: str = Field(max_length=200)
    content: Optional[str] = Field(default=None, max_length=5000)
    column_id: Optional[int] = None
    position: Optional[int] = None
    labels: Optional[str] = None
    platform: Optional[str] = None
    due_date: Optional[str] = None

class KanbanCardUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    column_id: Optional[int] = None
    position: Optional[int] = None
    labels: Optional[str] = None
    platform: Optional[str] = None
    due_date: Optional[str] = None

class KanbanCardOut(BaseModel):
    id: int
    column_id: int
    title: str
    content: Optional[str]
    position: int
    labels: Optional[str]
    platform: Optional[str]
    due_date: Optional[datetime]
    post_id: Optional[int]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Unified Inbox ──

class InboxConversationOut(BaseModel):
    id: int
    platform: str
    participant_name: Optional[str]
    participant_avatar: Optional[str]
    participant_username: Optional[str]
    subject: Optional[str]
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str]
    is_read: bool
    is_archived: bool
    is_assigned: Optional[int]
    message_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class InboxMessageOut(BaseModel):
    id: int
    conversation_id: int
    content: Optional[str]
    media_urls: Optional[str]
    direction: str
    author_name: Optional[str]
    author_avatar: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class InboxSendBody(BaseModel):
    content: str


# ── Advanced Media ──

class MediaFolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class MediaFolderOut(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    item_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class MediaUpdate(BaseModel):
    folder_id: Optional[int] = None
    alt_text: Optional[str] = None


# ── Version Tracking ──

class PostVersionOut(BaseModel):
    id: int
    post_id: int
    content: Optional[str]
    scheduled_at: Optional[datetime]
    status: Optional[str]
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Recurring Schedules ──

class RecurringSlotCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    day_of_week: int = 0
    time: str = "09:00"
    content_template: Optional[str] = Field(default=None, max_length=5000)
    platforms: Optional[str] = None
    auto_publish: bool = False

class RecurringSlotOut(BaseModel):
    id: int
    name: Optional[str]
    day_of_week: int
    time: str
    content_template: Optional[str]
    platforms: Optional[str]
    is_active: bool
    auto_publish: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Saved Replies ──

class SavedReplyCreate(BaseModel):
    title: str = Field(max_length=200)
    content: str = Field(max_length=5000)
    platform: Optional[str] = None
    shortcut: Optional[str] = None


class SavedReplyOut(BaseModel):
    id: int
    title: str
    content: str
    platform: Optional[str]
    shortcut: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Post Templates ──

class PostTemplateCreate(BaseModel):
    name: str = Field(max_length=200)
    content: str = Field(max_length=10000)
    platform: Optional[str] = None
    category: Optional[str] = None

class PostTemplateOut(BaseModel):
    id: int
    name: str
    content: str
    platform: Optional[str]
    category: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PostTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    platform: Optional[str] = None
    category: Optional[str] = None




# ── RSS Feeds ──

class RssFeedCreate(BaseModel):
    name: str = Field(max_length=200)
    url: str = Field(max_length=2000)
    platform: Optional[str] = None

class RssFeedOut(BaseModel):
    id: int
    name: str
    url: str
    platform: Optional[str]
    last_fetched_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class RssFeedUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None
    is_active: Optional[bool] = None

class RssFeedItemOut(BaseModel):
    id: int
    feed_id: int
    guid: str
    title: Optional[str]
    content: Optional[str]
    url: Optional[str]
    published_at: Optional[datetime]
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Hashtag Groups ──

class HashtagGroupCreate(BaseModel):
    name: str = Field(max_length=200)
    hashtags: str = Field(max_length=2000)
    platform: Optional[str] = None


class HashtagGroupOut(BaseModel):
    id: int
    name: str
    hashtags: str
    platform: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Post Update With Comment ──

class PostUpdateWithComment(BaseModel):
    content: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    account_ids: Optional[List[int]] = None
    first_comment: Optional[str] = None

class SavedReplyUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    platform: Optional[str] = None
    shortcut: Optional[str] = None


class HashtagGroupUpdate(BaseModel):
    name: Optional[str] = None
    hashtags: Optional[str] = None
    platform: Optional[str] = None


class FirstCommentContent(BaseModel):
    content: str = ""


# ── Link in Bio ──

class LinkPageCreate(BaseModel):
    title: str = Field(max_length=200)
    username: str = Field(max_length=200)
    bio: Optional[str] = Field(default=None, max_length=500)
    profile_image: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    button_style: Optional[str] = None


class LinkPageUpdate(BaseModel):
    title: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    button_style: Optional[str] = None
    is_active: Optional[bool] = None


class LinkPageOut(BaseModel):
    id: int
    client_id: int
    title: str
    username: str
    bio: Optional[str]
    profile_image: Optional[str]
    bg_color: Optional[str]
    text_color: Optional[str]
    button_style: Optional[str]
    is_active: bool
    link_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class LinkItemCreate(BaseModel):
    title: str
    url: str
    sort_order: Optional[int] = None
    icon_emoji: Optional[str] = None


class LinkItemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    sort_order: Optional[int] = None
    icon_emoji: Optional[str] = None
    is_active: Optional[bool] = None


class LinkItemOut(BaseModel):
    id: int
    link_page_id: int
    title: str
    url: str
    sort_order: int
    icon_emoji: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LinkReorderBody(BaseModel):
    link_ids: List[int]


# ── URL Tracking (UTM) ──

class UtmTemplateCreate(BaseModel):
    name: str
    source: Optional[str] = "socialpulses"
    medium: str
    campaign: str
    term: Optional[str] = None
    content: Optional[str] = None
    is_default: Optional[bool] = False


class UtmTemplateUpdate(BaseModel):
    name: Optional[str] = None
    source: Optional[str] = None
    medium: Optional[str] = None
    campaign: Optional[str] = None
    term: Optional[str] = None
    content: Optional[str] = None
    is_default: Optional[bool] = None


class UtmTemplateOut(BaseModel):
    id: int
    client_id: int
    name: str
    source: str
    medium: str
    campaign: str
    term: Optional[str]
    content: Optional[str]
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UtmApplyBody(BaseModel):
    post_content: str


class UtmApplyResponse(BaseModel):
    content: str


# ── Message Spike Alerts ──

class SpikeAlertCreate(BaseModel):
    name: str
    platform: Optional[str] = None
    threshold: Optional[int] = 10
    time_window_minutes: Optional[int] = 60


class SpikeAlertUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    threshold: Optional[int] = None
    time_window_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class SpikeAlertOut(BaseModel):
    id: int
    client_id: int
    name: str
    platform: Optional[str]
    threshold: int
    time_window_minutes: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SpikeEventOut(BaseModel):
    id: int
    client_id: int
    alert_id: Optional[int]
    platform: str
    message_count: int
    time_window_start: datetime
    time_window_end: datetime
    detected_at: datetime
    is_acknowledged: bool

    class Config:
        from_attributes = True


class SpikeCheckResponse(BaseModel):
    checked: bool
    events_created: int


# ── Sentiment Analysis ──

class SentimentResult(BaseModel):
    sentiment: str
    score: float
    explanation: str


class SentimentSummary(BaseModel):
    positive: int
    neutral: int
    negative: int
    total: int


# ── Premium Reports ──

class PremiumReport(BaseModel):
    total_posts: int
    total_published: int
    total_failed: int
    total_drafts: int
    total_accounts: int
    by_platform: dict = {}
    success_rate: float = 0.0
    monthly_trend: list = []
    generated_at: str = ""
    top_posts: list = []
    daily_activity: list = []
    platform_growth: dict = {}
    engagement_rate: dict = {}


class ChartData(BaseModel):
    daily_posts: list = []
    weekly_trend: list = []
    platform_pie: list = []
    status_distribution: list = []


# ── Campaign Planner ──

class CampaignCreate(BaseModel):
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    goal: Optional[str] = Field(default=None, max_length=1000)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = "draft"


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = None


class CampaignOut(BaseModel):
    id: int
    client_id: int
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    status: str
    phase_count: int = 0
    post_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignPhaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order: Optional[int] = 0
    color: Optional[str] = None


class CampaignPhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order: Optional[int] = None
    color: Optional[str] = None


class CampaignPostCreate(BaseModel):
    post_id: Optional[int] = None
    phase_id: Optional[int] = None
    notes: Optional[str] = None


class CampaignStatusUpdate(BaseModel):
    status: str


class CampaignPhaseOut(BaseModel):
    id: int
    campaign_id: int
    name: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    order: int
    color: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignPostOut(BaseModel):
    id: int
    campaign_id: int
    phase_id: Optional[int]
    post_id: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Social Listening ──

class ListeningTopicCreate(BaseModel):
    name: str = Field(max_length=200)
    keywords: str = "[]"  # JSON array
    platforms: Optional[str] = None  # JSON array, null=all
    is_active: Optional[bool] = True


class ListeningTopicOut(BaseModel):
    id: int
    client_id: int
    name: str
    keywords: str
    platforms: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListeningMentionCreate(BaseModel):
    platform: str = "manual"
    author_name: Optional[str] = None
    author_handle: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    posted_at: Optional[str] = None


class ListeningMentionOut(BaseModel):
    id: int
    client_id: int
    topic_id: int
    platform: str
    author_name: Optional[str]
    author_handle: Optional[str]
    content: Optional[str]
    url: Optional[str]
    sentiment: Optional[str]
    sentiment_score: Optional[float]
    posted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ListeningSnapshotOut(BaseModel):
    id: int
    client_id: int
    topic_id: int
    date: str
    mention_count: int
    positive_count: int
    neutral_count: int
    negative_count: int
    sentiment_score: float
    top_sources: Optional[str]

    class Config:
        from_attributes = True


class ListeningDashboardOut(BaseModel):
    topic: Optional[dict] = None
    mentions: list = []
    sentiment: dict = {}
    timeline: list = []
    top_sources: list = []
    top_keywords: list = []
    share_of_voice: list = []


# ── Influencer Marketing ──

class InfluencerCreate(BaseModel):
    name: str = Field(max_length=200)
    handle: Optional[str] = Field(default=None, max_length=200)
    platform_id: Optional[int] = None
    followers: Optional[int] = 0
    following: Optional[int] = None
    engagement_rate: Optional[float] = None
    topics: Optional[str] = None  # JSON
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "discovered"


class InfluencerUpdate(BaseModel):
    name: Optional[str] = None
    handle: Optional[str] = None
    platform_id: Optional[int] = None
    followers: Optional[int] = None
    following: Optional[int] = None
    engagement_rate: Optional[float] = None
    topics: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class InfluencerOut(BaseModel):
    id: int
    client_id: int
    name: str
    handle: Optional[str]
    platform_id: Optional[int]
    followers: int
    following: Optional[int]
    engagement_rate: Optional[float]
    topics: Optional[str]
    avatar_url: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    notes: Optional[str]
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    campaign_count: int = 0

    class Config:
        from_attributes = True


class InfluencerCampaignCreate(BaseModel):
    name: str
    goal: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = "draft"
    notes: Optional[str] = None


class InfluencerCampaignUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class InfluencerCampaignOut(BaseModel):
    id: int
    client_id: int
    name: str
    goal: Optional[str]
    budget: Optional[float]
    start_date: Optional[str]
    end_date: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    influencer_count: int = 0
    content_count: int = 0

    class Config:
        from_attributes = True


class InfluencerCampaignMemberCreate(BaseModel):
    influencer_id: int
    payment: Optional[float] = None
    terms: Optional[str] = None


class InfluencerCampaignMemberOut(BaseModel):
    id: int
    campaign_id: int
    influencer_id: int
    influencer_name: str = ""
    influencer_handle: Optional[str] = None
    influencer_avatar: Optional[str] = None
    payment: Optional[float]
    terms: Optional[str]
    status: str

    class Config:
        from_attributes = True


class InfluencerCampaignMemberStatusUpdate(BaseModel):
    status: str  # invited|confirmed|declined|completed


class InfluencerContentCreate(BaseModel):
    influencer_id: int
    post_id: Optional[int] = None
    content: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = "proposed"
    notes: Optional[str] = None
    payment: Optional[float] = None


class InfluencerContentUpdate(BaseModel):
    content: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    payment: Optional[float] = None


class InfluencerContentOut(BaseModel):
    id: int
    campaign_id: int
    influencer_id: Optional[int]
    post_id: Optional[int]
    content: Optional[str]
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    status: str
    notes: Optional[str]
    payment: Optional[float]
    created_at: datetime
    updated_at: datetime
    influencer_name: str = ""
    influencer_handle: Optional[str] = None

    class Config:
        from_attributes = True


class InfluencerContentStatusUpdate(BaseModel):
    status: str  # proposed|approved|revisions|published|rejected


# ── Bot Builder ──

class BotRuleCreate(BaseModel):
    name: str = Field(max_length=200)
    trigger_type: Optional[str] = "keyword"
    trigger_value: Optional[str] = Field(default=None, max_length=500)
    match_type: Optional[str] = "contains"
    platform: Optional[str] = None
    reply_content: str = Field(default="", max_length=5000)
    is_active: Optional[bool] = True


class BotRuleUpdate(BaseModel):
    name: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_value: Optional[str] = None
    match_type: Optional[str] = None
    platform: Optional[str] = None
    reply_content: Optional[str] = None
    is_active: Optional[bool] = None


class BotRuleOut(BaseModel):
    id: int
    client_id: int
    name: str
    trigger_type: str
    trigger_value: Optional[str]
    match_type: str
    platform: Optional[str]
    reply_content: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BotRuleTest(BaseModel):
    test_content: str


class BotRuleTestResult(BaseModel):
    matches: bool
    reply: Optional[str] = None
    matched_on: Optional[str] = None


class BotLogOut(BaseModel):
    id: int
    client_id: int
    rule_id: Optional[int]
    conversation_id: Optional[int]
    matched_content: Optional[str]
    replied_content: Optional[str]
    platform: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Premium Analytics Extended ──

class PostTagCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"


class PostTagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class PostTagOut(BaseModel):
    id: int
    client_id: int
    name: str
    color: str

    class Config:
        from_attributes = True


class PostTagAssign(BaseModel):
    tag_ids: list = []


class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    config: Optional[str] = None  # JSON
    is_default: Optional[bool] = False


class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[str] = None
    is_default: Optional[bool] = None


class ReportTemplateOut(BaseModel):
    id: int
    client_id: int
    name: str
    description: Optional[str]
    config: Optional[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportSnapshotOut(BaseModel):
    id: int
    client_id: int
    template_id: Optional[int]
    name: str
    data: Optional[str]
    token: str
    generated_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class PremiumAnalyticsDashboard(BaseModel):
    total_posts: int = 0
    published: int = 0
    failed: int = 0
    success_rate: float = 0.0
    by_tag: list = []
    competitive: dict = {}
    timeline: list = []



# ── Notifications ──

class NotificationOut(BaseModel):
    id: int
    client_id: int
    type: str
    title: str
    message: Optional[str]
    link: Optional[str]
    link_label: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    total: int = 0
    unread: int = 0

# ── Approval Comments ──

class ApprovalCommentCreate(BaseModel):
    content: str = Field(max_length=2000)
    parent_id: Optional[int] = None
    decision: Optional[str] = None

class ApprovalCommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    content: str
    parent_id: Optional[int]
    decision: Optional[str]
    created_at: datetime
    replies: list = []

    class Config:
        from_attributes = True


# ── Platform Credentials ──

class PlatformCredentialOut(BaseModel):
    platform: str
    client_id_set: bool = False
    client_secret_set: bool = False
    extra_config: Optional[str] = None

class PlatformCredentialUpdate(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    extra_config: Optional[str] = None

class PlatformCredentialsBulkUpdate(BaseModel):
    credentials: dict[str, PlatformCredentialUpdate]

# ── Stripe / Billing ──

class PlanOut(BaseModel):
    tier: str
    name: str
    price: int
    stripe_price_id: Optional[str]
    max_accounts: int
    max_users: int
    features: list[str]

class CheckoutSessionRequest(BaseModel):
    price_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CheckoutSessionResponse(BaseModel):
    url: str
    session_id: str



# ── Trending Topics ──

class TrendingTopicCreate(BaseModel):
    keyword: str = Field(max_length=200)
    platform: Optional[str] = None
    source: Optional[str] = "ai"
    frequency: Optional[int] = 0

class TrendingTopicUpdate(BaseModel):
    keyword: Optional[str] = None
    platform: Optional[str] = None
    frequency: Optional[int] = None
    is_acknowledged: Optional[bool] = None
    is_active: Optional[bool] = None

class TrendingTopicOut(BaseModel):
    id: int
    client_id: int
    platform: Optional[str] = None
    keyword: str
    source: str
    frequency: int
    last_seen: Optional[datetime] = None
    first_detected: Optional[datetime] = None
    is_acknowledged: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Auto-Reply Agent ──

class AutoReplyRuleCreate(BaseModel):
    name: str = Field(max_length=200)
    trigger_keywords: Optional[str] = Field(default=None, max_length=1000)
    match_type: Optional[str] = "contains"
    platform: Optional[str] = None
    use_ai: Optional[bool] = True
    ai_tone: Optional[str] = "professional"
    static_reply: Optional[str] = Field(default=None, max_length=5000)
    auto_send: Optional[bool] = False
    reply_strategy: Optional[str] = "suggest"
    is_active: Optional[bool] = True

class AutoReplyRuleUpdate(BaseModel):
    name: Optional[str] = None
    trigger_keywords: Optional[str] = None
    match_type: Optional[str] = None
    platform: Optional[str] = None
    use_ai: Optional[bool] = None
    ai_tone: Optional[str] = None
    static_reply: Optional[str] = None
    auto_send: Optional[bool] = None
    reply_strategy: Optional[str] = None
    is_active: Optional[bool] = None

class AutoReplyRuleOut(BaseModel):
    id: int
    client_id: int
    name: str
    trigger_keywords: Optional[str] = None
    match_type: str
    platform: Optional[str] = None
    use_ai: bool
    ai_tone: str
    static_reply: Optional[str] = None
    auto_send: bool
    reply_strategy: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AutoReplyRuleTest(BaseModel):
    test_content: str = Field(max_length=5000)

class AutoReplyRuleTestResult(BaseModel):
    matches: bool
    reply: Optional[str] = None
    matched_on: Optional[str] = None
    sentiment: Optional[str] = None

class AutoReplyLogOut(BaseModel):
    id: int
    client_id: int
    rule_id: Optional[int] = None
    conversation_id: Optional[str] = None
    original_message: Optional[str] = None
    ai_reply: Optional[str] = None
    sentiment: Optional[str] = None
    was_sent: bool
    was_approved: Optional[bool] = None
    strategy_used: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AutoReplyProcessRequest(BaseModel):
    conversation_id: str
    content: str = Field(max_length=10000)
    platform: Optional[str] = None

class SubscriptionOut(BaseModel):
    tier: str
    status: str
    stripe_price_id: Optional[str]
    current_period_end: Optional[datetime]
    trial_end: Optional[datetime]
    plan_name: str
    max_accounts: int
    max_users: int

    class Config:
        from_attributes = True

class BillingPortalResponse(BaseModel):
    url: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    company: Optional[str] = None
    plan_tier: Optional[str] = "free"
    referral_code: Optional[str] = None

# ── User Profile ──

class ProfileResponse(BaseModel):
    username: str
    email: str = ""
    role: str = ""
    email_verified: bool = False
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    onboarding_completed: bool = False
    model_config = {"from_attributes": True}

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


# ════════════════════════════════════════════
# AFFILIATE PROGRAM
# ════════════════════════════════════════════

class AffiliateCodeCreate(BaseModel):
    pass  # just a POST to generate

class AffiliateCodeOut(BaseModel):
    id: int
    code: str
    commission_percent: float
    total_earned: float
    total_referrals: int
    created_at: datetime
    referral_link: Optional[str] = None
    model_config = {"from_attributes": True}

class AffiliateCommissionOut(BaseModel):
    id: int
    referred_client_name: Optional[str] = None
    amount: float
    original_amount: float
    status: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created_at: datetime
    paid_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class AffiliateStats(BaseModel):
    code: str
    commission_percent: float
    total_earned: float
    total_referrals: int
    pending_commissions: float = 0
    paid_commissions: float = 0
    commission_history: List[AffiliateCommissionOut] = []

# ════════════════════════════════════════════
# COUNTRY-BASED PRICING
# ════════════════════════════════════════════

class CountryPricingOut(BaseModel):
    country_code: str
    country_name: str
    tier: str
    price: float
    currency: str
    stripe_price_id: Optional[str] = None
    model_config = {"from_attributes": True}

class CountryPricingCreate(BaseModel):
    country_code: str
    country_name: str
    tier: str
    price: float
    currency: str = "USD"
    stripe_price_id: Optional[str] = None

class CountryPricingUpdate(BaseModel):
    country_name: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    stripe_price_id: Optional[str] = None

class StripeConfigResponse(BaseModel):
    publishable_key: str
    plans: list
    payment_links: dict
    country_pricing: Optional[dict] = None
