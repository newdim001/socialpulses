from __future__ import annotations
from typing import Optional, List
import requests
import os

from platform_clients import BasePlatformClient
from rate_limit_utils import api_call_with_backoff


class TikTokClient(BasePlatformClient):
    """TikTok API client using OAuth 2.0 (TikTok for Developers)."""

    API_BASE = "https://open.tiktokapis.com/v2"
    AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize"
    TOKEN_BASE = "https://open.tiktokapis.com/v2/oauth/token/"
    UPLOAD_BASE = "https://open-api.tiktok.com/share/video/upload"

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        import urllib.parse
        scopes = "user.info.basic,user.info.profile,user.info.stats,video.list,video.upload"
        return (
            f"{TikTokClient.AUTH_BASE}/?response_type=code"
            f"&client_key={client_id}"
            f"&redirect_uri={urllib.parse.quote(redirect_uri, safe='')}"
            f"&scope={scopes}"
            f"&state={state}"
        )

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        import logging
        logger = logging.getLogger("socialpulses.oauth.tiktok")
        data = {
            "client_key": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        logger.info(f"Exchanging code for token at {TikTokClient.TOKEN_BASE}")
        logger.info(f"Request data: client_key={client_id[:5]}... redirect_uri={redirect_uri}")
        resp = api_call_with_backoff(lambda: requests.post(TikTokClient.TOKEN_BASE, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}))
        logger.info(f"Token exchange response status: {resp.status_code}")
        logger.info(f"Token exchange response body: {resp.text[:500]}")
        resp.raise_for_status()
        return resp.json().get("data", resp.json())

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}"}

    def post_text(self, text: str) -> dict:
        """Post text to TikTok."""
        resp = api_call_with_backoff(lambda: requests.post(
            f"{self.API_BASE}/post/publish/inbox/video/init/",
            headers=self._headers(),
            json={
                "post_info": {"title": text, "privacy_level": "PUBLIC_TO_EVERYONE"},
                "source_info": {"source": "PULL_FROM_URL"},
            },
        ))
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        data = resp.json().get("data", {})
        return {
            "platform_post_id": data.get("publish_id", ""),
            "url": f"https://www.tiktok.com/@{data.get('creator_id', '')}",
            "status": data.get("status", "published"),
        }

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        """Upload a video to TikTok with caption."""
        if not media_urls:
            return self.post_text(text)
        video_url = media_urls[0]
        resp = api_call_with_backoff(lambda: requests.post(
            f"{self.API_BASE}/video/upload/",
            headers=self._headers(),
            json={
                "post_info": {
                    "title": text,
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                    "disable_duet": False,
                    "disable_comment": False,
                    "disable_stitch": False,
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": video_url,
                },
            },
        ))
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        data = resp.json().get("data", {})
        return {
            "platform_post_id": data.get("publish_id", ""),
            "url": f"https://www.tiktok.com/@{data.get('creator_id', '')}",
            "status": "published",
        }

    def get_user_info(self) -> dict:
        resp = api_call_with_backoff(lambda: requests.get(
            f"{self.API_BASE}/user/info/?fields=open_id,display_name,avatar_url",
            headers=self._headers(),
        ))
        resp.raise_for_status()
        data = resp.json().get("data", {}).get("user", {})
        return {
            "platform_user_id": data.get("open_id", ""),
            "platform_username": data.get("display_name", ""),
            "display_name": data.get("display_name", "TikTok User"),
            "avatar_url": data.get("avatar_url", ""),
        }

    def refresh_access_token(self) -> Optional[str]:
        client_id = os.environ.get("TIKTOK_CLIENT_KEY", "")
        if not self.refresh_token:
            return None
        data = {
            "client_key": client_id,
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
        }
        resp = api_call_with_backoff(lambda: requests.post(self.TOKEN_BASE, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}))
        if resp.status_code != 200:
            return None
        result = resp.json().get("data", {})
        self.access_token = result.get("access_token", self.access_token)
        return self.access_token

    def validate_token(self) -> bool:
        try:
            self.get_user_info()
            return True
        except Exception:
            return False
