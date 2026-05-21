from __future__ import annotations
from typing import Optional, List
import requests
import os
from platform_clients import BasePlatformClient
from rate_limit_utils import api_call_with_backoff

class BlueskyClient(BasePlatformClient):
    API_BASE = "https://bsky.social/xrpc"

    def __init__(self, access_token: str = "", refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self._handle = os.environ.get("BLUESKY_HANDLE", "")
        self._password = os.environ.get("BLUESKY_APP_PASSWORD", "")
        self._did = ""; self._jwt = ""

    def _authenticate(self):
        if not self._handle or not self._password: raise RuntimeError("Bluesky not configured")
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/com.atproto.server.createSession", json={"identifier": self._handle, "password": self._password}))
        if resp.status_code == 401: raise PermissionError("Invalid Bluesky credentials")
        resp.raise_for_status()
        data = resp.json(); self._jwt = data.get("accessJwt", ""); self._did = data.get("did", "")

    def _headers(self):
        if not self._jwt: self._authenticate()
        return {"Authorization": f"Bearer {self._jwt}", "Content-Type": "application/json"}

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        return "https://bsky.app/settings/app-passwords"

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        return {"access_token": "", "refresh_token": ""}

    def post_text(self, text: str) -> dict:
        self._authenticate()
        import datetime
        record = {"$type": "app.bsky.feed.post", "text": text[:300], "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/com.atproto.repo.createRecord", headers=self._headers(),
            json={"repo": self._did, "collection": "app.bsky.feed.post", "record": record}))
        if resp.status_code == 401: raise PermissionError("Session expired")
        resp.raise_for_status()
        uri = resp.json().get("uri", ""); rkey = uri.split("/")[-1] if uri else ""
        return {"platform_post_id": rkey, "url": f"https://bsky.app/profile/{self._handle}/post/{rkey}" if rkey else "", "status": "published"}

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        if not media_urls: return self.post_text(text)
        self._authenticate()
        import datetime
        embeds = []
        for url in media_urls[:4]:
            img_resp = api_call_with_backoff(lambda: requests.get(url, timeout=30))
            if img_resp.status_code != 200: continue
            upload = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/com.atproto.repo.uploadBlob",
                headers={"Authorization": f"Bearer {self._jwt}", "Content-Type": img_resp.headers.get("content-type", "image/png")},
                data=img_resp.content))
            if upload.status_code != 200: continue
            blob = upload.json().get("blob")
            if blob: embeds.append({"$type": "app.bsky.embed.images", "images": [{"alt": "", "image": blob}]})
        record = {"$type": "app.bsky.feed.post", "text": text[:300], "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        if embeds:
            record["embed"] = embeds[0] if len(embeds) == 1 else {"$type": "app.bsky.embed.images", "images": [img for e in embeds for img in e.get("images", [])]}
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/com.atproto.repo.createRecord", headers=self._headers(),
            json={"repo": self._did, "collection": "app.bsky.feed.post", "record": record}))
        if resp.status_code == 401: raise PermissionError("Session expired")
        resp.raise_for_status()
        uri = resp.json().get("uri", ""); rkey = uri.split("/")[-1] if uri else ""
        return {"platform_post_id": rkey, "url": f"https://bsky.app/profile/{self._handle}/post/{rkey}" if rkey else "", "status": "published"}

    def get_user_info(self) -> dict:
        self._authenticate()
        resp = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/app.bsky.actor.getProfile", headers=self._headers(), params={"actor": self._handle}))
        resp.raise_for_status()
        data = resp.json()
        return {"platform_user_id": data.get("did", ""), "platform_username": data.get("handle", self._handle), "display_name": data.get("displayName", self._handle), "avatar_url": data.get("avatar", "")}

    def refresh_access_token(self) -> Optional[str]:
        self._authenticate(); return self._jwt

    def validate_token(self) -> bool:
        try: self.get_user_info(); return True
        except: return False
