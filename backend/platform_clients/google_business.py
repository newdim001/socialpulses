from __future__ import annotations
from typing import Optional, List
import requests
import os as _os
import urllib.parse
from platform_clients import BasePlatformClient
from rate_limit_utils import api_call_with_backoff


class GoogleBusinessClient(BasePlatformClient):
    API_BASE = "https://mybusiness.googleapis.com/v4"
    AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_BASE = "https://oauth2.googleapis.com/token"

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        scopes = "https://www.googleapis.com/auth/business.manage"
        return (f"{GoogleBusinessClient.AUTH_BASE}?response_type=code&client_id={client_id}"
                f"&redirect_uri={urllib.parse.quote(redirect_uri, safe="")}&scope={scopes}&state={state}&access_type=offline")

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        data = {"code": code, "client_id": client_id, "client_secret": client_secret,
                "redirect_uri": redirect_uri, "grant_type": "authorization_code"}
        resp = api_call_with_backoff(lambda: requests.post(GoogleBusinessClient.TOKEN_BASE, data=data))
        resp.raise_for_status()
        return resp.json()

    def _headers(self):
        return {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}

    def _get_account_name(self) -> Optional[str]:
        resp = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/accounts", headers=self._headers()))
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        accounts = resp.json().get("accounts", [])
        if not accounts:
            return None
        return accounts[0]["name"]

    def post_text(self, text: str) -> dict:
        account_name = self._get_account_name()
        if not account_name:
            return {"platform_post_id": "", "status": "failed", "message": "No Google Business account found"}
        locations = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/{account_name}/locations", headers=self._headers()))
        if locations.status_code == 401:
            raise PermissionError("Token expired")
        locations.raise_for_status()
        locs = locations.json().get("locations", [])
        if not locs:
            return {"platform_post_id": "", "status": "failed", "message": "No locations found"}
        location_name = locs[0]["name"]
        body = {"languageCode": "en", "topicType": "STANDARD", "body": text[:1500]}
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/{location_name}/localPosts", headers=self._headers(), json=body))
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        data = resp.json()
        return {"platform_post_id": data.get("name", ""), "url": "", "status": "published"}

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        if not media_urls:
            return self.post_text(text)
        account_name = self._get_account_name()
        if not account_name:
            return {"platform_post_id": "", "status": "failed", "message": "No Google Business account found"}
        locations = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/{account_name}/locations", headers=self._headers()))
        if locations.status_code == 401:
            raise PermissionError("Token expired")
        locations.raise_for_status()
        locs = locations.json().get("locations", [])
        if not locs:
            return {"platform_post_id": "", "status": "failed", "message": "No locations found"}
        location_name = locs[0]["name"]
        body = {"languageCode": "en", "topicType": "STANDARD", "body": text[:1500],
                "media": [{"mediaFormat": "PHOTO", "sourceUrl": media_urls[0]}]}
        resp = api_call_with_backoff(lambda: requests.post(f"{self.API_BASE}/{location_name}/localPosts", headers=self._headers(), json=body))
        if resp.status_code == 401:
            raise PermissionError("Token expired")
        resp.raise_for_status()
        data = resp.json()
        return {"platform_post_id": data.get("name", ""), "url": "", "status": "published"}

    def get_user_info(self) -> dict:
        resp = api_call_with_backoff(lambda: requests.get(f"{self.API_BASE}/accounts", headers=self._headers()))
        resp.raise_for_status()
        data = resp.json()
        accounts = data.get("accounts", [])
        if not accounts:
            return {"platform_user_id": "", "platform_username": "", "display_name": "No account", "avatar_url": ""}
        acct = accounts[0]
        return {"platform_user_id": acct.get("name", ""), "platform_username": acct.get("accountName", ""),
                "display_name": acct.get("accountName", ""), "avatar_url": ""}

    def refresh_access_token(self) -> Optional[str]:
        cid = _os.environ.get("GOOGLE_CLIENT_ID", "")
        cs = _os.environ.get("GOOGLE_CLIENT_SECRET", "")
        if not self.refresh_token:
            return None
        data = {"grant_type": "refresh_token", "refresh_token": self.refresh_token,
                "client_id": cid, "client_secret": cs}
        resp = api_call_with_backoff(lambda: requests.post(self.TOKEN_BASE, data=data))
        if resp.status_code != 200:
            return None
        self.access_token = resp.json().get("access_token", self.access_token)
        return self.access_token

    def validate_token(self) -> bool:
        try:
            self.get_user_info()
            return True
        except Exception:
            return False
