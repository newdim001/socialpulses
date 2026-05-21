from __future__ import annotations

import os
import logging
from typing import Optional

from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.bluesky")


@register_provider
class BlueskyProvider(OAuthProvider):
    """Bluesky AT Protocol provider (handle + app password, no OAuth)."""
    platform_name = "bluesky"

    def get_login_url(self) -> dict:
        return {
            "type": "manual_token",
            "instruction": "Enter your Bluesky handle and App Password",
            "fields": [
                {"key": "handle", "label": "Bluesky Handle", "placeholder": "user.bsky.social"},
                {"key": "password", "label": "App Password", "placeholder": "xxxx-xxxx-xxxx-xxxx"},
            ],
        }

    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        import json
        import httpx
        try:
            payload = json.loads(code)
            handle = payload.get("handle", "")
            password = payload.get("password", "")
        except (json.JSONDecodeError, TypeError):
            raise ValueError("Bluesky callback requires JSON with 'handle' and 'password' fields")
        if not handle or not password:
            raise ValueError("Bluesky handle and password are required")
        async with httpx.AsyncClient(timeout=15) as http:
            try:
                session_resp = await http.post(
                    "https://bsky.social/xrpc/com.atproto.server.createSession",
                    json={"identifier": handle, "password": password},
                )
                session_resp.raise_for_status()
                session_data = session_resp.json()
            except Exception as e:
                raise ValueError(f"Bluesky authentication failed: {e}") from e
            access_jwt = session_data.get("accessJwt", "")
            did = session_data.get("did", "")
            if not access_jwt or not did:
                raise ValueError("Bluesky did not return a valid session")
            try:
                profile_resp = await http.get(
                    "https://bsky.social/xrpc/app.bsky.actor.getProfile",
                    params={"actor": handle},
                    headers={"Authorization": f"Bearer {access_jwt}"},
                )
                profile_resp.raise_for_status()
                profile = profile_resp.json()
            except Exception as e:
                raise ValueError(f"Bluesky get_profile failed: {e}") from e
        return OAuthResult(
            platform_user_id=did,
            platform_username=handle,
            display_name=profile.get("displayName", handle),
            avatar_url=profile.get("avatar", ""),
            access_token=access_jwt,
            refresh_token=session_data.get("refreshJwt"),
            extra={"did": did},
        )

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        return None
