from __future__ import annotations
import os
import logging
from .base import OAuthProvider, OAuthResult
from .registry import register_provider

logger = logging.getLogger("socialpulses.oauth.telegram")


@register_provider
class TelegramProvider(OAuthProvider):
    """Telegram bot token connection (no OAuth, uses @BotFather token)."""
    platform_name = "telegram"

    def get_login_url(self) -> dict:
        return {
            "type": "manual_token",
            "instruction": "Enter your Telegram Bot Token from @BotFather",
            "placeholder": "123456:ABCdef...",
        }

    async def handle_callback(self, code: str, state: str | None = None) -> OAuthResult:
        import httpx
        token = state or code
        if not token or ":" not in token:
            raise ValueError("Invalid Telegram bot token format")
        url = f"https://api.telegram.org/bot{token}/getMe"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise ValueError(f"Telegram API rejected the token: {resp.text}")
        data = resp.json()
        if not data.get("ok"):
            raise ValueError(f"Invalid Telegram bot token: {data.get('description', 'unknown error')}")
        bot = data["result"]
        return OAuthResult(
            platform_user_id=str(bot["id"]),
            platform_username=bot.get("username", ""),
            display_name=bot.get("first_name", "") or bot.get("username", "Telegram Bot"),
            avatar_url=None,
            access_token=token,
            refresh_token=None,
        )

    def refresh_token(self, refresh_token: str) -> OAuthResult | None:
        return None
