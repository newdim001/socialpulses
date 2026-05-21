from __future__ import annotations
import datetime
import json
import logging
import os
import threading
import time
import requests

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, PostStatus, SocialAccount, SocialPlatform, TrendingTopic

logger = logging.getLogger("trending_scanner")

AI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
AI_API_URL = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions")
AI_MODEL = os.environ.get("AI_MODEL", "deepseek-chat")


class TrendingScanner:
    """Background worker that scans published posts for trending keywords/themes."""

    def __init__(self, interval_seconds: int = 3600):
        self.interval = interval_seconds
        self._running = False
        self._thread = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("TrendingScanner started (checking every %ds)", self.interval)

    def stop(self):
        self._running = False
        logger.info("TrendingScanner stopped")

    def _loop(self):
        while self._running:
            try:
                self._do_scan()
            except Exception as e:
                logger.error("TrendingScanner error: %s", e)
            time.sleep(self.interval)

    def _do_scan(self):
        db = SessionLocal()
        try:
            cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
            active_accounts = db.query(SocialAccount.client_id).filter(
                SocialAccount.is_active == True
            ).distinct().all()
            client_ids = {c[0] for c in active_accounts}
            for client_id in client_ids:
                self._scan_client(db, client_id, cutoff)
        finally:
            db.close()

    def _scan_client(self, db: Session, client_id: int, cutoff: datetime.datetime):
        posts = (
            db.query(Post)
            .filter(
                Post.client_id == client_id,
                Post.status == PostStatus.published,
                Post.published_at >= cutoff,
            )
            .order_by(Post.published_at.desc())
            .limit(100)
            .all()
        )

        if not posts:
            return

        contents = []
        for p in posts:
            preview = (p.content or "")[:500]
            if preview.strip():
                contents.append(preview)

        if not contents:
            return

        prompt = """Analyze the following social media posts and extract up to 10 trending keywords or themes that appear frequently. For each keyword/theme, estimate how many posts it appears in (frequency count).

Return ONLY a valid JSON array of objects with fields: "keyword" (string) and "frequency" (integer). No markdown, no explanation.

Posts:
""" + "\n".join(f"- {c}" for c in contents[:50])

        if not AI_API_KEY:
            logger.warning("AI not configured -- skipping trending scan for client %d", client_id)
            return

        try:
            resp = requests.post(
                AI_API_URL,
                headers={
                    "Authorization": "Bearer " + AI_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "model": AI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.3,
                },
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            text = result["choices"][0]["message"]["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                if "```" in text:
                    text = text.split("```")[0]
            text = text.strip()
            keywords = json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI response for client %d: %s", client_id, text[:200])
            return
        except Exception as e:
            logger.error("AI scan failed for client %d: %s", client_id, e)
            return

        now = datetime.datetime.utcnow()
        for kw in keywords:
            keyword = kw.get("keyword", "").strip()
            frequency = kw.get("frequency", 1)
            if not keyword:
                continue

            existing = (
                db.query(TrendingTopic)
                .filter(
                    TrendingTopic.client_id == client_id,
                    TrendingTopic.keyword == keyword,
                    TrendingTopic.is_active == True,
                )
                .first()
            )

            if existing:
                existing.frequency = frequency
                existing.last_seen = now
            else:
                topic = TrendingTopic(
                    client_id=client_id,
                    keyword=keyword,
                    source="ai",
                    frequency=frequency,
                    last_seen=now,
                    first_detected=now,
                )
                db.add(topic)

        db.commit()
        logger.info("Trending scan complete for client %d", client_id)

    def scan_now(self, db: Session, client_id: int) -> dict:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        self._scan_client(db, client_id, cutoff)

        topics = (
            db.query(TrendingTopic)
            .filter(
                TrendingTopic.client_id == client_id,
                TrendingTopic.is_active == True,
            )
            .order_by(TrendingTopic.frequency.desc())
            .limit(20)
            .all()
        )
        return {
            "topics_created": len(topics),
            "topics": [
                {
                    "id": t.id,
                    "keyword": t.keyword,
                    "frequency": t.frequency,
                    "source": t.source,
                    "last_seen": t.last_seen.isoformat() if t.last_seen else None,
                    "first_detected": t.first_detected.isoformat() if t.first_detected else None,
                    "is_acknowledged": t.is_acknowledged,
                }
                for t in topics
            ],
        }
