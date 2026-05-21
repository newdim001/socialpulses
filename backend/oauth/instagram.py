from __future__ import annotations

import os
import uuid
import logging
import datetime
from typing import Optional

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.instagram")

AUTH_URL = "https://www.instagram.com/oauth/authorize"
TOKEN_URL = "https://api.instagram.com/oauth/access_token"
IG_GRAPH_URL = "https://graph.instagram.com"
LONG_TOKEN_URL = "https://graph.instagram.com/access_token"
SCOPES = "instagram_business_basic,instagram_business_content_publish"


@register_provider
class InstagramProvider(OAuthProvider):
    """Instagram Business Login OAuth 2.0 provider."""
    platform_name = "instagram"

    def get_login_url(self) -> str | dict:
        client_id = os.environ.get("INSTAGRAM_CLIENT_ID") or os.environ.get("FACEBOOK_CLIENT_ID")
        if not client_id:
            return {"error": "not_configured", "message": "Instagram API keys not set"}
        state = str(uuid.uuid4())
        import urllib.parse
        url = (
            f"{AUTH_URL}?force_reauth=true&"
            f"client_id={urllib.parse.quote(client_id, safe='')}"
            f"&redirect_uri={urllib.parse.quote(self.redirect_uri, safe='')}"
            f"&response_type=code"
            f"&scope={urllib.parse.quote(SCOPES)}"
            f"&state={urllib.parse.quote(state)}"
        )
        return {"url": url, "state": state}

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        logger.info(f"IG auth callback START: code_len={len(code) if code else 0}, state={str(state)[:30] if state else 'None'}")
        import httpx
        client_id = os.environ.get("INSTAGRAM_CLIENT_ID") or os.environ.get("FACEBOOK_CLIENT_ID")
        client_secret = os.environ.get("INSTAGRAM_CLIENT_SECRET") or os.environ.get("FACEBOOK_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise ValueError("Instagram API not configured")
        async with httpx.AsyncClient(timeout=15) as http:
            # Step 1: Exchange code for short-lived access token
            try:
                token_resp = await http.post(TOKEN_URL, data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                })
                token_resp.raise_for_status()
                token_data = token_resp.json()
            except Exception as e:
                raise ValueError(f"Instagram token exchange failed: {e}") from e
            short_token = token_data.get("access_token", "")
            ig_user_id = str(token_data.get("user_id", ""))
            logger.info(f"IG token exchange OK: user_id={ig_user_id}, short_token_len={len(short_token) if short_token else 0}")
            if not short_token:
                raise ValueError("Instagram did not return an access_token")

            # Step 2: Exchange short-lived for long-lived token (60 days)
            try:
                long_resp = await http.get(LONG_TOKEN_URL, params={
                    "grant_type": "ig_exchange_token",
                    "access_token": short_token,
                    "client_secret": client_secret,
                })
                long_resp.raise_for_status()
                long_data = long_resp.json()
                access_token = long_data.get("access_token", short_token)
                expires_in = long_data.get("expires_in", 5184000)
            except Exception as e:
                logger.warning("Long-lived token exchange failed, using short token: %s", e)
                access_token = short_token
                expires_in = 3600
                logger.info(f"IG using short token: token_len={len(access_token)}")

            # Step 3: Get user info - Business Login tokens work with graph.facebook.com/v18.0/{ig_user_id}
            FB_GRAPH = "https://graph.facebook.com/v18.0"
            try:
                me_resp = await http.get(
                    f"{FB_GRAPH}/{ig_user_id}",
                    params={"fields": "id,username,name,profile_pic", "access_token": access_token},
                )
                me_resp.raise_for_status()
                me_data = me_resp.json()
            except Exception as e:
                logger.warning("Failed to get IG user info via Facebook Graph: %s", e)
                # Fallback: use token data
                me_data = {"id": ig_user_id, "username": ig_user_id}

        ig_id = str(me_data.get("id", ig_user_id))
        ig_username = me_data.get("username", ig_id)
        ig_name = me_data.get("name", ig_username)

        logger.info(f"IG callback returning: user_id={ig_id}, username={ig_username}, token_len={len(access_token) if access_token else 0}")
        return OAuthResult(
            platform_user_id=ig_id,
            platform_username=f"@{ig_username}",
            display_name=ig_name or ig_username,
            avatar_url=None,
            access_token=access_token,
            refresh_token=None,
            token_expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=int(expires_in))).isoformat() if expires_in else None,
            extra={"account_type": "instagram_business"},
        )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        return None
