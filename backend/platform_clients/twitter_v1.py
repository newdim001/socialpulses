"""
Twitter v1.1 API fallback for when v2 API fails.
Uses OAuth 1.0a (API key + token) for media uploads and status updates.
"""
from __future__ import annotations
from typing import Optional, List
import requests
import os
import json
import base64
import hashlib
import hmac
import time
import urllib.parse
import logging

from platform_clients import BasePlatformClient
from rate_limit_utils import api_call

logger = logging.getLogger("twitter_v1")


def _oauth1_sign(method, url, params, consumer_key, consumer_secret, token, token_secret):
    """Sign a request with OAuth 1.0a HMAC-SHA1."""
    oauth_params = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": base64.b64encode(os.urandom(32)).decode()[:32],
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": token,
        "oauth_version": "1.0",
    }
    all_params = {**params, **oauth_params}
    sorted_params = sorted(all_params.items())
    param_string = "&".join(f"{urllib.parse.quote(k)}={urllib.parse.quote(str(v))}" for k, v in sorted_params)
    signature_base = f"{method.upper()}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"
    signing_key = f"{consumer_secret}&{token_secret}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    oauth_params["oauth_signature"] = signature
    auth_header = "OAuth " + ", ".join(
        f'{k}="{urllib.parse.quote(str(v), safe='')}"'
        for k, v in sorted(oauth_params.items())
    )
    return auth_header


class TwitterV1FallbackClient(BasePlatformClient):
    """Twitter v1.1 API client using OAuth 1.0a for fallback posting."""

    API_V1 = "https://api.twitter.com/1.1"
    MEDIA_UPLOAD = "https://upload.twitter.com/1.1/media/upload.json"
    STATUS_UPDATE = "https://api.twitter.com/1.1/statuses/update.json"

    @staticmethod
    def get_oauth_authorize_url(client_id, redirect_uri, state):
        return ""

    @staticmethod
    def exchange_code_for_token(client_id, client_secret, redirect_uri, code):
        return {"access_token": "", "refresh_token": ""}

    def __init__(self, access_token="", refresh_token=None):
        super().__init__(access_token, refresh_token)
        self.consumer_key = os.environ.get("TWITTER_API_KEY", "")
        self.consumer_secret = os.environ.get("TWITTER_API_SECRET", "")
        self.access_token_oauth = os.environ.get("TWITTER_ACCESS_TOKEN", "")
        self.access_token_secret = os.environ.get("TWITTER_ACCESS_TOKEN_SECRET", "")

    def _v1_headers(self, method, url, params=None):
        auth = _oauth1_sign(
            method, url, params or {},
            self.consumer_key, self.consumer_secret,
            self.access_token_oauth, self.access_token_secret,
        )
        return {"Authorization": auth}

    def post_text(self, text: str) -> dict:
        """Post text via v1.1 /statuses/update.json"""
        url = self.STATUS_UPDATE
        params = {"status": text[:280]}
        headers = self._v1_headers("POST", url, params)
        resp = api_call("POST", url, platform="twitter_v1",
                        headers=headers, data=params, timeout=15)
        if resp.status_code == 401:
            raise PermissionError("Twitter v1.1 auth failed")
        resp.raise_for_status()
        data = resp.json()
        return {
            "platform_post_id": data.get("id_str", ""),
            "url": f"https://twitter.com/i/status/{data.get('id_str', '')}",
            "status": "published",
        }

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        """Upload media via v1.1, then post status update."""
        media_ids = []
        for media_url in media_urls:
            img_resp = requests.get(media_url, timeout=30)
            img_resp.raise_for_status()
            media_data = img_resp.content

            # INIT
            init_params = {"command": "INIT", "media_type": "image/jpeg" if ".mp4" not in media_url else "video/mp4", "total_bytes": len(media_data)}
            init_headers = self._v1_headers("POST", self.MEDIA_UPLOAD, init_params)
            init_resp = api_call("POST", self.MEDIA_UPLOAD, platform="twitter_v1",
                                 headers=init_headers, data=init_params, timeout=15)
            init_resp.raise_for_status()
            media_id = init_resp.json().get("media_id_string", "")
            if not media_id:
                continue

            # APPEND
            append_url = f"{self.MEDIA_UPLOAD}?command=APPEND&media_id={media_id}&segment_index=0"
            append_params = {"command": "APPEND", "media_id": media_id, "segment_index": "0"}
            append_headers = self._v1_headers("POST", append_url, append_params)
            requests.post(append_url, headers=append_headers,
                         files={"media": ("media", media_data, "application/octet-stream")})

            # FINALIZE
            final_params = {"command": "FINALIZE", "media_id": media_id}
            final_headers = self._v1_headers("POST", self.MEDIA_UPLOAD, final_params)
            api_call("POST", self.MEDIA_UPLOAD, platform="twitter_v1",
                     headers=final_headers, data=final_params, timeout=30)

            media_ids.append(media_id)

        params = {"status": text[:280]}
        if media_ids:
            params["media_ids"] = ",".join(media_ids)
        headers = self._v1_headers("POST", self.STATUS_UPDATE, params)
        resp = api_call("POST", self.STATUS_UPDATE, platform="twitter_v1",
                        headers=headers, data=params, timeout=15)
        if resp.status_code == 401:
            raise PermissionError("Twitter v1.1 auth failed")
        resp.raise_for_status()
        data = resp.json()
        return {
            "platform_post_id": data.get("id_str", ""),
            "url": f"https://twitter.com/i/status/{data.get('id_str', '')}",
            "status": "published",
        }

    def get_user_info(self) -> dict:
        url = f"{self.API_V1}/account/verify_credentials.json"
        headers = self._v1_headers("GET", url)
        resp = api_call("GET", url, platform="twitter_v1", headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return {
            "platform_user_id": data.get("id_str", ""),
            "platform_username": data.get("screen_name", ""),
            "display_name": data.get("name", ""),
            "avatar_url": data.get("profile_image_url_https", ""),
        }

    def refresh_access_token(self) -> Optional[str]:
        return self.access_token_oauth

    def validate_token(self) -> bool:
        try:
            self.get_user_info()
            return True
        except Exception:
            return False
