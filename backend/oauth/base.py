from __future__ import annotations
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OAuthResult:
    """Result of a successful OAuth / token exchange."""
    platform_user_id: str
    platform_username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    access_token: str = ""
    refresh_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    extra: dict = field(default_factory=dict)


class OAuthProvider(ABC):
    """Abstract base for each social platform's OAuth flow."""
    platform_name: str = ""

    @abstractmethod
    def get_login_url(self) -> str | dict:
        ...

    @abstractmethod
    async def handle_callback(self, code: str, state: Optional[str] = None) -> OAuthResult:
        ...

    def refresh_token(self, refresh_token: str) -> Optional[OAuthResult]:
        return None

    @property
    def redirect_uri(self) -> str:
        base = os.environ.get("PUBLIC_URL", "https://app.socialpulses.io")
        return f"{base}/api/auth/{self.platform_name}/callback"
