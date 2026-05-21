#!/usr/bin/env python3
"""
RSS Auto-Posting Worker for SocialPulses.

Fetches all active RSS feeds and creates draft Post entries from new items.
Designed to be run as a cron job (every 30 min or 1 hour).

Usage:
    python3 rss_worker.py              # normal run
    python3 rss_worker.py --dry-run    # preview without creating anything
    python3 rss_worker.py --feed 42    # process only a specific feed ID
"""

import argparse
import calendar
import logging
import os
import sys
import time
import warnings
from datetime import datetime, timezone

# Suppress SQLAlchemy legacy datetime deprecation warnings
warnings.filterwarnings("ignore", message=".*utcnow.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*utcfromtimestamp.*", category=DeprecationWarning)

# Ensure the backend directory is on sys.path so we can import sibling modules
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import feedparser
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import SessionLocal
from models import RssFeed, RssFeedItem, Post, PostStatus

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rss_worker")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    """Return a naive UTC datetime (compatible with the existing DB schema)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _utcfromtimestamp(ts: float) -> datetime:
    """Return a naive UTC datetime from a POSIX timestamp."""
    return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)


# ── Core Logic ───────────────────────────────────────────────────────────────

def fetch_feed_items(feed: RssFeed) -> list[dict]:
    """
    Fetch and parse an RSS feed URL, returning all parsed items.
    Deduplication is handled separately.
    """
    logger.info("Fetching feed: %s (id=%d, url=%s)", feed.name, feed.id, feed.url)

    parsed = feedparser.parse(feed.url)

    if parsed.bozo and not parsed.entries:
        raise RuntimeError(
            f"Feed parsing failed for '{feed.name}': "
            f"{parsed.bozo_exception or 'unknown parse error'}"
        )

    if not parsed.entries:
        logger.info("  No entries found in feed '%s'", feed.name)
        return []

    items = []
    for entry in parsed.entries:
        guid = entry.get("id") or entry.get("link") or ""
        if not guid:
            logger.warning("  Skipping entry with no id/link in feed '%s'", feed.name)
            continue

        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        description = (entry.get("description") or entry.get("summary") or "").strip()

        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            pub_date = _utcfromtimestamp(calendar.timegm(entry.published_parsed))

        items.append({
            "guid": guid,
            "title": title,
            "link": link,
            "description": description,
            "pub_date": pub_date,
        })

    logger.info("  Found %d total entries in feed '%s'", len(items), feed.name)
    return items


def deduplicate_items(db: Session, feed_id: int, items: list[dict]) -> list[dict]:
    """
    Remove items whose guid already exists in rss_feed_items for this feed.
    Uses a single bulk query for efficiency.
    """
    if not items:
        return []

    guids = [item["guid"] for item in items]

    existing_guids = set(
        row[0]
        for row in db.query(RssFeedItem.guid)
        .filter(RssFeedItem.feed_id == feed_id, RssFeedItem.guid.in_(guids))
        .all()
    )

    new_items = [item for item in items if item["guid"] not in existing_guids]
    skipped = len(items) - len(new_items)
    if skipped:
        logger.info("  Skipped %d already-known item(s) in feed id=%d", skipped, feed_id)

    return new_items


def create_draft_posts(
    db: Session,
    feed: RssFeed,
    items: list[dict],
    dry_run: bool = False,
) -> int:
    """
    Create draft Post entries from new feed items, and record them in
    rss_feed_items so they won't be re-processed next run.
    Returns the number of posts created.
    """
    if not items:
        return 0

    created_count = 0
    for item in items:
        title = item["title"]
        body = item["description"] or item["link"]

        if title and body:
            content = f"{title}\n\n{body}"
        elif title:
            content = title
        elif body:
            content = body
        else:
            content = item["link"]

        # Limit content length to avoid absurdly long posts
        content = content[:5000]

        if dry_run:
            logger.info(
                "  [DRY-RUN] Would create post from '%s' (guid=%s)",
                title or "(no title)", item["guid"],
            )
            created_count += 1
            continue

        # Create draft Post (scheduled_at=None = draft for manual review)
        post = Post(
            client_id=feed.client_id,
            content=content,
            status=PostStatus.draft,
            scheduled_at=None,
        )
        db.add(post)

        # Record the feed item so it won't be re-imported
        feed_item = RssFeedItem(
            feed_id=feed.id,
            guid=item["guid"],
            title=item["title"],
            link=item["link"],
            description=item["description"],
            pub_date=item["pub_date"],
            is_read=False,
        )
        db.add(feed_item)

        created_count += 1
        logger.info(
            "  Created draft post from '%s' (feed id=%d, client_id=%d)",
            title or "(no title)", feed.id, feed.client_id,
        )

    return created_count


