from __future__ import annotations
from typing import Optional, List


class BasePlatformClient:
    """Abstract base for social platform API clients."""

    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token

    def post_text(self, text: str) -> dict:
        """Post text-only content. Returns {platform_post_id, url}."""
        raise NotImplementedError

    def post_with_media(self, text: str, media_urls: List[str]) -> dict:
        """Post text with images. Returns {platform_post_id, url}."""
        raise NotImplementedError

    def get_user_info(self) -> dict:
        """Get connected user's profile info."""
        raise NotImplementedError

    def refresh_access_token(self) -> Optional[str]:
        """Refresh the access token. Returns new token or None."""
        raise NotImplementedError

    def validate_token(self) -> bool:
        """Check if the current token is still valid."""
        raise NotImplementedError

    @staticmethod
    def get_oauth_authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
        """Generate the OAuth authorization URL."""
        raise NotImplementedError

    @staticmethod
    def exchange_code_for_token(client_id: str, client_secret: str, redirect_uri: str, code: str) -> dict:
        """Exchange OAuth code for access token."""
        raise NotImplementedError
