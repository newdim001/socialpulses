"""
Unit Tests — OAuth Providers & Registry
Test OAuth base class, registry, credential loader, and provider instantiation.
"""
from __future__ import annotations
import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from oauth.base import OAuthProvider, OAuthResult
from oauth.registry import register_provider, get_provider, list_providers, _providers
from oauth.credential_loader import get_platform_credentials, check_platform_configured


class TestOAuthResult:
    """Test OAuthResult dataclass."""

    def test_minimal(self):
        result = OAuthResult(platform_user_id="12345")
        assert result.platform_user_id == "12345"
        assert result.access_token == ""

    def test_full(self):
        result = OAuthResult(
            platform_user_id="12345",
            platform_username="@user",
            display_name="User Name",
            avatar_url="https://example.com/avatar.jpg",
            access_token="tok_abc",
            refresh_token="ref_xyz",
            token_expires_at="2026-12-31",
            extra={"scope": "read"}
        )
        assert result.display_name == "User Name"
        assert result.extra["scope"] == "read"

    def test_default_fields(self):
        result = OAuthResult(platform_user_id="abc")
        assert result.platform_username is None
        assert result.display_name is None
        assert result.avatar_url is None
        assert result.refresh_token is None
        assert result.token_expires_at is None


class TestOAuthProviderBase:
    """Test the abstract OAuthProvider base class."""

    def test_cannot_instantiate_abstract(self):
        """Abstract class should not be instantiable directly."""
        with pytest.raises(TypeError):
            OAuthProvider()

    def test_redirect_uri(self):
        """redirect_uri property should return correct URL."""
        os.environ["PUBLIC_URL"] = "https://app.socialpulses.io"

        class TestProvider(OAuthProvider):
            platform_name = "testplatform"

            def get_login_url(self):
                return {"url": "https://example.com/oauth"}

            async def handle_callback(self, code, state=None):
                return OAuthResult(platform_user_id="1")

        provider = TestProvider()
        assert provider.redirect_uri == "https://app.socialpulses.io/api/auth/testplatform/callback"
        assert provider.platform_name == "testplatform"

    def test_refresh_token_default(self):
        """refresh_token should return None by default."""

        class TestProvider(OAuthProvider):
            platform_name = "test"

            def get_login_url(self):
                return {"url": "https://example.com"}

            async def handle_callback(self, code, state=None):
                return OAuthResult(platform_user_id="1")

        provider = TestProvider()
        assert provider.refresh_token("abc") is None

    def test_get_login_url_return_types(self):
        """get_login_url can return str or dict."""

        class URLProvider(OAuthProvider):
            platform_name = "url_test"
            def get_login_url(self) -> str:
                return "https://example.com/oauth"
            async def handle_callback(self, code, state=None):
                return OAuthResult(platform_user_id="1")

        class DictProvider(OAuthProvider):
            platform_name = "dict_test"
            def get_login_url(self) -> dict:
                return {"type": "manual_token", "instruction": "Enter token"}
            async def handle_callback(self, code, state=None):
                return OAuthResult(platform_user_id="1")

        u = URLProvider()
        d = DictProvider()
        assert isinstance(u.get_login_url(), str)
        assert isinstance(d.get_login_url(), dict)


class TestRegistry:
    """Test OAuth provider registry."""

    def setup_method(self):
        # Clear registry before each test
        _providers.clear()

    def test_register_and_get(self):
        class TestProvider(OAuthProvider):
            platform_name = "testreg"
            def get_login_url(self):
                return {"url": "https://example.com"}
            async def handle_callback(self, code, state=None):
                return OAuthResult(platform_user_id="1")

        register_provider(TestProvider)
        assert get_provider("testreg") == TestProvider

    def test_get_nonexistent(self):
        assert get_provider("nonexistent") is None

    def test_list_providers(self):
        class P1(OAuthProvider):
            platform_name = "plat1"
            def get_login_url(self): return ""
            async def handle_callback(self, code, state=None): return OAuthResult(platform_user_id="1")

        class P2(OAuthProvider):
            platform_name = "plat2"
            def get_login_url(self): return ""
            async def handle_callback(self, code, state=None): return OAuthResult(platform_user_id="1")

        register_provider(P1)
        register_provider(P2)
        providers = list_providers()
        assert "plat1" in providers
        assert "plat2" in providers

    def test_register_empty_name_raises(self):
        class EmptyProvider(OAuthProvider):
            platform_name = ""
            def get_login_url(self): return ""
            async def handle_callback(self, code, state=None): return OAuthResult(platform_user_id="1")

        with pytest.raises(ValueError, match="empty platform_name"):
            register_provider(EmptyProvider)


class TestCredentialLoader:
    """Test platform credential loader (without DB)."""

    def test_check_not_configured(self):
        """When no env vars set, check_platform_configured returns False."""
        # Save original env
        orig = {}
        for key in ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"]:
            orig[key] = os.environ.get(key)
            if key in os.environ:
                del os.environ[key]

        configured = check_platform_configured("twitter")
        assert configured is False

        # Restore
        for key, val in orig.items():
            if val is not None:
                os.environ[key] = val

    def test_get_platform_credentials_no_db(self):
        """Without a DB session, should return empty dict."""
        creds = get_platform_credentials("twitter", None)
        assert isinstance(creds, dict)

    def test_env_var_fallback(self):
        """When env vars are set, check returns True."""
        os.environ["TWITTER_CLIENT_ID"] = "test_id_123"
        os.environ["TWITTER_CLIENT_SECRET"] = "test_secret_456"
        configured = check_platform_configured("twitter")
        assert configured is True
        # Clean up
        del os.environ["TWITTER_CLIENT_ID"]
        del os.environ["TWITTER_CLIENT_SECRET"]
