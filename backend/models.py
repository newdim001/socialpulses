from __future__ import annotations
import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, UniqueConstraint, create_engine
)
from sqlalchemy.orm import relationship, backref
from database import Base
import enum


class PostStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"
    cancelled = "cancelled"


class PlatformName(str, enum.Enum):
    twitter = "twitter"
    linkedin = "linkedin"
    instagram = "instagram"
    facebook = "facebook"
    tiktok = "tiktok"
    youtube = "youtube"
    telegram = "telegram"
    pinterest = "pinterest"
    threads = "threads"
    bluesky = "bluesky"
    google_business = "google_business"
    mastodon = "mastodon"
    reddit = "reddit"
    discord = "discord"
    medium = "medium"
    whatsapp = "whatsapp"
    wordpress = "wordpress"
    shopify = "shopify"
    slack = "slack"
    substack = "substack"
    linkedin_page = "linkedin_page"
    mewe = "mewe"
    farcaster = "farcaster"
    dribbble = "dribbble"
    skool = "skool"
    whop = "whop"
    lemmy = "lemmy"
    nostr = "nostr"
    vk = "vk"
    devto = "devto"
    hashnode = "hashnode"


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    company = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    stripe_customer_id = Column(String, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    organization = relationship("Organization", back_populates="workspaces")
    accounts = relationship("SocialAccount", back_populates="client", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="client", cascade="all, delete-orphan")
    media_files = relationship("Media", back_populates="client", cascade="all, delete-orphan")
    subscription = relationship("Subscription", uselist=False, back_populates="client")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    role = Column(String, nullable=False, default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    company = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    client = relationship("Client")


class SocialPlatform(Base):
    __tablename__ = "social_platforms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(SAEnum(PlatformName), nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    auth_url_template = Column(String, nullable=True)
    accounts = relationship("SocialAccount", back_populates="platform")


class SocialAccount(Base):
    __tablename__ = "social_accounts"
    __table_args__ = (UniqueConstraint("client_id", "platform_id", "platform_user_id"),)
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    platform_id = Column(Integer, ForeignKey("social_platforms.id"), nullable=False)
    platform_user_id = Column(String, nullable=False)
    platform_username = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    client = relationship("Client", back_populates="accounts")
    platform = relationship("SocialPlatform", back_populates="accounts")


class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    content = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(SAEnum(PostStatus), nullable=False, default=PostStatus.draft)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    telegram_message_id = Column(Integer, nullable=True)
    first_comment_content = Column(Text, nullable=True)
    utm_template_id = Column(Integer, ForeignKey("utm_templates.id"), nullable=True)
    sentiment = Column(String, nullable=True)
    is_promoted = Column(Boolean, default=False)
    client = relationship("Client", back_populates="posts")
    post_accounts = relationship("PostAccount", back_populates="post", cascade="all, delete-orphan")
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan")
    utm_template = relationship("UtmTemplate")


class PostAccount(Base):
    __tablename__ = "post_accounts"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id"), nullable=False)
    platform_post_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    post = relationship("Post", back_populates="post_accounts")
    social_account = relationship("SocialAccount")


class Media(Base):
    __tablename__ = "media"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("media_folders.id"), nullable=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    alt_text = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    client = relationship("Client", back_populates="media_files")
    folder = relationship("MediaFolder")


class PostMedia(Base):
    __tablename__ = "post_media"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    media_id = Column(Integer, ForeignKey("media.id"), nullable=False)
    position = Column(Integer, default=0)
    post = relationship("Post", back_populates="media")
    media_item = relationship("Media")


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    workspaces = relationship("Client", back_populates="organization")
    members = relationship("OrgMember", back_populates="organization", cascade="all, delete-orphan")


class OrgMember(Base):
    __tablename__ = "org_members"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False, default="member")
    invited_by = Column(Integer, nullable=True)
    invited_at = Column(DateTime, default=datetime.datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    organization = relationship("Organization", back_populates="members")
    user = relationship("User")


class KanbanColumn(Base):
    __tablename__ = "kanban_columns"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    position = Column(Integer, default=0)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    cards = relationship("KanbanCard", back_populates="column", cascade="all, delete-orphan", order_by="KanbanCard.position")


class KanbanCard(Base):
    __tablename__ = "kanban_cards"
    id = Column(Integer, primary_key=True, index=True)
    column_id = Column(Integer, ForeignKey("kanban_columns.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    position = Column(Integer, default=0)
    labels = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    column = relationship("KanbanColumn", back_populates="cards")
    post = relationship("Post")


class InboxConversation(Base):
    __tablename__ = "inbox_conversations"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    platform = Column(String, nullable=False)
    platform_conversation_id = Column(String, nullable=True)
    participant_name = Column(String, nullable=True)
    participant_avatar = Column(String, nullable=True)
    participant_username = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    last_message_preview = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_assigned = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    messages = relationship("InboxMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="InboxMessage.created_at")


class InboxMessage(Base):
    __tablename__ = "inbox_messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("inbox_conversations.id"), nullable=False)
    platform_message_id = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    media_urls = Column(Text, nullable=True)
    direction = Column(String, nullable=False, default="incoming")
    author_name = Column(String, nullable=True)
    author_avatar = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    conversation = relationship("InboxConversation", back_populates="messages")


class MediaFolder(Base):
    __tablename__ = "media_folders"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("media_folders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    children = relationship("MediaFolder", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")


class PostVersion(Base):
    __tablename__ = "post_versions"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    content = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=True)
    account_ids_json = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    post = relationship("Post")


class RecurringSlot(Base):
    __tablename__ = "recurring_slots"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=True)
    day_of_week = Column(Integer, nullable=False)
    time = Column(String, nullable=False)
    content_template = Column(Text, nullable=True)
    platforms = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    auto_publish = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RecurringQueue(Base):
    __tablename__ = "recurring_queues"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("recurring_slots.id"), nullable=True)
    name = Column(String, nullable=True)
    scheduled_date = Column(Date, nullable=True)
    is_processed = Column(Boolean, default=False)
    generated_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class FirstComment(Base):
    __tablename__ = "first_comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    post = relationship("Post", backref=backref("first_comment", uselist=False, cascade="all, delete-orphan"))


class SavedReply(Base):
    __tablename__ = "saved_replies"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    platform = Column(String, nullable=True)
    shortcut = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class PostTemplate(Base):
    __tablename__ = "post_templates"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    platform = Column(String, nullable=True)
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class RssFeed(Base):
    __tablename__ = "rss_feeds"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    last_fetched_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class RssFeedItem(Base):
    __tablename__ = "rss_feed_items"
    id = Column(Integer, primary_key=True, index=True)
    feed_id = Column(Integer, ForeignKey("rss_feeds.id"), nullable=False)
    guid = Column(String, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class HashtagGroup(Base):
    __tablename__ = "hashtag_groups"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    hashtags = Column(Text, nullable=False)
    platform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class LinkPage(Base):
    __tablename__ = "link_pages"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    profile_image = Column(String, nullable=True)
    bg_color = Column(String, nullable=True)
    text_color = Column(String, nullable=True)
    button_style = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    links = relationship("LinkItem", back_populates="page", cascade="all, delete-orphan", order_by="LinkItem.sort_order")


class LinkItem(Base):
    __tablename__ = "link_items"
    id = Column(Integer, primary_key=True, index=True)
    link_page_id = Column(Integer, ForeignKey("link_pages.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    icon_emoji = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    page = relationship("LinkPage", back_populates="links")


class UtmTemplate(Base):
    __tablename__ = "utm_templates"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    source = Column(String, nullable=False, default="socialpulses")
    medium = Column(String, nullable=False)
    campaign = Column(String, nullable=False)
    term = Column(String, nullable=True)
    content = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SpikeAlert(Base):
    __tablename__ = "spike_alerts"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    threshold = Column(Integer, default=10)
    time_window_minutes = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SpikeEvent(Base):
    __tablename__ = "spike_events"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    alert_id = Column(Integer, ForeignKey("spike_alerts.id"), nullable=True)
    platform = Column(String, nullable=False)
    message_count = Column(Integer, nullable=False)
    time_window_start = Column(DateTime, nullable=False)
    time_window_end = Column(DateTime, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_acknowledged = Column(Boolean, default=False)
    alert = relationship("SpikeAlert")


class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="draft")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    phases = relationship("CampaignPhase", back_populates="campaign", cascade="all, delete-orphan", order_by="CampaignPhase.order")
    campaign_posts = relationship("CampaignPost", back_populates="campaign", cascade="all, delete-orphan")


class CampaignPhase(Base):
    __tablename__ = "campaign_phases"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    order = Column(Integer, default=0)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    campaign = relationship("Campaign", back_populates="phases")


class CampaignPost(Base):
    __tablename__ = "campaign_posts"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    phase_id = Column(Integer, ForeignKey("campaign_phases.id"), nullable=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    campaign = relationship("Campaign", back_populates="campaign_posts")


class ListeningTopic(Base):
    __tablename__ = "listening_topics"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    keywords = Column(Text, nullable=False)
    platforms = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ListeningMention(Base):
    __tablename__ = "listening_mentions"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("listening_topics.id"), nullable=False)
    platform = Column(String, nullable=False)
    author_name = Column(String, nullable=True)
    author_handle = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    sentiment = Column(String, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ListeningSnapshot(Base):
    __tablename__ = "listening_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("listening_topics.id"), nullable=False)
    date = Column(Date, nullable=False)
    mention_count = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    sentiment_score = Column(Float, default=0.0)
    top_sources = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Influencer(Base):
    __tablename__ = "influencers"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    handle = Column(String, nullable=True)
    platform_id = Column(Integer, ForeignKey("social_platforms.id"), nullable=True)
    followers = Column(Integer, default=0)
    following = Column(Integer, nullable=True)
    engagement_rate = Column(Float, nullable=True)
    topics = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="discovered")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class InfluencerCampaign(Base):
    __tablename__ = "influencer_campaigns"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    goal = Column(Text, nullable=True)
    budget = Column(Float, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String, default="draft")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class InfluencerCampaignMember(Base):
    __tablename__ = "influencer_campaign_members"
    __table_args__ = (UniqueConstraint("campaign_id", "influencer_id"),)
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("influencer_campaigns.id"), nullable=False)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    payment = Column(Float, nullable=True)
    terms = Column(Text, nullable=True)
    status = Column(String, default="invited")


class InfluencerContent(Base):
    __tablename__ = "influencer_contents"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("influencer_campaigns.id"), nullable=False)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    content = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    status = Column(String, default="proposed")
    notes = Column(Text, nullable=True)
    payment = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class BotRule(Base):
    __tablename__ = "bot_rules"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    trigger_type = Column(String, default="keyword")
    trigger_value = Column(String, nullable=True)
    match_type = Column(String, default="contains")
    platform = Column(String, nullable=True)
    reply_content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class BotLog(Base):
    __tablename__ = "bot_logs"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("bot_rules.id"), nullable=True)
    conversation_id = Column(Integer, ForeignKey("inbox_conversations.id"), nullable=True)
    matched_content = Column(Text, nullable=True)
    replied_content = Column(Text, nullable=True)
    platform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TrendingTopic(Base):
    __tablename__ = "trending_topics"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    platform = Column(String, nullable=True)
    keyword = Column(String, nullable=False)
    source = Column(String, nullable=False, default="ai")
    frequency = Column(Integer, default=0)
    last_seen = Column(DateTime, nullable=True)
    first_detected = Column(DateTime, default=datetime.datetime.utcnow)
    is_acknowledged = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AutoReplyRule(Base):
    __tablename__ = "auto_reply_rules"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    trigger_keywords = Column(Text, nullable=True)
    match_type = Column(String, default="contains")
    platform = Column(String, nullable=True)
    use_ai = Column(Boolean, default=True)
    ai_tone = Column(String, default="professional")
    static_reply = Column(Text, nullable=True)
    auto_send = Column(Boolean, default=False)
    reply_strategy = Column(String, default="suggest")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AutoReplyLog(Base):
    __tablename__ = "auto_reply_logs"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("auto_reply_rules.id"), nullable=True)
    conversation_id = Column(String, nullable=True)
    original_message = Column(Text, nullable=True)
    ai_reply = Column(Text, nullable=True)
    sentiment = Column(String, nullable=True)
    was_sent = Column(Boolean, default=False)
    was_approved = Column(Boolean, nullable=True)
    strategy_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PostTag(Base):
    __tablename__ = "post_tags"
    __table_args__ = (UniqueConstraint("client_id", "name"),)
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366f1")


class PostTagAssignment(Base):
    __tablename__ = "post_tag_assignments"
    __table_args__ = (UniqueConstraint("post_id", "tag_id"),)
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("post_tags.id"), nullable=False)