def process_single_feed(
    db: Session,
    feed: RssFeed,
    dry_run: bool = False,
) -> dict:
    """
    Process one RSS feed: fetch, deduplicate, create draft posts.
    Returns a summary dict.  Does NOT commit -- caller is responsible.
    """
    result = {
        "feed_id": feed.id,
        "feed_name": feed.name,
        "feed_url": feed.url,
        "client_id": feed.client_id,
        "status": "ok",
        "total_entries": 0,
        "new_items": 0,
        "posts_created": 0,
        "error": None,
    }

    try:
        items = fetch_feed_items(feed)
        result["total_entries"] = len(items)

        new_items = deduplicate_items(db, feed.id, items)
        result["new_items"] = len(new_items)

        posts_created = create_draft_posts(db, feed, new_items, dry_run=dry_run)
        result["posts_created"] = posts_created

        if not dry_run:
            feed.last_fetched_at = _utcnow()

        logger.info(
            "Feed '%s': %d entries, %d new, %d posts created",
            feed.name, result["total_entries"], result["new_items"], result["posts_created"],
        )

    except Exception as e:
        logger.error("Error processing feed '%s' (id=%d): %s", feed.name, feed.id, str(e))
        result["status"] = "error"
        result["error"] = str(e)

    return result


def run_worker(dry_run: bool = False, feed_id: int | None = None) -> list[dict]:
    """
    Main worker entry point.  Iterates all active RSS feeds (or a single one),
    processing each in its own error boundary and committing after each feed so
    a failure in one doesn't lose progress on others.
    Returns a list of per-feed result dicts.
    """
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        logger.info("Database connection OK")

        query = db.query(RssFeed).filter(RssFeed.is_active == True)
        if feed_id is not None:
            query = query.filter(RssFeed.id == feed_id)

        feeds = query.order_by(RssFeed.last_fetched_at.asc().nullsfirst()).all()

        if not feeds:
            logger.info("No active RSS feeds to process")
            return []

        logger.info("Processing %d active RSS feed(s)%s", len(feeds),
                     " (DRY-RUN)" if dry_run else "")
        if feed_id is not None:
            logger.info("(filtered to feed id=%d only)", feed_id)

        results = []
        for feed in feeds:
            result = process_single_feed(db, feed, dry_run=dry_run)
            results.append(result)

            if not dry_run:
                try:
                    db.commit()
                except Exception as commit_err:
                    db.rollback()
                    logger.error("Commit failed for feed '%s': %s", feed.name, commit_err)
                    result["status"] = "error"
                    result["error"] = f"Commit failed: {commit_err}"

        total_ok = sum(1 for r in results if r["status"] == "ok")
        total_err = sum(1 for r in results if r["status"] == "error")
        total_posts = sum(r["posts_created"] for r in results)
        total_new = sum(r["new_items"] for r in results)

        logger.info("%s", "\u2500" * 50)
        logger.info("SUMMARY: %d feed(s) processed, %d OK, %d errors",
                     len(results), total_ok, total_err)
        logger.info("         %d new item(s), %d draft post(s) created%s",
                     total_new, total_posts, " (DRY-RUN)" if dry_run else "")

        return results

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="SocialPulses RSS Auto-Posting Worker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python3 rss_worker.py                     # normal run\n"
            "  python3 rss_worker.py --dry-run            # preview only\n"
            "  python3 rss_worker.py --feed 42            # single feed\n"
            "  python3 rss_worker.py --quiet              # minimal output\n"
        ),
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be done without creating anything",
    )
    parser.add_argument(
        "--feed", type=int, default=None, metavar="ID",
        help="Process only the feed with this ID",
    )
    parser.add_argument(
        "--quiet", action="store_true",
        help="Suppress per-item logging; show only summary",
    )
    args = parser.parse_args()

    if args.quiet:
        logging.getLogger("rss_worker").setLevel(logging.WARNING)

    start_time = time.time()
    results = run_worker(dry_run=args.dry_run, feed_id=args.feed)
    elapsed = time.time() - start_time

    logger.info("Worker completed in %.2f seconds", elapsed)

    if any(r["status"] == "error" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
