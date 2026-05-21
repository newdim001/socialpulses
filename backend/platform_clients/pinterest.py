from __future__ import annotations
from typing import Optional, List
import requests
import os
import urllib.parse
from platform_clients import BasePlatformClient
from rate_limit_utils import api_call_with_backoff

class PinterestClient(BasePlatformClient):
    API_BASE = "https://api.pinterest.com/v5"
    AUTH_BASE = "https://www.pinterest.com/oauth"
    TOKEN_BASE = "https://api.pinterest.com/v5/oauth/token"

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        scopes = "boards:read boards:write pins:read pins:write user_accounts:read"
        return f"{PinterestClient.AUTH_BASE}/?response_type=code&client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri, safe="")}&scope={scopes.replace(' ', '%20')}&state={state}"

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        auth = (client_id, client_secret)
        resp = api_call_with_backoff(lambda: requests.post(PinterestClient.TOKEN_BASE, data=data, auth=auth))
        resp.raise_for_status()
        return resp.json()

    def _headers(self): return {"Authorization": f"Bearer {self.access_token}"}

    def post_text(self, text: str) -> dict:
        return {"platform_post_id": "", "status": "requires_image", "message": "Pinterest requires an image to create a Pin."}

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        if not media_urls: return self.post_text(text)
        boards_resp = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/boards", headers=self._headers()))
        if boards_resp.status_code == 401: raise PermissionError("Token expired")
        boards_resp.raise_for_status()
        boards = boards_resp.json().get("items", [])
        if not boards: return {"platform_post_id": "", "status": "failed", "message": "No Pinterest boards found"}
        board_id = boards[0]["id"]
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/pins", headers=self._headers(),
            json={"board_id": board_id, "title": text[:100] or "Pin", "description": text[:500],
                  "media_source": {"source_type": "image_url", "url": media_urls[0]}}))
        if resp.status_code == 401: raise PermissionError("Token expired")
        resp.raise_for_status()
        data = resp.json()
        return {"platform_post_id": data.get("id", ""), "url": data.get("link", ""), "status": "published"}

    def get_user_info(self) -> dict:
        resp = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/user_account", headers=self._headers()))
        resp.raise_for_status()
        data = resp.json()
        return {"platform_user_id": data.get("username", str(data.get("id", ""))), "platform_username": data.get("username", ""), "display_name": data.get("display_name", data.get("username", "")), "avatar_url": ""}

    def refresh_access_token(self) -> Optional[str]:
        cid = os.environ.get("PINTEREST_CLIENT_ID", ""); cs = os.environ.get("PINTEREST_CLIENT_SECRET", "")
        if not self.refresh_token: return None
        resp = api_call_with_backoff(lambda: requests.post(self.TOKEN_BASE, data={"grant_type": "refresh_token", "refresh_token": self.refresh_token, "client_id": cid, "client_secret": cs}))
        if resp.status_code != 200: return None
        self.access_token = resp.json().get("access_token", self.access_token)
        return self.access_token

    def validate_token(self) -> bool:
        try: self.get_user_info(); return True
        except: return False
