"""Helper to load platform credentials from DB, falling back to env vars."""
from __future__ import annotations
import os
import json
from typing import Optional
from sqlalchemy.orm import Session

# Map platform names to their env var names
ENV_MAP = {
    "twitter": {"client_id": "TWITTER_CLIENT_ID", "client_secret": "TWITTER_CLIENT_SECRET"},
    "linkedin": {"client_id": "LINKEDIN_CLIENT_ID", "client_secret": "LINKEDIN_CLIENT_SECRET"},
    "instagram": {"client_id": "INSTAGRAM_CLIENT_ID", "client_secret": "INSTAGRAM_CLIENT_SECRET"},
    "facebook": {"client_id": "FACEBOOK_CLIENT_ID", "client_secret": "FACEBOOK_CLIENT_SECRET"},
    "tiktok": {"client_id": "TIKTOK_CLIENT_KEY", "client_secret": "TIKTOK_CLIENT_SECRET"},
    "youtube": {"client_id": "YOUTUBE_CLIENT_ID", "client_secret": "YOUTUBE_CLIENT_SECRET"},
    "telegram": {"client_id": "TELEGRAM_BOT_TOKEN", "client_secret": None},
    "pinterest": {"client_id": "PINTEREST_CLIENT_ID", "client_secret": "PINTEREST_CLIENT_SECRET"},
    "threads": {"client_id": "THREADS_CLIENT_ID", "client_secret": "THREADS_CLIENT_SECRET"},
    "bluesky": {"client_id": "BLUESKY_HANDLE", "client_secret": None},
    "google_business": {"client_id": "GOOGLE_CLIENT_ID", "client_secret": "GOOGLE_CLIENT_SECRET"},
    "mastodon": {"client_id": "MASTODON_CLIENT_ID", "client_secret": "MASTODON_CLIENT_SECRET"},
}


def get_platform_credentials(platform: str, db: Optional[Session] = None) -> dict:
    """Get platform credentials: check DB first, fall back to environment vars."""
    result = {"client_id": "", "client_secret": "", "extra_config": None}

    if db is not None:
        try:
            from models import PlatformCredential
            cred = db.query(PlatformCredential).filter(
                PlatformCredential.platform == platform
            ).first()
            if cred:
                result["client_id"] = cred.client_id or ""
                result["client_secret"] = cred.client_secret or ""
                if cred.extra_config:
                    try:
                        result["extra_config"] = json.loads(cred.extra_config)
                    except (json.JSONDecodeError, TypeError):
                        result["extra_config"] = cred.extra_config
                return result
        except Exception:
            pass

    mapping = ENV_MAP.get(platform, {})
    result["client_id"] = os.environ.get(mapping.get("client_id", ""), "")
    secret_key = mapping.get("client_secret")
    if secret_key:
        result["client_secret"] = os.environ.get(secret_key, "")
    return result


def inject_credentials_into_env(platform: str, db: Optional[Session] = None):
    """Load platform credentials from DB and inject into os.environ.
    Existing provider code reads os.environ — they don't need changes."""
    creds = get_platform_credentials(platform, db)
    mapping = ENV_MAP.get(platform)
    if not mapping:
        return

    if creds.get("client_id") and mapping.get("client_id"):
        os.environ[mapping["client_id"]] = creds["client_id"]
    if creds.get("client_secret") and mapping.get("client_secret"):
        os.environ[mapping["client_secret"]] = creds["client_secret"]


def check_platform_configured(platform: str, db: Optional[Session] = None) -> bool:
    """Check if a platform has credentials configured (DB or env)."""
    creds = get_platform_credentials(platform, db)
    mapping = ENV_MAP.get(platform, {})
    if creds.get("client_id"):
        return True
    env_key = mapping.get("client_id", "")
    if env_key and os.environ.get(env_key):
        return True
    return False
