#!/usr/bin/env python3
"""Webhook dispatch utilities for SocialPulses."""

import json
import time
import hashlib
import hmac
import datetime
import logging
import httpx
from sqlalchemy.orm import Session

logger = logging.getLogger("webhooks")


def dispatch_webhook(event_type: str, client_id: int, payload: dict, db: Session):
    """Fire a webhook to all matching subscriptions for a client."""
    # Lazy import to avoid circular deps
    from models import WebhookSubscription, WebhookDelivery

    subs = db.query(WebhookSubscription).filter(
        WebhookSubscription.client_id == client_id,
        WebhookSubscription.is_active == True,
    ).all()
    for sub in subs:
        if sub.event_types != "*" and event_type not in sub.event_types.split(","):
            continue
        try:
            start = time.time()
            body = json.dumps({"event": event_type, "data": payload}, default=str).encode()
            headers = {"Content-Type": "application/json"}
            if sub.secret:
                sig = hmac.new(sub.secret.encode(), body, hashlib.sha256).hexdigest()
                headers["X-SocialPulses-Signature"] = sig
            resp = httpx.post(sub.url, content=body, headers=headers, timeout=sub.timeout_seconds or 10)
            duration_ms = int((time.time() - start) * 1000)
            delivery = WebhookDelivery(
                subscription_id=sub.id, event_type=event_type,
                status="success" if resp.is_success else "failed",
                status_code=resp.status_code,
                response_body=resp.text[:1000],
                duration_ms=duration_ms,
            )
            db.add(delivery)
            db.commit()
        except Exception as e:
            logger.warning("Webhook delivery failed: %s", e)
            try:
                delivery = WebhookDelivery(
                    subscription_id=sub.id, event_type=event_type,
                    status="failed", response_body=str(e)[:1000],
                )
                db.add(delivery)
                db.commit()
            except Exception:
                pass


def fire_post_webhooks(event_type: str, post_id: int, client_id: int, db: Session):
    """Fire webhooks for a post event. Fetches the post and builds payload."""
    from models import Post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return
    payload = {
        "id": post.id,
        "content": post.content,
        "status": post.status.value if post.status else "unknown",
        "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }
    dispatch_webhook(event_type, client_id, payload, db)
