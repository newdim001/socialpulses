"""
Normalization layer — unified result types for all platforms.
Every platform client returns data through these schemas.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class UnifiedPostResult:
    """Standard post result from any platform."""
    platform_post_id: str = ""
    url: str = ""
    status: str = "published"  # published | failed | requires_video | requires_image | processing
    message: str = ""
    platform: str = ""


@dataclass
class UnifiedUserInfo:
    """Standard user info from any platform."""
    platform_user_id: str = ""
    platform_username: str = ""
    display_name: str = ""
    avatar_url: str = ""


@dataclass
class UnifiedMetrics:
    """Standard post metrics."""
    likes: int = 0
    comments: int = 0
    shares: int = 0
    impressions: int = 0
    engagement_rate: float = 0.0


def to_unified_post(data: dict, platform: str = "") -> UnifiedPostResult:
    """Convert any dict result to UnifiedPostResult."""
    return UnifiedPostResult(
        platform_post_id=data.get("platform_post_id", ""),
        url=data.get("url", ""),
        status=data.get("status", "published"),
        message=data.get("message", ""),
        platform=platform or data.get("platform", ""),
    )


def to_unified_user(data: dict) -> UnifiedUserInfo:
    """Convert any dict user info to UnifiedUserInfo."""
    return UnifiedUserInfo(
        platform_user_id=data.get("platform_user_id", ""),
        platform_username=data.get("platform_username", ""),
        display_name=data.get("display_name", ""),
        avatar_url=data.get("avatar_url", ""),
    )
