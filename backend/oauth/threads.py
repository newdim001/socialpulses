from __future__ import annotations

import os
import uuid
import logging
from typing import Optional

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.threads")


@register_provider
class ThreadsProvider(OAuthProvider):
    """Threads (Meta) OAuth 2.0 provider."""
    platform_name = "threads"

    def get_login_url(self) -> str | dict:
        client_id = os.environ.get("THREADS_CLIENT_ID")
        if not client_id:
            return {"error": "not_configured", "message": "Threads API keys not set"}
        state = str(uuid.uuid4())
        from platform_clients.threads import ThreadsClient
        url = ThreadsClient.get_oauth_authorize_url(client_id, self.redirect_uri, state)
        return {"url": url, "state": state}

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        import httpx
        client_id = os.environ.get("THREADS_CLIENT_ID")
        client_secret = os.environ.get("THREADS_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise ValueError("Threads API not configured")
        from platform_clients.threads import ThreadsClient
        try:
            token_data = ThreadsClient.exchange_code_for_token(client_id, client_secret, self.redirect_uri, code)
        except Exception as e:
            raise ValueError(f"Threads token exchange failed: {e}") from e
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token")
        client = ThreadsClient(access_token, refresh_token)
        try:
            user_info = client.get_user_info()
        except Exception as e:
            raise ValueError(f"Threads get_user_info failed: {e}") from e
        return OAuthResult(
            platform_user_id=str(user_info["platform_user_id"]),
            platform_username=user_info.get("platform_username", ""),
            display_name=user_info.get("display_name", ""),
            avatar_url=user_info.get("avatar_url"),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_data.get("expires_in"),
        )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        if not refresh_token:
            return None
        from platform_clients.threads import ThreadsClient
        client = ThreadsClient("", refresh_token)
        try:
            new_token = client.refresh_access_token()
            if new_token:
                return OAuthResult(platform_user_id="", access_token=new_token, refresh_token=refresh_token)
        except Exception:
            return None
        return None
