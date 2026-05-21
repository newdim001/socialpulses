"""Posts routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from database import get_db
from auth import get_current_user
from models import Post, PostAccount, PostStatus, SocialAccount, SocialPlatform, PostMedia, Media, User
from schemas import PostCreate, PostUpdate, PostOut, PostAccountOut, PostMediaOut
from platform_clients.factory import get_platform_client
import logging, datetime
logger = logging.getLogger("posts_routes")
router = APIRouter(prefix="/api/posts", tags=["Posts"])

# ── Posts ──

def _hydrate_posts(posts, db):
    result = []
    for p in posts:
        pas = []
        for pa in (p.post_accounts or []):
            acct = pa.social_account if hasattr(pa, 'social_account') else db.query(SocialAccount).get(pa.social_account_id)
            plat = acct.platform if (acct and hasattr(acct, 'platform')) else (db.query(SocialPlatform).get(acct.platform_id) if acct else None)
            pas.append(PostAccountOut(
                id=pa.id, social_account_id=pa.social_account_id,
                platform_name=plat.name.value if plat else "",
                platform_username=acct.platform_username if acct else "",
                status=pa.status, platform_post_id=pa.platform_post_id,
                error_message=pa.error_message,
            ))
        media_out = []
        for m in (p.media or []):
            mi = m.media_item if hasattr(m, 'media_item') else db.query(Media).get(m.media_id)
            if mi:
                media_out.append(PostMediaOut(
                    id=m.id, media_id=m.media_id,
                    filename=mi.filename, original_filename=mi.original_filename,
                    mime_type=mi.mime_type, url="/api/media/" + str(m.media_id) + "/serve",
                    position=m.position,
                ))
        result.append(PostOut(
            id=p.id, client_id=p.client_id, content=p.content,
            scheduled_at=p.scheduled_at,
            status=p.status.value if hasattr(p.status, 'value') else p.status,
            created_at=p.created_at, updated_at=p.updated_at,
            published_at=p.published_at,
            telegram_message_id=p.telegram_message_id,
            post_accounts=pas, media=media_out,
        ))
    return result


@router.get("/posts", response_model=list[PostOut])
def list_posts(status: Optional[str] = None, year: Optional[int] = None,
               month: Optional[int] = None,
               offset: int = 0, limit: int = 50,
               user=Depends(get_current_user), db=Depends(get_db)):
    limit = min(limit, 100)
    q = db.query(Post).options(
        joinedload(Post.post_accounts), joinedload(Post.media)
    ).filter(Post.client_id == user.client_id)
    if status:
        q = q.filter(Post.status == status)
    if year:
        q = q.filter(extract("year", Post.scheduled_at) == year)
    if month:
        q = q.filter(extract("month", Post.scheduled_at) == month)
    q = q.order_by(Post.created_at.desc()).offset(offset).limit(limit)
    return _hydrate_posts(q.all(), db)



@router.get("/posts/pending-approval")
def list_pending_approval_posts(offset: int = 0, limit: int = 50, user=Depends(get_current_user), db=Depends(get_db)):
    limit = min(limit, 100)
    posts = db.query(Post).options(
        joinedload(Post.post_accounts), joinedload(Post.media)
    ).filter(Post.client_id == user.client_id, Post.status == PostStatus.pending_approval).order_by(Post.updated_at.desc()).offset(offset).limit(limit).all()
    return _hydrate_posts(posts, db)
@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    return _hydrate_posts([post], db)[0]


@router.post("/posts", response_model=PostOut)
def create_post(req: PostCreate, user=Depends(get_current_user), db=Depends(get_db)):
    scheduled = None
    if req.scheduled_at:
        try:
            dt_str = req.scheduled_at.replace("Z", "+00:00")
            scheduled = datetime.datetime.fromisoformat(dt_str)
        except ValueError:
            raise HTTPException(400, "Invalid date format")
    status = PostStatus.scheduled if scheduled else PostStatus.draft
    post = Post(client_id=user.client_id, content=req.content, scheduled_at=scheduled, status=status)
    db.add(post)
    db.flush()
    for aid in req.account_ids:
        db.add(PostAccount(post_id=post.id, social_account_id=aid, status="pending"))
    db.commit()
    db.refresh(post)
    event_type = "post.scheduled" if scheduled else "post.created"
    fire_post_webhooks(event_type, post.id, user.client_id, db)
    return _hydrate_posts([post], db)[0]


@router.put("/posts/{post_id}", response_model=PostOut)
def update_post(post_id: int, req: PostUpdate, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if req.content is not None:
        post.content = req.content
    if req.status is not None:
        post.status = PostStatus(req.status) if isinstance(req.status, str) else req.status
    if req.scheduled_at is not None:
        try:
            post.scheduled_at = datetime.datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(400, "Invalid date format")
        if post.status == PostStatus.draft and post.scheduled_at:
            post.status = PostStatus.scheduled
    if req.account_ids is not None:
        db.query(PostAccount).filter(PostAccount.post_id == post.id).delete()
        for aid in req.account_ids:
            db.add(PostAccount(post_id=post.id, social_account_id=aid, status="pending"))
    post.updated_at = datetime.datetime.utcnow()
    # Save version snapshot
    from_accounts = db.query(PostAccount).filter(PostAccount.post_id == post.id).all()
    version = PostVersion(
        post_id=post.id, content=post.content,
        scheduled_at=post.scheduled_at,
        status=post.status.value if hasattr(post.status, 'value') else post.status,
        account_ids_json=str([a.social_account_id for a in from_accounts]),
        created_by=user.id,
    )
    db.add(version)
    db.commit()
    db.refresh(post)
    event_type = "post.scheduled" if scheduled else "post.created"
    fire_post_webhooks(event_type, post.id, user.client_id, db)
    return _hydrate_posts([post], db)[0]


@router.put("/posts/{post_id}/approve")
def approve_post(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.status != PostStatus.pending_approval:
        raise HTTPException(400, "Post is not pending approval")
    post.status = PostStatus.scheduled if post.scheduled_at else PostStatus.draft
    db.commit()
    return {"ok": True, "status": post.status.value}


@router.put("/posts/{post_id}/reject")
def reject_post(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.status = PostStatus.cancelled
    db.commit()
    return {"ok": True}


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.delete(post)
    db.commit()
    return {"ok": True}


@router.post("/posts/{post_id}/publish-now")
def publish_now(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    """Immediately publish a draft or scheduled post."""
    post = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.status not in (PostStatus.draft, PostStatus.scheduled):
        raise HTTPException(400, "Post must be draft or scheduled to publish now")
    post.scheduled_at = datetime.datetime.utcnow()
    post.status = PostStatus.scheduled
    db.commit()
    try:
        from publisher import Publisher
        p = Publisher()
        p._publish_post(db, post)
        fire_post_webhooks("post.published" if post.status == PostStatus.published else "post.failed", post.id, user.client_id, db)
    except Exception as e:
        logger.warning("Immediate publish attempt failed: %s", e)
    return {"ok": True, "status": post.status.value}


@router.post("/posts/{post_id}/duplicate")
def duplicate_post(post_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    """Duplicate a post (content + account targets)."""
    original = db.query(Post).filter(Post.id == post_id, Post.client_id == user.client_id).first()
    if not original:
        raise HTTPException(404, "Post not found")
    post = Post(
        client_id=user.client_id, content=original.content,
        scheduled_at=None, status=PostStatus.draft,
    )
    db.add(post)
    db.flush()
    for pa in original.post_accounts:
        db.add(PostAccount(post_id=post.id, social_account_id=pa.social_account_id, status="pending"))
    db.commit()
    db.refresh(post)
    event_type = "post.scheduled" if scheduled else "post.created"
    fire_post_webhooks(event_type, post.id, user.client_id, db)
    return _hydrate_posts([post], db)[0]

