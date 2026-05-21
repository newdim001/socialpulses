from __future__ import annotations

import os
import uuid
import datetime
import logging
from typing import Optional

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.tiktok")


@register_provider
class TikTokProvider(OAuthProvider):
    """TikTok OAuth 2.0 provider (uses client_key instead of client_id)."""
    platform_name = "tiktok"

    def get_login_url(self) -> str | dict:
        client_key = os.environ.get("TIKTOK_CLIENT_KEY")
        if not client_key:
            return {"error": "not_configured", "message": "TikTok API keys not set"}
        state = str(uuid.uuid4())
        from platform_clients.tiktok import TikTokClient
        url = TikTokClient.get_oauth_authorize_url(client_key, self.redirect_uri, state)
        return {"url": url, "state": state}

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        import httpx
        client_key = os.environ.get("TIKTOK_CLIENT_KEY")
        client_secret = os.environ.get("TIKTOK_CLIENT_SECRET")
        if not client_key or not client_secret:
            raise ValueError("TikTok API not configured")
        from platform_clients.tiktok import TikTokClient
        try:
            token_data = TikTokClient.exchange_code_for_token(client_key, client_secret, self.redirect_uri, code)
        except Exception as e:
            raise ValueError(f"TikTok token exchange failed: {e}") from e
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token")
        client = TikTokClient(access_token, refresh_token)
        try:
            user_info = client.get_user_info()
        except Exception as e:
            raise ValueError(f"TikTok get_user_info failed: {e}") from e
        expires_in = token_data.get("expires_in")
        if expires_in:
            token_expires_at = (datetime.datetime.utcnow() + datetime.timedelta(seconds=int(expires_in))).isoformat()
        else:
            token_expires_at = None
        logger.info(f"TikTok callback: expires_in={expires_in} -> token_expires_at={token_expires_at}")
        return OAuthResult(
            platform_user_id=str(user_info["platform_user_id"]),
            platform_username=user_info.get("platform_username", ""),
            display_name=user_info.get("display_name", ""),
            avatar_url=user_info.get("avatar_url"),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
        )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        if not refresh_token:
            return None
        from platform_clients.tiktok import TikTokClient
        client = TikTokClient("", refresh_token)
        try:
            new_token = client.refresh_access_token()
            if new_token:
                return OAuthResult(platform_user_id="", access_token=new_token, refresh_token=refresh_token)
        except Exception:
            return None
        return None
