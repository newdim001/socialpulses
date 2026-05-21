"""Dashboard and Calendar routes."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, Date
from database import get_db
from auth import get_current_user
from models import Post, PostAccount, PostStatus, SocialAccount, SocialPlatform, User
from schemas import DashboardStats
import logging, datetime
logger = logging.getLogger("dash_routes")
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ── Dashboard ──

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(user=Depends(get_current_user), db=Depends(get_db)):
    now = datetime.datetime.utcnow()
    # Single GROUP BY query for status counts instead of 5 separate queries
    status_rows = db.query(Post.status, func.count(Post.id)).filter(
        Post.client_id == user.client_id
    ).group_by(Post.status).all()
    status_map = dict(status_rows)
    scheduled = status_map.get(PostStatus.scheduled, 0)
    published = status_map.get(PostStatus.published, 0)
    failed = status_map.get(PostStatus.failed, 0)
    drafts = status_map.get(PostStatus.draft, 0)

    accounts = db.query(SocialAccount).filter(
        SocialAccount.client_id == user.client_id, SocialAccount.is_active == True).count()
    upcoming = db.query(Post).options(
        joinedload(Post.post_accounts), joinedload(Post.media)
    ).filter(
        Post.client_id == user.client_id, Post.scheduled_at >= now,
        Post.status == PostStatus.scheduled,
    ).order_by(Post.scheduled_at.asc()).limit(5).all()
    return DashboardStats(
        total_scheduled=scheduled, total_published=published,
        total_failed=failed, total_drafts=drafts, total_accounts=accounts,
        upcoming_posts=_hydrate_posts(upcoming, db),
    )



# ── Calendar ──

@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(year: int, month: int, user=Depends(get_current_user), db=Depends(get_db)):
    posts = db.query(Post).filter(
        Post.client_id == user.client_id,
        extract("year", Post.scheduled_at) == year,
        extract("month", Post.scheduled_at) == month,
    ).order_by(Post.scheduled_at.asc()).all()
    days = {}
    for p in posts:
        if p.scheduled_at:
            key = p.scheduled_at.strftime("%Y-%m-%d")
            if key not in days:
                days[key] = CalendarDay(date=key, posts=[])
            days[key].posts.append(_hydrate_posts([p], db)[0])
    return CalendarResponse(year=year, month=month, days=list(days.values()))

# Part 4
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")


@router.post("/telegram/webhook")
async def telegram_webhook(body: dict, db=Depends(get_db)):
    cb = body.get("callback_query")
    if not cb:
        return {"ok": True}
    data = cb.get("data", "")
    if data.startswith("approve_"):
        pid = int(data.replace("approve_", ""))
        p = db.query(Post).get(pid)
        if p:
            p.status = PostStatus.scheduled if p.scheduled_at else PostStatus.draft
            db.commit()
    elif data.startswith("reject_"):
        pid = int(data.replace("reject_", ""))
        p = db.query(Post).get(pid)
        if p:
            p.status = PostStatus.cancelled
            db.commit()
    return {"ok": True}


@router.post("/webhooks/tiktok")
async def tiktok_webhook(payload: dict):
    """Receive TikTok video publish status webhooks."""
    logger = logging.getLogger("socialpulses.webhooks.tiktok")
    logger.info(f"TikTok webhook received: {payload}")
    return {"status": "ok"}




@router.post("/telegram/send-approval")
def send_approval(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(400, "Telegram bot not configured")
    post.status = PostStatus.pending_approval
    db.commit()
    platform_names = []
    for pa in post.post_accounts:
        acct = db.query(SocialAccount).get(pa.social_account_id)
        plat = db.query(SocialPlatform).get(acct.platform_id) if acct else None
        if plat:
            platform_names.append((plat.icon or "") + " " + plat.display_name)
    msg = "📝 **New Post Pending Approval**\n\n**Content:** " + (post.content or "(no text)")
    msg += "\n**Platforms:** " + (", ".join(platform_names) or "None")
    msg += "\n**Schedule:** " + (post.scheduled_at.strftime("%Y-%m-%d %H:%M UTC") if post.scheduled_at else "Not scheduled")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if chat_id and TELEGRAM_BOT_TOKEN:
        _send_telegram_buttons(chat_id, msg, post.id)
    return {"ok": True}


import requests as _requests
def _send_telegram_buttons(chat_id, text, post_id):
    url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage"
    payload = {
        "chat_id": chat_id, "text": text, "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[
                {"text": "✅ Approve", "callback_data": "approve_" + str(post_id)},
                {"text": "❌ Reject", "callback_data": "reject_" + str(post_id)},
            ]]
        },
    }
    try:
        _requests.post(url, json=payload, timeout=5)
    except Exception:
        pass


# Publisher
publisher_instance = None
# Trending Scanner
trending_scanner_instance = None
# Auto-Reply Worker
auto_reply_worker_instance = None


@router.post("/publisher/start")
def start_publisher(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global publisher_instance, trending_scanner_instance, auto_reply_worker_instance
    if publisher_instance is None:
        from publisher import Publisher
        publisher_instance = Publisher()
        publisher_instance.start()
    return {"ok": True}


@router.post("/publisher/stop")
def stop_publisher(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global publisher_instance, trending_scanner_instance, auto_reply_worker_instance
    if publisher_instance:
        publisher_instance.stop()
        publisher_instance = None
    return {"ok": True}


@router.get("/publisher/status")
def publisher_status(user=Depends(get_current_user)):
    return {"running": publisher_instance is not None}


@router.post("/trending-scanner/start")
def start_trending_scanner(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global trending_scanner_instance
    if trending_scanner_instance is None:
        from trending_worker import TrendingScanner
        trending_scanner_instance = TrendingScanner()
        trending_scanner_instance.start()
    return {"ok": True}


@router.post("/trending-scanner/stop")
def stop_trending_scanner(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global trending_scanner_instance
    if trending_scanner_instance:
        trending_scanner_instance.stop()
        trending_scanner_instance = None
    return {"ok": True}


@router.get("/trending-scanner/status")
def trending_scanner_status(user=Depends(get_current_user)):
    return {"running": trending_scanner_instance is not None}


@router.post("/auto-reply-worker/start")
def start_auto_reply_worker(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global auto_reply_worker_instance
    if auto_reply_worker_instance is None:
        from auto_reply_worker import AutoReplyWorker
        auto_reply_worker_instance = AutoReplyWorker()
        auto_reply_worker_instance.start()
    return {"ok": True}


@router.post("/auto-reply-worker/stop")
def stop_auto_reply_worker(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    global auto_reply_worker_instance
    if auto_reply_worker_instance:
        auto_reply_worker_instance.stop()
        auto_reply_worker_instance = None
    return {"ok": True}


@router.get("/auto-reply-worker/status")
def auto_reply_worker_status(user=Depends(get_current_user)):
    return {"running": auto_reply_worker_instance is not None}


@router.get("/settings")
def get_settings(user=Depends(get_current_user), db=Depends(get_db)):
    return {
        "twitter_configured": check_platform_configured("twitter", db),
        "linkedin_configured": check_platform_configured("linkedin", db),
        "instagram_configured": check_platform_configured("instagram", db),
        "facebook_configured": check_platform_configured("facebook", db),
        "tiktok_configured": check_platform_configured("tiktok", db),
        "youtube_configured": check_platform_configured("youtube", db),
        "telegram_configured": check_platform_configured("telegram", db),
        "pinterest_configured": check_platform_configured("pinterest", db),
        "threads_configured": check_platform_configured("threads", db),
        "bluesky_configured": check_platform_configured("bluesky", db),
        "google_business_configured": check_platform_configured("google_business", db),
        "mastodon_configured": check_platform_configured("mastodon", db),
        "client_id": user.client_id,
        "client_name": user.client.name if user.client else None,
    }


@router.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@router.on_event("startup")
def on_startup():
    seed_data()



