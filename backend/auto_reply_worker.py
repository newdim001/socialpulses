from __future__ import annotations
import datetime
import logging
import os
import threading
import time
import requests

from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    AutoReplyRule, AutoReplyLog, InboxConversation, InboxMessage,
    SocialAccount, SocialPlatform,
)

logger = logging.getLogger("auto_reply_worker")

AI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
AI_API_URL = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions")
AI_MODEL = os.environ.get("AI_MODEL", "deepseek-chat")


class AutoReplyWorker:
    """Background worker that checks inbox messages against AutoReplyRules and generates AI replies."""

    def __init__(self, interval_seconds: int = 30):
        self.interval = interval_seconds
        self._running = False
        self._thread = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("AutoReplyWorker started (checking every %ds)", self.interval)

    def stop(self):
        self._running = False
        logger.info("AutoReplyWorker stopped")

    def _loop(self):
        while self._running:
            try:
                self._do_work()
            except Exception as e:
                logger.error("AutoReplyWorker error: %s", e)
            time.sleep(self.interval)

    def _do_work(self):
        db = SessionLocal()
        try:
            rules = db.query(AutoReplyRule).filter(AutoReplyRule.is_active == True).all()
            if not rules:
                return

            for rule in rules:
                self._process_rule(db, rule)
        finally:
            db.close()

    def _process_rule(self, db: Session, rule: AutoReplyRule):
        """Check inbox for messages matching a rule and act."""
        query = db.query(InboxConversation).filter(
            InboxConversation.client_id == rule.client_id,
            InboxConversation.is_archived == False,
        )
        if rule.platform:
            query = query.filter(InboxConversation.platform == rule.platform)

        conversations = query.order_by(InboxConversation.last_message_at.desc()).limit(50).all()

        for conv in conversations:
            # Get latest unread incoming message
            last_unread = (
                db.query(InboxMessage)
                .filter(
                    InboxMessage.conversation_id == conv.id,
                    InboxMessage.direction == "incoming",
                    InboxMessage.is_read == False,
                )
                .order_by(InboxMessage.created_at.desc())
                .first()
            )
            if not last_unread:
                continue

            content = last_unread.content or ""
            if not content.strip():
                continue

            # Check if this rule matches
            keywords = [k.strip().lower() for k in (rule.trigger_keywords or "").split(",") if k.strip()]
            if not keywords:
                continue

            matched = False
            matched_keyword = None
            content_lower = content.lower()

            for kw in keywords:
                if rule.match_type == "contains":
                    if kw in content_lower:
                        matched = True
                        matched_keyword = kw
                        break
                elif rule.match_type == "exact":
                    if content_lower.strip() == kw:
                        matched = True
                        matched_keyword = kw
                        break
                elif rule.match_type == "starts_with":
                    if content_lower.startswith(kw):
                        matched = True
                        matched_keyword = kw
                        break
                elif rule.match_type == "regex":
                    import re
                    if re.search(kw, content, re.IGNORECASE):
                        matched = True
                        matched_keyword = kw
                        break

            if not matched:
                continue

            # Check if we already replied to this message
            existing_log = (
                db.query(AutoReplyLog)
                .filter(
                    AutoReplyLog.rule_id == rule.id,
                    AutoReplyLog.conversation_id == str(conv.id),
                )
                .order_by(AutoReplyLog.created_at.desc())
                .first()
            )
            if existing_log:
                continue

            # Generate reply
            reply_text = ""
            sentiment = None

            if rule.use_ai:
                reply_text, sentiment = self._generate_ai_reply(
                    rule.client_id, content, rule.ai_tone
                )
            elif rule.static_reply:
                reply_text = rule.static_reply
                sentiment = "neutral"

            if not reply_text:
                continue

            strategy = rule.reply_strategy
            was_sent = False
            was_approved = None

            if strategy == "auto" and rule.auto_send:
                was_sent = self._send_reply(db, conv, reply_text)
                was_approved = True
            elif strategy == "suggest":
                was_sent = False
                was_approved = None
            elif strategy == "flag":
                was_sent = False
                was_approved = None

            # Mark message as read
            last_unread.is_read = True
            db.flush()

            log_entry = AutoReplyLog(
                client_id=rule.client_id,
                rule_id=rule.id,
                conversation_id=str(conv.id),
                original_message=content[:1000],
                ai_reply=reply_text[:2000],
                sentiment=sentiment,
                was_sent=was_sent,
                was_approved=was_approved,
                strategy_used=strategy,
            )
            db.add(log_entry)
            db.commit()
            logger.info(
                "Auto-reply: rule=%s conv=%s strategy=%s sent=%s",
                rule.id, conv.id, strategy, was_sent,
            )

    def _generate_ai_reply(self, client_id: int, content: str, tone: str) -> tuple:
        """Generate AI reply. Returns (reply_text, sentiment)."""
        if not AI_API_KEY:
            logger.warning("AI not configured for auto-reply")
            return ("", None)

        prompt = f"""You are a social media assistant. Generate a {tone} reply to this message. Keep it concise and natural.

Also determine the sentiment: positive, neutral, or negative.

Return your response in this JSON format:
{{"reply": "your reply text", "sentiment": "positive|neutral|negative"}}

Message: {content}"""

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
                    "max_tokens": 500,
                    "temperature": 0.7,
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
            import json as _json
            parsed = _json.loads(text)
            return parsed.get("reply", ""), parsed.get("sentiment")
        except Exception as e:
            logger.error("AI reply generation failed: %s", e)
            return ("", None)

    def _send_reply(self, db: Session, conv: InboxConversation, reply_text: str) -> bool:
        """Send a reply to the conversation."""
        try:
            msg = InboxMessage(
                conversation_id=conv.id,
                content=reply_text,
                direction="outgoing",
                is_read=True,
            )
            db.add(msg)
            conv.last_message_at = datetime.datetime.utcnow()
            conv.last_message_preview = reply_text[:200]
            return True
        except Exception as e:
            logger.error("Failed to send reply: %s", e)
            return False

    def process_single(self, db: Session, rule: AutoReplyRule, conversation_id: str, content: str, platform: str = None) -> dict:
        """Process a single conversation (called from API)."""
        matched_keyword = None
        keywords = [k.strip().lower() for k in (rule.trigger_keywords or "").split(",") if k.strip()]
        content_lower = content.lower()
        for kw in keywords:
            if rule.match_type == "contains" and kw in content_lower:
                matched_keyword = kw
                break
            elif rule.match_type == "exact" and content_lower.strip() == kw:
                matched_keyword = kw
                break
            elif rule.match_type == "starts_with" and content_lower.startswith(kw):
                matched_keyword = kw
                break
            elif rule.match_type == "regex":
                import re
                if re.search(kw, content, re.IGNORECASE):
                    matched_keyword = kw
                    break
            if kw == keywords[-1] and not matched_keyword:
                # Also accept if there are no keywords (match all)
                if not rule.trigger_keywords or not rule.trigger_keywords.strip():
                    matched_keyword = "_all_"

        reply_text = ""
        sentiment = None

        if rule.use_ai:
            reply_text, sentiment = self._generate_ai_reply(rule.client_id, content, rule.ai_tone)

        if not reply_text and rule.static_reply:
            reply_text = rule.static_reply
            if not sentiment:
                sentiment = "neutral"

        strategy = rule.reply_strategy
        was_sent = False
        was_approved = None

        if strategy == "auto" and rule.auto_send:
            conv_obj = db.query(InboxConversation).filter(
                InboxConversation.client_id == rule.client_id,
                InboxConversation.id == int(conversation_id) if conversation_id.isdigit() else None,
            ).first()
            if conv_obj:
                was_sent = self._send_reply(db, conv_obj, reply_text)
                was_approved = True

        log_entry = AutoReplyLog(
            client_id=rule.client_id,
            rule_id=rule.id,
            conversation_id=conversation_id,
            original_message=content[:1000],
            ai_reply=reply_text[:2000],
            sentiment=sentiment,
            was_sent=was_sent,
            was_approved=was_approved,
            strategy_used=strategy,
        )
        db.add(log_entry)
        db.commit()

        return {
            "matches": bool(matched_keyword),
            "matched_on": matched_keyword,
            "reply": reply_text,
            "sentiment": sentiment,
            "was_sent": was_sent,
            "strategy": strategy,
        }
