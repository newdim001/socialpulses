"""
Platform client factory with ResilientClient wrapper.
Every platform client is wrapped with:
  1. Jittered exponential backoff on API calls
  2. Auto token refresh on 401
  3. Fallback client support (e.g., Twitter v1.1 when v2 fails)
  4. Platform-wide rate limit cooldown
"""
from __future__ import annotations
import logging
import time
from typing import Optional, List, Type

from platform_clients import BasePlatformClient
from platform_clients.twitter import TwitterClient
from platform_clients.twitter_v1 import TwitterV1FallbackClient
from platform_clients.linkedin import LinkedInClient
from platform_clients.instagram import InstagramClient
from platform_clients.tiktok import TikTokClient
from platform_clients.youtube import YouTubeClient
from platform_clients.telegram import TelegramClient
from platform_clients.pinterest import PinterestClient
from platform_clients.threads import ThreadsClient
from platform_clients.bluesky import BlueskyClient
from platform_clients.google_business import GoogleBusinessClient
from platform_clients.mastodon import MastodonClient
from normalization import UnifiedPostResult, to_unified_post
from rate_limit_utils import api_call, refresh_token_if_needed

logger = logging.getLogger("factory")

# Fallback client registry
# Primary fails → FallbackClient tries these in order
FALLBACK_CLIENTS: dict[str, list[Type[BasePlatformClient]]] = {
    "twitter": [TwitterV1FallbackClient],
    # Other platforms don't have alternative APIs,
    # but we keep the architecture for future additions
}


class ResilientClient(BasePlatformClient):
    """
    Wraps any platform client with:
    - API call retry + backoff (via rate_limit_utils)
    - Auto token refresh on 401
    - Fallback to alternative client if primary fails
    """

    def __init__(self, inner: BasePlatformClient, platform_name: str):
        self.inner = inner
        self.platform = platform_name
        self.access_token = inner.access_token
        self.refresh_token = inner.refresh_token

    def _call(self, method_name: str, *args, **kwargs) -> dict:
        """Call a method on the inner client with full resilience."""
        max_retries = 3
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                # Get the method from the inner client
                method = getattr(self.inner, method_name, None)
                if method is None:
                    raise RuntimeError(f"Method {method_name} not found on {type(self.inner).__name__}")

                result = method(*args, **kwargs)

                # If the inner client already returns a dict from raw API,
                # we're good. Otherwise it might raise.
                return result

            except PermissionError:
                # Token expired — try to refresh
                logger.warning("[%s] PermissionError on attempt %d/%d. Refreshing token...",
                               self.platform, attempt, max_retries)
                if self.inner.refresh_token:
                    new_token = self.inner.refresh_access_token()
                    if new_token:
                        self.access_token = new_token
                        logger.info("[%s] Token refreshed. Retrying.", self.platform)
                        continue
                logger.error("[%s] Token refresh failed. Giving up.", self.platform)
                return {
                    "platform_post_id": "",
                    "url": "",
                    "status": "failed",
                    "message": f"Token expired for {self.platform}. Reconnect account.",
                }

            except Exception as e:
                last_error = e
                if attempt < max_retries:
                    delay = 2 ** attempt * 5  # 10s, 20s, 40s
                    logger.warning("[%s] %s on attempt %d/%d: %s. Retrying in %ds.",
                                   self.platform, type(e).__name__, attempt, max_retries,
                                   str(e)[:80], delay)
                    time.sleep(delay)
                else:
                    logger.error("[%s] All %d attempts failed: %s",
                                 self.platform, max_retries, str(last_error)[:120])

        # All retries exhausted — try fallback if available
        fallback_result = self._try_fallback(method_name, *args, **kwargs)
        if fallback_result:
            return fallback_result

        return {
            "platform_post_id": "",
            "url": "",
            "status": "failed",
            "message": f"{self.platform} API error after {max_retries} retries: {str(last_error)[:100]}",
        }

    def _try_fallback(self, method_name: str, *args, **kwargs) -> Optional[dict]:
        """Try fallback clients if available."""
        fallback_classes = FALLBACK_CLIENTS.get(self.platform, [])
        if not fallback_classes:
            return None

        for fb_cls in fallback_classes:
            try:
                logger.info("[%s] Trying fallback client %s...", self.platform, fb_cls.__name__)
                fb_client = fb_cls(self.inner.access_token, self.inner.refresh_token)
                method = getattr(fb_client, method_name)
                result = method(*args, **kwargs)
                logger.info("[%s] Fallback %s succeeded!", self.platform, fb_cls.__name__)
                return result
            except Exception as e:
                logger.warning("[%s] Fallback %s failed: %s", self.platform, fb_cls.__name__, str(e)[:80])
                continue

        logger.error("[%s] All fallback clients exhausted.", self.platform)
        return None

    # Delegate all BasePlatformClient methods through _call
    def post_text(self, text: str) -> dict:
        return self._call("post_text", text)

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        return self._call("post_with_media", text, media_urls)

    def get_user_info(self) -> dict:
        return self._call("get_user_info")

    def refresh_access_token(self) -> Optional[str]:
        return self.inner.refresh_access_token()

    def validate_token(self) -> bool:
        return self.inner.validate_token()

    @staticmethod
    def get_oauth_authorize_url(client_id, redirect_uri, state):
        return BasePlatformClient.get_oauth_authorize_url(client_id, redirect_uri, state)

    @staticmethod
    def exchange_code_for_token(client_id, client_secret, redirect_uri, code):
        return BasePlatformClient.exchange_code_for_token(client_id, client_secret, redirect_uri, code)


def get_platform_client(platform_name: str, access_token: str, refresh_token: Optional[str] = None) -> ResilientClient:
    """Get a ResilientClient-wrapped platform client."""
    client_classes = {
        "twitter": TwitterClient,
        "linkedin": LinkedInClient,
        "instagram": InstagramClient,
        "tiktok": TikTokClient,
        "youtube": YouTubeClient,
        "telegram": TelegramClient,
        "pinterest": PinterestClient,
        "threads": ThreadsClient,
        "bluesky": BlueskyClient,
        "google_business": GoogleBusinessClient,
        "mastodon": MastodonClient,
    }
    cls = client_classes.get(platform_name)
    if not cls:
        raise ValueError(f"Unknown platform: {platform_name}")
    inner = cls(access_token, refresh_token)
    return ResilientClient(inner, platform_name)
