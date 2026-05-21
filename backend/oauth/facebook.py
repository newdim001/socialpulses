from __future__ import annotations

import os
import uuid
import logging
import datetime
from typing import Optional

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.facebook")

AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
GRAPH_URL = "https://graph.facebook.com/v18.0"
SCOPES = "pages_show_list"


@register_provider
class FacebookProvider(OAuthProvider):
    """Facebook Graph API OAuth 2.0 provider (self-contained)."""
    platform_name = "facebook"

    def get_login_url(self) -> str | dict:
        client_id = os.environ.get("FACEBOOK_CLIENT_ID")
        if not client_id:
            return {"error": "not_configured", "message": "Facebook API keys not set"}
        state = str(uuid.uuid4())
        import urllib.parse
        url = (
            f"{AUTH_URL}?client_id={urllib.parse.quote(client_id, safe='')}"
            f"&redirect_uri={urllib.parse.quote(self.redirect_uri, safe='')}"
            f"&scope={urllib.parse.quote(SCOPES)}&state={state}&response_type=code"
        )
        return {"url": url, "state": state}

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        import httpx
        client_id = os.environ.get("FACEBOOK_CLIENT_ID")
        client_secret = os.environ.get("FACEBOOK_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise ValueError("Facebook API not configured")
        async with httpx.AsyncClient(timeout=15) as http:
            try:
                token_resp = await http.get(TOKEN_URL, params={
                    "client_id": client_id, "client_secret": client_secret,
                    "redirect_uri": self.redirect_uri, "code": code,
                })
                token_resp.raise_for_status()
                token_data = token_resp.json()
            except Exception as e:
                raise ValueError(f"Facebook token exchange failed: {e}") from e
            user_access_token = token_data.get("access_token", "")
            if not user_access_token:
                raise ValueError("Facebook did not return an access_token")
            try:
                user_resp = await http.get(
                    f"{GRAPH_URL}/me",
                    params={"fields": "id,name,accounts{id,name,access_token,picture}", "access_token": user_access_token},
                )
                user_resp.raise_for_status()
                user_data = user_resp.json()
            except Exception as e:
                raise ValueError(f"Facebook get_user_info failed: {e}") from e

        pages = user_data.get("accounts", {}).get("data", [])
        logger.info("Facebook user %s has %d pages", user_data.get("name"), len(pages))

        page = None
        for p in pages:
            name_lower = p.get("name", "").lower()
            if "social" in name_lower or "pulse" in name_lower:
                page = p
                break
        if not page and pages:
            page = pages[0]

        if page:
            page_id = page["id"]
            page_name = page["name"]
            page_token = page["access_token"]
            page_pic = page.get("picture", {}).get("data", {}).get("url")
            logger.info("Connecting Facebook Page: %s (id=%s)", page_name, page_id)
            return OAuthResult(
                platform_user_id=page_id,
                platform_username=page_name,
                display_name=page_name,
                avatar_url=page_pic,
                access_token=page_token,
                refresh_token=None,
                token_expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=int(token_data.get("expires_in", 0)))).isoformat() if token_data.get("expires_in") else None,
                extra={"account_type": "page", "pages": [{"id": p["id"], "name": p["name"]} for p in pages]},
            )
        else:
            logger.warning("No Facebook Pages found for user %s", user_data.get("name"))
            return OAuthResult(
                platform_user_id=str(user_data.get("id", "")),
                platform_username=user_data.get("name", ""),
                display_name=user_data.get("name", ""),
                avatar_url=None,
                access_token=user_access_token,
                refresh_token=None,
                token_expires_at=(datetime.datetime.utcnow() + datetime.timedelta(seconds=int(token_data.get("expires_in", 0)))).isoformat() if token_data.get("expires_in") else None,
                extra={"account_type": "user", "pages": []},
            )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        return None
