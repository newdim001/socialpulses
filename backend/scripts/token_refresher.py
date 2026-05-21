"""Daily token refresher for SocialPulses - auto-refresh tokens nearing expiry."""
import os, sys, json, requests
from datetime import datetime, timedelta, timezone

import base64

sys.path.insert(0, '/var/www/socialpulses/backend')
os.chdir('/var/www/socialpulses/backend')

# Load env
import dotenv
dotenv.load_dotenv('/var/www/socialpulses/backend/.env')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL:
    # Parse from .env
    with open('/var/www/socialpulses/backend/.env') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                DATABASE_URL = line.split('=', 1)[1].strip()
                break

engine = create_engine(DATABASE_URL)

def refresh_google(platform, cid_key, cs_key, refresh_token):
    """Refresh Google/YouTube token."""
    data = {
        'client_id': os.environ.get(cid_key),
        'client_secret': os.environ.get(cs_key),
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }
    resp = requests.post('https://oauth2.googleapis.com/token', data=data, timeout=10)
    resp.raise_for_status()
    r = resp.json()
    return r.get('access_token', ''), r.get('refresh_token', refresh_token), datetime.now(timezone.utc) + timedelta(seconds=r.get('expires_in', 3600))

def refresh_twitter(refresh_token):
    """Refresh Twitter/X token."""
    cid = os.environ.get('TWITTER_CLIENT_ID')
    cs = os.environ.get('TWITTER_CLIENT_SECRET')
    basic = base64.b64encode(f"{cid}:{cs}".encode()).decode()
    data = {'refresh_token': refresh_token, 'grant_type': 'refresh_token', 'client_id': cid}
    resp = requests.post(
        'https://api.twitter.com/2/oauth2/token',
        data=data, headers={'Authorization': f'Basic {basic}', 'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=10
    )
    resp.raise_for_status()
    r = resp.json()
    return r.get('access_token', ''), r.get('refresh_token', refresh_token), datetime.now(timezone.utc) + timedelta(seconds=r.get('expires_in', 7200))

def refresh_pinterest(refresh_token):
    """Refresh Pinterest token."""
    cid = os.environ.get('PINTEREST_CLIENT_ID')
    cs = os.environ.get('PINTEREST_CLIENT_SECRET')
    basic = base64.b64encode(f"{cid}:{cs}".encode()).decode()
    data = {'grant_type': 'refresh_token', 'refresh_token': refresh_token}
    resp = requests.post(
        'https://api.pinterest.com/v5/oauth/token',
        data=data, headers={'Authorization': f'Basic {basic}', 'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=10
    )
    resp.raise_for_status()
    r = resp.json()
    return r.get('access_token', ''), r.get('refresh_token', refresh_token), datetime.now(timezone.utc) + timedelta(days=30)

def extend_facebook_token(access_token):
    """Extend Facebook Page access token (60-day long-lived)."""
    app_id = os.environ.get('FACEBOOK_CLIENT_ID')
    app_secret = os.environ.get('FACEBOOK_CLIENT_SECRET')
    resp = requests.get(
        f'https://graph.facebook.com/v20.0/oauth/access_token',
        params={
            'grant_type': 'fb_exchange_token',
            'client_id': app_id,
            'client_secret': app_secret,
            'fb_exchange_token': access_token
        },
        timeout=10
    )
    resp.raise_for_status()
    r = resp.json()
    new_token = r.get('access_token', access_token)
    expires_in = r.get('expires_in', 5184000)  # 60 days
    return new_token, datetime.now(timezone.utc) + timedelta(seconds=expires_in)

results = []

with Session(engine) as db:
    accounts = db.execute(text("""
        SELECT sa.id, sp.name, sa.access_token, sa.refresh_token, sa.token_expires_at
        FROM social_accounts sa
        JOIN social_platforms sp ON sa.platform_id = sp.id
        WHERE sa.is_active = true
        ORDER BY sa.id
    """)).fetchall()

    now = datetime.now(timezone.utc)
    for acc in accounts:
        need_refresh = False
        if acc.token_expires_at:
            t = acc.token_expires_at
            if t.tzinfo is None:
                t = t.replace(tzinfo=timezone.utc)
            # Refresh if expiring within 7 days
            if t < now + timedelta(days=7):
                need_refresh = True
        
        # Also refresh if already expired
        if acc.token_expires_at and acc.token_expires_at < now:
            need_refresh = True

        if not need_refresh:
            results.append(f"[{acc.id}] {acc.name} - OK (expires {acc.token_expires_at})")
            continue

        try:
            if acc.name == 'youtube' and acc.refresh_token:
                new_token, new_refresh, new_expiry = refresh_google(acc.name, 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', acc.refresh_token)
                db.execute(text("UPDATE social_accounts SET access_token=:token, refresh_token=:refresh, token_expires_at=NULL WHERE id=:id"),
                          {'token': new_token, 'refresh': new_refresh, 'id': acc.id})
                results.append(f"[{acc.id}] {acc.name} - ✅ Refreshed (null expiry)")
            
            elif acc.name == 'twitter' and acc.refresh_token:
                new_token, new_refresh, new_expiry = refresh_twitter(acc.refresh_token)
                db.execute(text("UPDATE social_accounts SET access_token=:token, refresh_token=:refresh, token_expires_at=NULL WHERE id=:id"),
                          {'token': new_token, 'refresh': new_refresh, 'id': acc.id})
                results.append(f"[{acc.id}] {acc.name} - ✅ Refreshed (null expiry)")
            
            elif acc.name == 'pinterest' and acc.refresh_token:
                new_token, new_refresh, new_expiry = refresh_pinterest(acc.refresh_token)
                db.execute(text("UPDATE social_accounts SET access_token=:token, refresh_token=:refresh, token_expires_at=:expiry WHERE id=:id"),
                          {'token': new_token, 'refresh': new_refresh, 'expiry': new_expiry, 'id': acc.id})
                results.append(f"[{acc.id}] {acc.name} - ✅ Refreshed (expires {new_expiry})")
            
            elif acc.name == 'facebook' or acc.name == 'instagram':
                new_token, new_expiry = extend_facebook_token(acc.access_token)
                db.execute(text("UPDATE social_accounts SET access_token=:token, token_expires_at=:expiry WHERE id=:id"),
                          {'token': new_token, 'expiry': new_expiry, 'id': acc.id})
                results.append(f"[{acc.id}] {acc.name} - ✅ Extended (expires {new_expiry})")
            
            db.commit()
        except Exception as e:
            db.rollback()
            results.append(f"[{acc.id}] {acc.name} - ❌ Failed: {e}")

print("=== Token Refresh Report ===")
for r in results:
    print(r)
