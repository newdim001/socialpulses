
"""Media routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import Media, MediaFolder
from schemas import MediaUploadResponse
from media_pipeline import validate_for_platform, get_video_info
import os, uuid, logging

logger = logging.getLogger("media_routes")
router = APIRouter(prefix="/api/media", tags=["Media"])

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media")
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/quicktime", "video/x-msvideo",
}


@router.post("/media/upload", response_model=MediaUploadResponse)
async def upload_media(file: UploadFile = File(...), folder_id: Optional[int] = Form(None),
                        alt_text: Optional[str] = Form(None),
                        user=Depends(get_current_user), db=Depends(get_db)):
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB.")
    ext = os.path.splitext(file.filename or "file")[1]
    safe_name = str(uuid.uuid4()) + ext
    client_media_dir = os.path.join(MEDIA_DIR, str(user.client_id))
    os.makedirs(client_media_dir, exist_ok=True)
    filepath = os.path.join(client_media_dir, safe_name)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    w, h, duration, video_codec = None, None, None, None
    if file.content_type and file.content_type.startswith("image/"):
        try:
            from PIL import Image
            img = Image.open(filepath)
            w, h = img.size
        except Exception:
            pass
    elif file.content_type and file.content_type.startswith("video/"):
        info = get_video_info(filepath)
        if info:
            for stream in info.get("streams", []):
                if stream.get("codec_type") == "video":
                    w = stream.get("width")
                    h = stream.get("height")
                    video_codec = stream.get("codec_name")
            fmt = info.get("format", {})
            dur = fmt.get("duration")
            if dur:
                duration = float(dur)
    media = Media(client_id=user.client_id, filename=safe_name, original_filename=file.filename,
                  mime_type=file.content_type, file_size=len(content), width=w, height=h,
                  folder_id=folder_id, alt_text=alt_text)
    db.add(media)
    db.commit()
    db.refresh(media)
    return MediaUploadResponse(
        id=media.id, filename=media.filename, original_filename=media.original_filename,
        mime_type=media.mime_type, file_size=media.file_size,
        width=media.width, height=media.height,
        url="/media/" + str(user.client_id) + "/" + media.filename, created_at=media.created_at,
    )


@router.get("/media", response_model=list[MediaUploadResponse])
def list_media(offset: int = 0, limit: int = 50, user=Depends(get_current_user), db=Depends(get_db)):
    limit = min(limit, 100)
    files = db.query(Media).filter(Media.client_id == user.client_id).order_by(Media.created_at.desc()).offset(offset).limit(limit).all()
    return [MediaUploadResponse(
        id=m.id, filename=m.filename, original_filename=m.original_filename,
        mime_type=m.mime_type, alt_text=m.alt_text, folder_id=m.folder_id,
        file_size=m.file_size, width=m.width, height=m.height,
        url="/media/" + str(m.client_id) + "/" + m.filename, created_at=m.created_at,
    ) for m in files]


@router.get("/media/{media_id}/serve")
def serve_media(media_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    m = db.query(Media).filter(Media.id == media_id, Media.client_id == user.client_id).first()
    if not m:
        raise HTTPException(404, "Media not found")
    filepath = os.path.join(MEDIA_DIR, str(m.client_id), m.filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")
    return FileResponse(filepath, media_type=m.mime_type or "application/octet-stream")


@router.delete("/media/{media_id}")
def delete_media(media_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    m = db.query(Media).filter(Media.id == media_id, Media.client_id == user.client_id).first()
    if not m:
        raise HTTPException(404, "Media not found")
    filepath = os.path.join(MEDIA_DIR, str(m.client_id), m.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.delete(m)
    db.commit()
    return {"ok": True}
