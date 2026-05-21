#!/usr/bin/env python3
"""SocialPulses MCP Server — exposes tools for AI agents.

Usage:
  export SOCIALPULSES_API_KEY=sp_xxx...
  python mcp_server.py              # runs on stdio (for Claude Code CLI)
  python mcp_server.py --sse        # runs on HTTP (for Hermes/ChatGPT)

For Hermes Agent, add to config:
  hermes config set mcp_servers.socialpulses.command "python3 /path/to/mcp_server.py"
  hermes config set mcp_servers.socialpulses.env.SOCIALPULSES_API_KEY "sp_xxx..."
"""

import os
import sys
import datetime
import hashlib
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("socialpulses-mcp")

# Load .env file before DB setup
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.isfile(_env_path):
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                if _k.strip() not in os.environ:
                    os.environ[_k.strip()] = _v.strip()

# ── DB setup ──
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from models import (
    Post, PostAccount, PostStatus,
    SocialAccount, SocialPlatform,
    Media, ApiKey,
)
from sqlalchemy.orm import Session

API_KEY = os.environ.get("SOCIALPULSES_API_KEY", "")

def get_db() -> Session:
    return SessionLocal()


def verify_api_key() -> int:
    """Verify the API key and return client_id."""
    if not API_KEY:
        raise ValueError("SOCIALPULSES_API_KEY environment variable not set. Get your API key from Settings > API Keys.")
    key_hash = hashlib.sha256(API_KEY.encode()).hexdigest()
    db = get_db()
    try:
        key = db.query(ApiKey).filter(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,
        ).first()
        if not key:
            raise ValueError("Invalid or inactive API key")
        key.last_used_at = datetime.datetime.utcnow()
        db.commit()
        return key.client_id
    finally:
        db.close()


