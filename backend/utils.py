"""Utility functions extracted from main.py."""
from cryptography.fernet import Fernet
import base64
import hashlib
import secrets
import os
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
import stripe
import resend
from fastapi import HTTPException, Depends, Request
from fastapi.responses import JSONResponse

_env_file = "/var/www/socialpulses/backend/.env"

# Fernet key for token encryption
_KEY_HASH = hashlib.sha256(b"socialpulses-encryption-key-2025").digest()
_KEY = base64.urlsafe_b64encode(_KEY_HASH)
_fernet = Fernet(_KEY)


# Load STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY from .env
if not os.environ.get("STRIPE_SECRET_KEY") and os.path.exists(_env_file):
    try:
        for _line in open(_env_file):
            if _line.startswith("STRIPE_SECRET_KEY"):
                os.environ["STRIPE_SECRET_KEY"] = _line.split("=", 1)[1].strip()
            elif _line.startswith("STRIPE_PUBLISHABLE_KEY"):
                os.environ["STRIPE_PUBLISHABLE_KEY"] = _line.split("=", 1)[1].strip()
            elif _line.startswith("RESEND_API_KEY"):
                os.environ["RESEND_API_KEY"] = _line.split("=", 1)[1].strip()
            elif _line.startswith("STRIPE_WEBHOOK_SECRET"):
                os.environ["STRIPE_WEBHOOK_SECRET"] = _line.split("=", 1)[1].strip()
    except Exception:
        pass

# Stripe
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY") or ""
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY") or ""
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET") or ""
RESEND_API_KEY = os.environ.get("RESEND_API_KEY") or ""

# JWT config
SECRET_KEY = os.environ.get("APP_SECRET", "socialpulses-dev-secret-key-2025")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def _encrypt_token(token: str) -> str:
    if not token:
        return token
    return _fernet.encrypt(token.encode()).decode()


def _decrypt_token(encrypted: str) -> str:
    if not encrypted:
        return encrypted
    try:
        return _fernet.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted


class PwdCtx:
    """Password hashing context."""
    @staticmethod
    def hash(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def verify(password: str, hashed: str) -> bool:
        return hashlib.sha256(password.encode()).hexdigest() == hashed


def create_token(username):
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": username, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except JWTError:
        return None


def seed_data():
    """Seed initial data."""
    pass
