from __future__ import annotations
from typing import Optional, List
import requests
import os

from platform_clients import BasePlatformClient


import urllib.parse
class YouTubeClient(BasePlatformClient):
    """YouTube API client using Google OAuth 2.0 (YouTube Data API v3)."""

    API_BASE = "https://www.googleapis.com/youtube/v3"
    AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_BASE = "https://oauth2.googleapis.com/token"

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        scopes = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl"
        return (
            f"{YouTubeClient.AUTH_BASE}?"
            f"response_type=code&client_id={urllib.parse.quote(client_id)}"
            f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
            f"&scope={urllib.parse.quote(scopes)}"
            f"&state={urllib.parse.quote(state)}"
            f"&access_type=offline"
            f"&prompt=consent"
        )

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        resp = requests.post(YouTubeClient.TOKEN_BASE, data=data)
        resp.raise_for_status()
        return resp.json()

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}", "Accept": "application/json"}

    def post_text(self, text: str) -> dict:
        """Text-only posts fall back to a placeholder."""
        return {
            "platform_post_id": "",
            "url": "",
            "status": "requires_video",
            "message": "YouTube requires a video upload to create posts via API.",
        }

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        """Upload a video to YouTube."""
        if not media_urls:
            return self.post_text(text)
        video_url = media_urls[0]
        body = {
            "snippet": {
                "title": (text[:100] if len(text) > 100 else text) or "YouTube Post",
                "description": text[:5000],
                "categoryId": "22",
            },
            "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
        }
        resp = requests.post(
            f"{self.API_BASE}/videos?part=snippet,status&uploadType=resumable",
            headers={**self._headers(), "X-Upload-Content-Type": "video/*"},
            json=body,
        )
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        upload_url = resp.headers.get("Location", "")
        if not upload_url:
            return {"platform_post_id": "", "url": "", "status": "failed", "message": "No upload URL"}
        try:
            video_resp = requests.get(video_url, timeout=60)
            video_resp.raise_for_status()
            upload_resp = requests.put(upload_url, data=video_resp.content, timeout=300)
            upload_resp.raise_for_status()
            video_id = upload_resp.json().get("id", "")
        except Exception as e:
            return {"platform_post_id": "", "url": "", "status": "failed", "message": str(e)[:100]}
        return {
            "platform_post_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "status": "published" if video_id else "processing",
        }

    def get_user_info(self) -> dict:
        resp = requests.get(
            f"{self.API_BASE}/channels?part=snippet&mine=true",
            headers=self._headers(),
        )
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        items = resp.json().get("items", [])
        if not items:
            raise RuntimeError("No YouTube channel found")
        channel = items[0]
        snippet = channel.get("snippet", {})
        return {
            "platform_user_id": channel.get("id", ""),
            "platform_username": snippet.get("customUrl", snippet.get("title", "")),
            "display_name": snippet.get("title", "YouTube User"),
            "avatar_url": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
        }

    def refresh_access_token(self) -> Optional[str]:
        client_id = os.environ.get("YOUTUBE_CLIENT_ID", "")
        client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
        if not self.refresh_token:
            return None
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
        }
        resp = requests.post(self.TOKEN_BASE, data=data)
        if resp.status_code != 200:
            return None
        result = resp.json()
        self.access_token = result.get("access_token", self.access_token)
        return self.access_token

    def validate_token(self) -> bool:
        try:
            self.get_user_info()
            return True
        except Exception:
            return False