class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    config = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=True)
    name = Column(String, nullable=False)
    data = Column(Text, nullable=True)
    token = Column(String, unique=True, nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    type = Column(String, nullable=False, default="info")
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String, nullable=True)
    link_label = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ApprovalComment(Base):
    __tablename__ = "approval_comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("approval_comments.id"), nullable=True)
    decision = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    post = relationship("Post")
    user = relationship("User")
    replies = relationship("ApprovalComment", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan")


class PlatformCredential(Base):
    __tablename__ = "platform_credentials"
    __table_args__ = (UniqueConstraint("platform"),)
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, nullable=False, unique=True)
    client_id = Column(String, nullable=True)
    client_secret = Column(String, nullable=True)
    extra_config = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class OAuthCredential(Base):
    __tablename__ = "oauth_credentials"
    __table_args__ = (UniqueConstraint("platform"),)
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, nullable=False, unique=True)
    client_id = Column(String, nullable=True)
    client_secret = Column(String, nullable=True)
    extra_config = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    key_hash = Column(String(64), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    name = Column(String(100), nullable=False, default="Default")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


class WebhookEventType(str, enum.Enum):
    post_created = "post.created"
    post_scheduled = "post.scheduled"
    post_published = "post.published"
    post_failed = "post.failed"
    post_approved = "post.approved"


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String(100), nullable=False, default="Default")
    url = Column(String(1024), nullable=False)
    secret = Column(String(64), nullable=True)
    event_types = Column(String(512), nullable=False, default="*")
    is_active = Column(Boolean, default=True)
    retry_count = Column(Integer, default=3)
    timeout_seconds = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    client = relationship("Client", backref="webhook_subscriptions")


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("webhook_subscriptions.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    subscription = relationship("WebhookSubscription", backref="deliveries")


class SubscriptionTier(str, enum.Enum):
    free = "free"
    starter = "starter"
    professional = "professional"
    business = "business"
    enterprise = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    incomplete = "incomplete"
    trialing = "trialing"
    unpaid = "unpaid"


PLANS = {
    "free": {"name": "Free", "price": 0, "stripe_price_id": None, "max_accounts": 5, "max_users": 1, "features": ["Schedule posts", "Basic calendar view", "5 social accounts"]},
    "starter": {"name": "Starter", "price": 19, "stripe_price_id": "price_1TM85CFk5pZpCvTlyoGcJ2pO", "max_accounts": 15, "max_users": 1, "features": ["Schedule posts", "Calendar view", "AI content generator", "15 social accounts", "5 platforms"]},
    "professional": {"name": "Professional", "price": 49, "stripe_price_id": "price_1TM85DFk5pZpCvTlIIv7Wnvo", "max_accounts": 25, "max_users": 3, "features": ["Everything in Starter", "AI content generator", "Advanced analytics", "All platforms", "Priority support"]},
    "business": {"name": "Business", "price": 99, "stripe_price_id": "price_1TM85EFk5pZpCvTlMCVYqI1E", "max_accounts": 50, "max_users": 10, "features": ["Everything in Professional", "Team collaboration", "Custom workflows", "API access", "Dedicated support"]},
    "enterprise": {"name": "Enterprise", "price": 199, "stripe_price_id": "price_1TM85FFk5pZpCvTlePKPO7rZ", "max_accounts": 999, "max_users": 999, "features": ["Everything in Business", "Unlimited users", "Custom integrations", "SLA guarantee", "Dedicated account manager"]}
}


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, unique=True)
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_price_id = Column(String, nullable=True)
    tier = Column(SAEnum(SubscriptionTier), nullable=False, default=SubscriptionTier.free)
    status = Column(SAEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.active)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    client = relationship("Client", back_populates="subscription")

class AffiliateCode(Base):
    __tablename__ = "affiliate_codes"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    code = Column(String, unique=True, nullable=False)
    commission_percent = Column(Float, default=30.0)
    total_earned = Column(Float, default=0.0)
    total_referrals = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AffiliateCommission(Base):
    __tablename__ = "affiliate_commissions"
    id = Column(Integer, primary_key=True, index=True)
    affiliate_code_id = Column(Integer, ForeignKey("affiliate_codes.id"), nullable=False)
    referred_client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    amount = Column(Float, default=0.0)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class VerificationNote(Base):
    __tablename__ = "verification_notes"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    token = Column(String, nullable=False, unique=True, index=True)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    client = relationship("Client")


class CountryPricing(Base):
    __tablename__ = "country_pricing"
    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), nullable=False)
    country_name = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    stripe_price_id = Column(String, nullable=True)
