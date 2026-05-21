from __future__ import annotations

import os
import uuid
import logging
from typing import Optional
import datetime

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.twitter")


@register_provider
class TwitterProvider(OAuthProvider):
    """Twitter (X) OAuth 2.0 provider with PKCE."""
    platform_name = "twitter"

    def get_login_url(self) -> str | dict:
        client_id = os.environ.get("TWITTER_CLIENT_ID")
        if not client_id:
            return {"error": "not_configured", "message": "Twitter API keys not set"}
        from platform_clients.twitter import TwitterClient
        url = TwitterClient.get_oauth_authorize_url(client_id, self.redirect_uri, "")
        # Extract the verifier|state from the URL since it contains the PKCE verifier
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        actual_state = params.get("state", [""])[0]
        return {"url": url, "state": actual_state}

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        import httpx
        client_id = os.environ.get("TWITTER_CLIENT_ID")
        client_secret = os.environ.get("TWITTER_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise ValueError("Twitter API not configured")
        from platform_clients.twitter import TwitterClient
        try:
            token_data = TwitterClient.exchange_code_for_token(client_id, client_secret, self.redirect_uri, code, state=state)
        except Exception as e:
            raise ValueError(f"Twitter token exchange failed: {e}") from e
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token")
        client = TwitterClient(access_token, refresh_token)
        try:
            user_info = client.get_user_info()
        except Exception as e:
            raise ValueError(f"Twitter get_user_info failed: {e}") from e
        return OAuthResult(
            platform_user_id=str(user_info["platform_user_id"]),
            platform_username=user_info.get("platform_username", ""),
            display_name=user_info.get("display_name", ""),
            avatar_url=user_info.get("avatar_url"),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data.get("expires_in", 0))).isoformat() if token_data.get("expires_in") else None,
        )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        if not refresh_token:
            return None
        from platform_clients.twitter import TwitterClient
        client = TwitterClient("", refresh_token)
        try:
            new_token = client.refresh_access_token()
            if new_token:
                return OAuthResult(platform_user_id="", access_token=new_token, refresh_token=refresh_token)
        except Exception:
            return None
        return None
