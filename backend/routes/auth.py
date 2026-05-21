"""Auth routes - login, signup, profile, Google OAuth."""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, Client
from schemas import LoginRequest, TokenResponse, SignupRequest, ProfileResponse, ProfileUpdate, ChangePasswordRequest
from utils import create_token, verify_token, _encrypt_token, _decrypt_token
import httpx, json, logging
logger = logging.getLogger("auth_routes")
router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ── Auth Routes ──

@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(req: LoginRequest, request: Request, db=Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not pwd_ctx.verify(req.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    client_name = user.client.name if user.client else None
    return TokenResponse(
        token=create_token(user.username),
        username=user.username,
        role=user.role,
        client_id=user.client_id,
        client_name=client_name,
    )


@router.post("/auth/signup")
@limiter.limit("1/minute")
def signup(req: SignupRequest, request: Request, db=Depends(get_db)):
    """Create a new account with 14-day trial."""
    if db.query(User).filter(User.username == req.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(Client).filter(Client.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="My Organization", slug="default")
        db.add(org)
        db.flush()
    
    client = Client(
        name=req.name or req.email.split("@")[0],
        email=req.email,
        company=req.company or "",
        org_id=org.id,
    )
    db.add(client)
    db.flush()
    
    user = User(
        username=req.email,
        password_hash=pwd_ctx.hash(req.password),
        client_id=client.id,
        role="member",
    )
    db.add(user)
    db.flush()
    
    # Create trial subscription
    trial_end = datetime.datetime.utcnow() + datetime.timedelta(days=TRIAL_DAYS)
    sub = Subscription(
        client_id=client.id,
        tier=SubscriptionTier.free,
        status=SubscriptionStatus.trialing,
        trial_end=trial_end,
    )
    db.add(sub)
    
    # ── Affiliate: Handle referral code ──
    if req.referral_code:
        affiliate = db.query(AffiliateCode).filter(AffiliateCode.code == req.referral_code).first()
        if affiliate:
            # Link the referred client
            affiliate.total_referrals += 1
            # We'll create commissions when they actually pay (on invoice.paid webhook)
            # Store referral info for later use
            logger.info(f"Referral used: code={req.referral_code}, referred_client_id={client.id}, affiliate_client_id={affiliate.client_id}")
    
    db.commit()
    
    token = create_token(user.username)
    client_name = client.name
    logger.info(f"New signup: {req.email} (trial until {trial_end.isoformat()})")
    
    return TokenResponse(
        token=token,
        username=user.username,
        role=user.role,
        client_id=user.client_id,
        client_name=client_name,
    )



@router.get("/auth/check")
def check_auth(user=Depends(get_current_user)):
    client_name = user.client.name if user.client else None
    return {
        "ok": True, "username": user.username, "role": user.role,
        "client_id": user.client_id, "client_name": client_name,
    }


@router.get("/auth/me")
def auth_me(user=Depends(get_current_user)):
    """Return current user info including onboarding status."""
    return {"onboarding_completed": getattr(user, "onboarding_completed", False)}

@router.post("/auth/change-password")
@limiter.limit("3/minute")
def change_password(req: ChangePasswordRequest, request: Request, user=Depends(get_current_user), db=Depends(get_db)):
    if not pwd_ctx.verify(req.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user.password_hash = pwd_ctx.hash(req.new_password)
    db.commit()
    return {"ok": True}





# ── User Profile ──

@router.get("/profile", response_model=ProfileResponse)
def get_profile(user=Depends(get_current_user), db=Depends(get_db)):
    client = db.query(Client).filter(Client.id == user.client_id).first() if user.client_id else None
    return ProfileResponse(
        username=user.username,
        email=client.email if client else "",
        role=user.role or "",
        email_verified=client.is_active if client else False,
        client_id=user.client_id,
        client_name=client.name if client else None,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        company=user.company,
        phone=user.phone,
        address_line1=user.address_line1,
        address_line2=user.address_line2,
        city=user.city,
        state=user.state,
        postal_code=user.postal_code,
        country=user.country,
        onboarding_completed=getattr(user, "onboarding_completed", False),
    )


@router.put("/profile")
def update_profile(data: ProfileUpdate, user=Depends(get_current_user), db=Depends(get_db)):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    return {"ok": True}


# ── Google OAuth Login ──
import requests as _requests
import secrets as _secrets
import urllib.parse as _urlparse

# Load Google OAuth config from .env (already loaded into environment)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID") or ""
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET") or ""
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI") or ""


@router.get("/auth/google/config")
def google_auth_config():
    """Check if Google OAuth is configured."""
    configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    return {"configured": configured, "client_id": GOOGLE_CLIENT_ID if configured else ""}


@router.get("/auth/google/login")
def google_login_start():
    """Redirect user to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(500, "Google OAuth not configured")
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + _urlparse.urlencode(params)
    return RedirectResponse(url=url)


@router.get("/auth/google/callback")
def google_callback(code: str = "", error: str = "", db=Depends(get_db)):
    """Handle Google OAuth callback."""
    if error:
        # User denied or error occurred — redirect back to app
        return RedirectResponse(url="https://app.socialpulses.io/?auth_error=" + _urlparse.quote(error))
    
    if not code:
        raise HTTPException(400, "Missing authorization code")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(500, "Google OAuth not configured")
    
    try:
        # 1. Exchange authorization code for tokens
        token_resp = _requests.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }, timeout=10)
        token_data = token_resp.json()
        
        if "error" in token_data:
            logger.error(f"Google token exchange error: {token_data}")
            err_msg = _urlparse.quote("Google login failed - OAuth app may have expired in Testing mode. Go to console.cloud.google.com, APIs, Credentials, OAuth consent screen. Publish the app or add your email as a test user.")
            return RedirectResponse(url="https://app.socialpulses.io/?auth_error=" + err_msg)
        
        access_token = token_data.get("access_token", "")
        id_token = token_data.get("id_token", "")
        
        # 2. Get user info from Google
        userinfo_resp = _requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        userinfo = userinfo_resp.json()
        
        if "error" in userinfo:
            logger.error(f"Google userinfo error: {userinfo}")
            return RedirectResponse(url="https://app.socialpulses.io/?auth_error=userinfo_failed")
        
        google_email = userinfo.get("email", "")
        google_name = userinfo.get("name", google_email.split("@")[0])
        
        if not google_email:
            return RedirectResponse(url="https://app.socialpulses.io/?auth_error=no_email")
        
        # 3. Find or create user
        username = google_email  # Use email as username
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            # Create new client + user
            org = db.query(Organization).first()
            client = Client(
                name=google_name,
                email=google_email,
                org_id=org.id if org else None,
            )
            db.add(client)
            db.flush()
            
            random_hash = pwd_ctx.hash(_secrets.token_hex(16))
            user = User(
                username=username,
                password_hash=random_hash,
                client_id=client.id,
                role="member",
            )
            db.add(user)
            db.flush()
            
            # Create trial subscription for new Google users
            trial_end = datetime.datetime.utcnow() + datetime.timedelta(days=TRIAL_DAYS)
            trial_sub = Subscription(
                client_id=client.id,
                tier=SubscriptionTier.free,
                status=SubscriptionStatus.trialing,
                trial_end=trial_end,
            )
            db.add(trial_sub)
            db.commit()
            db.refresh(user)
            logger.info(f"New Google user created: {username} (trial until {trial_end.isoformat()})")
        else:
            logger.info(f"Google user logged in: {username}")
        
        # 4. Generate JWT and redirect to app
        token = create_token(username)
        client_name = user.client.name if user.client else ""
        
        # URL-encode params to be safe
        redirect_params = _urlparse.urlencode({
            "token": token,
            "username": username,
            "role": user.role,
            "client_id": str(user.client_id or ""),
            "client_name": client_name,
        })
        
        frontend_url = "https://app.socialpulses.io"
        return RedirectResponse(url=f"{frontend_url}?token={token}&{redirect_params}")
        
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return RedirectResponse(url="https://app.socialpulses.io/?auth_error=server_error")