# ── Import MCP SDK (installed from pip) ──
try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    print("MCP SDK not installed. Run: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Set port via env var or default
MCP_PORT = int(os.environ.get("MCP_PORT", "8099"))
MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
mcp = FastMCP("SocialPulses", instructions="Social media management via SocialPulses. Manage posts, accounts, and analytics.",
              port=MCP_PORT, host=MCP_HOST)

CLIENT_ID_CACHE = [None]  # mutable holder


# ── Tool: List Posts ──
@mcp.tool()
def post_list(status: str = "", limit: int = 20) -> str:
    """List posts. Optionally filter by status (draft|scheduled|published|failed)."""
    client_id = verify_api_key()
    db = get_db()
    try:
        q = db.query(Post).filter(Post.client_id == client_id)
        if status:
            try:
                st = PostStatus(status)
                q = q.filter(Post.status == st)
            except ValueError:
                return f"Invalid status: {status}. Valid: draft, scheduled, published, failed, cancelled"
        q = q.order_by(Post.created_at.desc()).limit(limit)
        posts = q.all()
        results = []
        for p in posts:
            results.append({
                "id": p.id, "content": (p.content or "")[:200],
                "status": p.status.value if p.status else "unknown",
                "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            })
        return json.dumps(results, indent=2)
    finally:
        db.close()


# ── Tool: Create Post ──
@mcp.tool()
def post_create(content: str, scheduled_at: str = "", account_ids: str = "") -> str:
    """Create and optionally schedule a post.
    
    Args:
        content: The post text/content
        scheduled_at: ISO 8601 datetime string (e.g. "2026-05-18T10:00:00Z"). Leave empty for draft.
        account_ids: Comma-separated list of social account IDs to post to.
    """
    client_id = verify_api_key()
    db = get_db()
    try:
        scheduled = None
        status = PostStatus.draft
        if scheduled_at:
            try:
                dt_str = scheduled_at.replace("Z", "+00:00")
                scheduled = datetime.datetime.fromisoformat(dt_str)
                status = PostStatus.scheduled
            except ValueError:
                return f"Invalid scheduled_at format. Use ISO 8601 (e.g. 2026-05-18T10:00:00Z)"
        post = Post(client_id=client_id, content=content, scheduled_at=scheduled, status=status)
        db.add(post)
        db.flush()
        if account_ids:
            for aid_str in account_ids.split(","):
                aid = int(aid_str.strip())
                acct = db.query(SocialAccount).filter(
                    SocialAccount.id == aid, SocialAccount.client_id == client_id
                ).first()
                if acct:
                    db.add(PostAccount(post_id=post.id, social_account_id=acct.id, status="pending"))
        db.commit()
        db.refresh(post)
        return json.dumps({
            "id": post.id, "content": post.content, "status": post.status.value,
            "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
        }, indent=2)
    finally:
        db.close()


# ── Tool: Delete Post ──
@mcp.tool()
def post_delete(post_id: int) -> str:
    """Delete a post by ID."""
    client_id = verify_api_key()
    db = get_db()
    try:
        post = db.query(Post).filter(Post.id == post_id, Post.client_id == client_id).first()
        if not post:
            return f"Post {post_id} not found"
        db.delete(post)
        db.commit()
        return f"Post {post_id} deleted"
    finally:
        db.close()


# ── Tool: Publish Post ──
@mcp.tool()
def post_publish(post_id: int) -> str:
    """Publish a draft or scheduled post immediately."""
    client_id = verify_api_key()
    db = get_db()
    try:
        post = db.query(Post).filter(Post.id == post_id, Post.client_id == client_id).first()
        if not post:
            return f"Post {post_id} not found"
        if post.status not in (PostStatus.draft, PostStatus.scheduled):
            return f"Post must be draft or scheduled (current: {post.status.value})"
        post.scheduled_at = datetime.datetime.utcnow()
        post.status = PostStatus.scheduled
        db.commit()
        # Use publisher
        try:
            from publisher import Publisher
            p = Publisher()
            p._publish_post(db, post)
        except Exception as e:
            return f"Publish attempt failed: {e}"
        return json.dumps({
            "id": post.id, "status": post.status.value,
            "published_at": post.published_at.isoformat() if post.published_at else None,
        }, indent=2)
    finally:
        db.close()


# ── Tool: List Accounts ──
@mcp.tool()
def account_list() -> str:
    """List all connected social media accounts."""
    client_id = verify_api_key()
    db = get_db()
    try:
        accounts = db.query(SocialAccount).filter(
            SocialAccount.client_id == client_id,
            SocialAccount.is_active == True,
        ).all()
        results = []
        for a in accounts:
            platform = db.query(SocialPlatform).get(a.platform_id)
            results.append({
                "id": a.id,
                "platform": platform.name.value if platform else "unknown",
                "username": a.platform_username,
                "display_name": a.display_name,
            })
        return json.dumps(results, indent=2)
    finally:
        db.close()


# ── Tool: Analytics Summary ──
@mcp.tool()
def analytics_summary() -> str:
    """Get analytics summary (total posts, published, scheduled, drafts, connected accounts)."""
    client_id = verify_api_key()
    db = get_db()
    try:
        total = db.query(Post).filter(Post.client_id == client_id).count()
        published = db.query(Post).filter(Post.client_id == client_id, Post.status == PostStatus.published).count()
        scheduled = db.query(Post).filter(Post.client_id == client_id, Post.status == PostStatus.scheduled).count()
        drafts = db.query(Post).filter(Post.client_id == client_id, Post.status == PostStatus.draft).count()
        accounts = db.query(SocialAccount).filter(SocialAccount.client_id == client_id, SocialAccount.is_active == True).count()
        return json.dumps({
            "total_posts": total, "published": published,
            "scheduled": scheduled, "drafts": drafts,
            "connected_accounts": accounts,
        }, indent=2)
    finally:
        db.close()


# ── Tool: Generate Content with AI ──
@mcp.tool()
def ai_generate(topic: str, tone: str = "professional", platform: str = "twitter", length: str = "medium") -> str:
    """Generate social media post content using DeepSeek AI.
    
    Args:
        topic: The topic/subject to write about
        tone: Writing tone (professional, casual, humorous, inspirational)
        platform: Target platform (twitter, linkedin, instagram, facebook)
        length: Content length (short, medium, long)
    """
    verify_api_key()
    import requests
    ai_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    if not ai_key:
        return "AI not configured. Set DEEPSEEK_API_KEY or OPENAI_API_KEY in .env"
    ai_url = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions")
    ai_model = os.environ.get("AI_MODEL", "deepseek-chat")
    
    platform_info = {
        "twitter": "X/Twitter - concise, max 280 chars, hashtags ok",
        "linkedin": "LinkedIn - professional, thought-leadership, 2-3 paragraphs",
        "instagram": "Instagram - visual, casual, emojis welcome, 3-5 lines with hashtags",
        "facebook": "Facebook - conversational, 2-4 sentences encouraging discussion",
    }
    guide = platform_info.get(platform, "Social media post")
    
    prompt = f"Write a {tone} post for {guide} about: {topic}. Keep it to {length} length."
    
    try:
        resp = requests.post(ai_url, json={
            "model": ai_model, "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500, "temperature": 0.7,
        }, headers={"Authorization": f"Bearer {ai_key}"}, timeout=30)
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        return f"AI error: {resp.status_code} {resp.text[:200]}"
    except Exception as e:
        return f"AI request failed: {e}"


# ── Run ──
if __name__ == "__main__":
    if "--sse" in sys.argv:
        logger.info("Starting SocialPulses MCP server on SSE transport (port 8099)")
        import uvicorn
        # Port/host set in FastMCP constructor
        mcp.run(transport="sse")
    else:
        logger.info("Starting SocialPulses MCP server on stdio transport")
        mcp.run(transport="stdio")
