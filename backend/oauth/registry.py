from __future__ import annotations
from .base import OAuthProvider
from typing import Optional

_providers: dict[str, type[OAuthProvider]] = {}


def register_provider(provider_cls: type[OAuthProvider]):
    name = provider_cls.platform_name
    if not name:
        raise ValueError(f"Provider {provider_cls.__name__} has empty platform_name")
    _providers[name] = provider_cls
    return provider_cls  # MUST return the class


def get_provider(platform: str) -> Optional[type[OAuthProvider]]:
    return _providers.get(platform)


def list_providers() -> list[str]:
    return list(_providers.keys())
