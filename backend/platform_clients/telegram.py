from __future__ import annotations
from typing import Optional, List
import requests
import os

from platform_clients import BasePlatformClient
from rate_limit_utils import api_call_with_backoff


class TelegramClient(BasePlatformClient):
    """Telegram Bot API client.
    No OAuth - uses Bot Token from @BotFather + Chat ID.
    """

    def __init__(self, access_token: str = "", refresh_token: Optional[str] = None):
        self.access_token = access_token or os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.refresh_token = refresh_token
        self._chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        return "https://t.me/BotFather"

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        return {"access_token": "", "refresh_token": ""}

    def _api_url(self, method: str) -> str:
        return f"https://api.telegram.org/bot{self.access_token}/{method}"

    def _ensure_bot_token(self):
        if not self.access_token:
            raise RuntimeError("Telegram bot token not configured.")

    def post_text(self, text: str) -> dict:
        """Send text message to Telegram channel."""
        self._ensure_bot_token()
        resp = api_call_with_backoff(lambda: requests.post(
            self._api_url("sendMessage"),
            json={
                "chat_id": self._chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": False,
            },
            timeout=10,
        ))
        if resp.status_code == 401:
            raise PermissionError("Invalid bot token")
        resp.raise_for_status()
        data = resp.json().get("result", {})
        return {
            "platform_post_id": str(data.get("message_id", "")),
            "url": f"https://t.me/c/{self._chat_id}/{data.get('message_id', '')}" if self._chat_id else "",
            "status": "published",
        }

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        """Send photo(s) to Telegram channel."""
        self._ensure_bot_token()
        if not media_urls:
            return self.post_text(text)
        if len(media_urls) == 1:
            resp = api_call_with_backoff(lambda: requests.post(
                self._api_url("sendPhoto"),
                json={
                    "chat_id": self._chat_id,
                    "photo": media_urls[0],
                    "caption": text[:1024] if text else "",
                    "parse_mode": "HTML",
                },
                timeout=10,
            ))
            resp.raise_for_status()
            data = resp.json().get("result", {})
        else:
            media_items = []
            for i, url in enumerate(media_urls[:10]):
                item = {"type": "photo", "media": url}
                if i == 0 and text:
                    item["caption"] = text[:1024]
                    item["parse_mode"] = "HTML"
                media_items.append(item)
            resp = api_call_with_backoff(lambda: requests.post(
                self._api_url("sendMediaGroup"),
                json={"chat_id": self._chat_id, "media": media_items},
                timeout=15,
            ))
            resp.raise_for_status()
            results = resp.json().get("result", [])
            data = results[0] if results else {}
        return {
            "platform_post_id": str(data.get("message_id", "")),
            "url": f"https://t.me/c/{self._chat_id}/{data.get('message_id', '')}" if self._chat_id else "",
            "status": "published",
        }

    def get_user_info(self) -> dict:
        self._ensure_bot_token()
        resp = api_call_with_backoff(lambda: requests.get(self._api_url("getMe"), timeout=10))
        resp.raise_for_status()
        data = resp.json().get("result", {})
        return {
            "platform_user_id": str(data.get("id", "")),
            "platform_username": data.get("username", ""),
            "display_name": data.get("first_name", "Telegram Bot"),
            "avatar_url": "",
        }

    def refresh_access_token(self) -> Optional[str]:
        return self.access_token

    def validate_token(self) -> bool:
        try:
            self.get_user_info()
            return True
        except Exception:
            return False
