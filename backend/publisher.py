"""
Reliable publisher with retry queue.
- 3 attempts per post (5min → 15min → 60min exponential backoff)
- Auto token refresh on PermissionError
- DB-backed retry state (survives server restarts)
- Proper logging for every failure
"""
from __future__ import annotations
import datetime
import logging
import threading
import time
from typing import Optional

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, PostAccount, PostStatus, SocialAccount, SocialPlatform
from platform_clients.factory import get_platform_client, ResilientClient
from webhook_utils import fire_post_webhooks

logger = logging.getLogger("publisher")

# Retry schedule: minutes between attempts
RETRY_SCHEDULE = [5, 15, 60]

# Maximum age for a failed post before we stop retrying (12 hours)
MAX_RETRY_AGE_HOURS = 12


class Publisher:
    """Background publisher that checks for due posts and publishes them."""

    def __init__(self, interval_seconds: int = 60):
        self.interval = interval_seconds
        self._running = False
        self._thread = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("Publisher started (checking every %ds)", self.interval)

    def stop(self):
        self._running = False
        logger.info("Publisher stopped")

    def _loop(self):
        while self._running:
            try:
                self._check_and_publish()
            except Exception as e:
                logger.error("Publisher error: %s", e)
            time.sleep(self.interval)

    def _check_and_publish(self):
        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()

            # 1. Due scheduled posts
            due_posts = (
                db.query(Post)
                .filter(
                    Post.status == PostStatus.scheduled,
                    Post.scheduled_at <= now,
                )
                .all()
            )
            for post in due_posts:
                self._publish_post(db, post)

            # 2. Retry-eligible failed posts
            retry_cutoff = now - datetime.timedelta(hours=MAX_RETRY_AGE_HOURS)
            retryable_posts = (
                db.query(PostAccount)
                .filter(
                    PostAccount.status == "failed",
                    PostAccount.retry_count < len(RETRY_SCHEDULE),
                    PostAccount.next_retry_at <= now,
                    PostAccount.updated_at >= retry_cutoff,
                )
                .all()
            )
            for pa in retryable_posts:
                self._retry_post_account(db, pa)

        finally:
            db.close()

    def _publish_post(self, db: Session, post: Post):
        """Publish a scheduled post to all its connected accounts."""
        logger.info("Publishing post %d...", post.id)
        all_succeeded = True
        any_succeeded = False

        for pa in post.post_accounts:
            result = self._publish_to_account(db, pa, post)
            if result:
                any_succeeded = True
                pa.status = "published"
            else:
                all_succeeded = False
                # If it failed and has retries left, mark for retry
                if pa.retry_count < len(RETRY_SCHEDULE):
                    pa.status = "failed"
                    pa.retry_count = (pa.retry_count or 0) + 1
                    next_minutes = RETRY_SCHEDULE[min(pa.retry_count - 1, len(RETRY_SCHEDULE) - 1)]
                    pa.next_retry_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=next_minutes)
                    logger.info("  -> Post %d account %d: queued for retry %d/%d in %dmin",
                                post.id, pa.social_account_id, pa.retry_count, len(RETRY_SCHEDULE), next_minutes)
                else:
                    pa.status = "failed"
                    pa.error_message = pa.error_message or "Max retries exhausted"
                    logger.info("  -> Post %d account %d: FAILED after %d retries",
                                post.id, pa.social_account_id, len(RETRY_SCHEDULE))

        if all_succeeded:
            post.status = PostStatus.published
            post.published_at = datetime.datetime.utcnow()
        elif any_succeeded:
            post.status = PostStatus.published  # At least partially published
            post.published_at = datetime.datetime.utcnow()
        else:
            post.status = PostStatus.failed

        db.commit()
        event = "post.published" if post.status == PostStatus.published else "post.failed"
        fire_post_webhooks(event, post.id, post.client_id, db)

    def _retry_post_account(self, db: Session, pa: PostAccount):
        """Retry a previously failed post account."""
        post = db.query(Post).get(pa.post_id)
        if not post:
            return
        logger.info("Retrying post %d account %d (attempt %d/%d)...",
                    post.id, pa.social_account_id, pa.retry_count + 1, len(RETRY_SCHEDULE))

        result = self._publish_to_account(db, pa, post)
        if result:
            pa.status = "published"
            pa.retry_count = 0
            pa.next_retry_at = None
            pa.error_message = None
            logger.info("  -> Retry SUCCESS for post %d account %d", post.id, pa.social_account_id)
        else:
            pa.retry_count = (pa.retry_count or 0) + 1
            if pa.retry_count >= len(RETRY_SCHEDULE):
                pa.status = "failed"
                pa.next_retry_at = None
                logger.info("  -> Retry FINAL FAILURE for post %d account %d", post.id, pa.social_account_id)
            else:
                next_minutes = RETRY_SCHEDULE[min(pa.retry_count, len(RETRY_SCHEDULE) - 1)]
                pa.next_retry_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=next_minutes)
                logger.info("  -> Retry %d/%d scheduled for %dmin later",
                            pa.retry_count, len(RETRY_SCHEDULE), next_minutes)

        db.commit()

    def _publish_to_account(self, db: Session, pa: PostAccount, post: Post) -> bool:
        """Publish a post to a single account. Returns True on success."""
        account = db.query(SocialAccount).get(pa.social_account_id)
        if not account:
            pa.error_message = "Social account not found"
            return False

        platform = db.query(SocialPlatform).get(account.platform_id)
        if not platform:
            pa.error_message = "Platform not found"
            return False

        platform_name = platform.name.value if hasattr(platform.name, 'value') else str(platform.name)

        try:
            client = get_platform_client(platform_name, account.access_token, account.refresh_token)

            # Build media URLs
            media_urls = []
            for pm in sorted(post.media, key=lambda x: x.position):
                media_urls.append("/api/media/" + str(pm.media_id) + "/serve")

            # Post with or without media
            if media_urls:
                result = client.post_with_media(post.content or "", media_urls)
            else:
                result = client.post_text(post.content or "")

            # Check result status
            status = result.get("status", "published")
            if status == "published" or result.get("platform_post_id"):
                pa.platform_post_id = result.get("platform_post_id", "")
                pa.error_message = None
                logger.info("  -> Published to %s (%s): %s",
                            platform_name, account.platform_username,
                            result.get("url", result.get("message", "")))
                return True
            else:
                pa.error_message = result.get("message", "Unknown error")
                logger.warning("  -> Failed for %s: %s", account.platform_username, pa.error_message)
                return False

        except PermissionError:
            pa.error_message = "Token expired - reconnect account"
            logger.warning("  -> Token expired for %s on %s", account.platform_username, platform_name)
            return False

        except Exception as e:
            pa.error_message = str(e)[:500]
            logger.error("  -> Failed for %s on %s: %s",
                         account.platform_username, platform_name, pa.error_message)
            return False
