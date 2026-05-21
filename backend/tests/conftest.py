"""
SocialPulses Test Suite — Conftest
Uses in-memory SQLite to avoid filesystem + import ordering issues.
"""
from __future__ import annotations
import os
import sys
import hashlib
import pytest
from typing import Generator

backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

os.environ["APP_SECRET"] = "test-secret-for-socialpulses-unit-tests-2026"
os.environ["PUBLIC_URL"] = "http://localhost:8007"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["TELEGRAM_CHAT_ID"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["DEEPSEEK_API_KEY"] = ""

# Override DB path in database module BEFORE anything imports it
import database as _db_mod
_db_mod.SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Create in-memory engine with StaticPool so all sessions/threads share one connection
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch database module BEFORE models/main import it
_db_mod.engine = test_engine
_db_mod.SessionLocal = TestSessionLocal

import models
import main as main_module
app = main_module.app
get_db = main_module.get_db

from models import Client, User, SocialPlatform


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db


def _hash_password(pw: str) -> str:
    return hashlib.sha256(('tsalt' + pw).encode()).hexdigest()

def _verify_password(plain: str, hashed: str) -> bool:
    return _hash_password(plain) == hashed

main_module.pwd_ctx.verify = _verify_password
main_module.pwd_ctx.hash = _hash_password


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create tables + seed data for each test."""
    # Drop all and recreate for test isolation
    _db_mod.Base.metadata.drop_all(bind=test_engine)
    _db_mod.Base.metadata.create_all(bind=test_engine)

    db = TestSessionLocal()
    try:
        org = models.Organization(name="Test Org")
        db.add(org); db.flush()
        client = Client(org_id=org.id, name="Test Client", email="test@test.com")
        db.add(client); db.flush()
        user = User(client_id=client.id, username="admin",
                    password_hash=_hash_password("admin123"), role="admin")
        db.add(user); db.flush()
        # Also create org membership so /api/orgs returns the org
        db.add(models.OrgMember(org_id=org.id, user_id=user.id, role="admin"))
        db.flush()
        for name in ["twitter","linkedin","instagram","facebook","tiktok",
                     "youtube","telegram","pinterest","threads","bluesky",
                     "google_business","mastodon"]:
            db.add(SocialPlatform(name=name, display_name=name.capitalize(),
                                  icon="fa-brands fa-"+name))
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def client() -> Generator:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_token(client) -> str:
    """Generate JWT token directly (bypass rate-limited login endpoint)."""
    from jose import jwt
    import datetime
    # Use same constants as main.py
    secret = os.environ["APP_SECRET"]
    algorithm = os.environ.get("JWT_ALGORITHM", "HS256")
    expire_days = int(os.environ.get("TOKEN_EXPIRE_DAYS", "30"))
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=expire_days)
    return jwt.encode({"sub": "admin", "exp": exp}, secret, algorithm=algorithm)


@pytest.fixture
def auth_headers(auth_token) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def db_session():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()
