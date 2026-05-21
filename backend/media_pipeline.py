"""Media processing pipeline - validation and transcoding."""
import os
import subprocess
import logging
import json
from typing import Optional, Tuple

logger = logging.getLogger("media_pipeline")

# Platform-specific requirements
PLATFORM_REQUIREMENTS = {
    "instagram": {"max_duration_sec": 600, "max_file_size_mb": 100, "aspect_ratios": [(9, 16), (1, 1), (4, 5)], "codec": "h264"},
    "tiktok": {"max_duration_sec": 600, "max_file_size_mb": 287, "aspect_ratios": [(9, 16), (1, 1)], "codec": "h264"},
    "twitter": {"max_duration_sec": 140, "max_file_size_mb": 512, "aspect_ratios": [(16, 9), (1, 1), (9, 16)], "codec": "h264"},
    "youtube": {"max_duration_sec": 43200, "max_file_size_mb": 256, "aspect_ratios": [(16, 9), (4, 3)], "codec": "h264"},
    "facebook": {"max_duration_sec": 14400, "max_file_size_mb": 4000, "aspect_ratios": [(16, 9), (1, 1), (9, 16), (4, 5)], "codec": "h264"},
    "linkedin": {"max_duration_sec": 600, "max_file_size_mb": 200, "aspect_ratios": [(16, 9), (1, 1)], "codec": "h264"},
    "pinterest": {"max_duration_sec": 600, "max_file_size_mb": 200, "aspect_ratios": [(2, 3), (1, 1), (9, 16)], "codec": "h264"},
}


def get_video_info(filepath: str) -> dict:
    """Extract video metadata using ffprobe."""
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filepath],
            capture_output=True, text=True, timeout=30,
        )
        if probe.returncode == 0:
            return json.loads(probe.stdout)
    except Exception as e:
        logger.error("ffprobe failed for %s: %s", filepath, e)
    return {}


def validate_for_platform(filepath: str, platform: str) -> Tuple[bool, Optional[str]]:
    """Validate if a video file meets platform requirements. Returns (valid, reason)."""
    reqs = PLATFORM_REQUIREMENTS.get(platform)
    if not reqs:
        return True, None
    info = get_video_info(filepath)
    if not info:
        return True, None
    fmt = info.get("format", {})
    file_size_mb = int(fmt.get("size", 0)) / (1024 * 1024)
    duration = float(fmt.get("duration", 0))
    if file_size_mb > reqs["max_file_size_mb"]:
        return False, f"File too large ({file_size_mb:.0f}MB > {reqs['max_file_size_mb']}MB max for {platform})"
    if duration > reqs["max_duration_sec"]:
        return False, f"Video too long ({duration:.0f}s > {reqs['max_duration_sec']}s max for {platform})"
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            w = stream.get("width", 0)
            h = stream.get("height", 0)
            if w and h:
                for ar_w, ar_h in reqs["aspect_ratios"]:
                    if abs(w / h - ar_w / ar_h) < 0.05:
                        break
                else:
                    return False, f"Aspect ratio {w}:{h} not supported by {platform}"
            break
    return True, None


def transcode_for_platform(filepath: str, platform: str, output_path: str) -> Optional[str]:
    """Transcode video to meet platform requirements. Returns output path or None on failure."""
    reqs = PLATFORM_REQUIREMENTS.get(platform)
    if not reqs:
        return filepath
    info = get_video_info(filepath)
    if not info:
        return None
    target_w, target_h = 1080, 1920
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            w = stream.get("width", 1080)
            h = stream.get("height", 1920)
            for ar_w, ar_h in reqs["aspect_ratios"]:
                if abs(w / h - ar_w / ar_h) < 0.05:
                    target_w, target_h = ar_w * 120, ar_h * 120
                    break
            break
    cmd = [
        "ffmpeg", "-i", filepath,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-vf", f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2",
        "-y", output_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            logger.info("Transcoded %s -> %s for %s", os.path.basename(filepath), os.path.basename(output_path), platform)
            return output_path
        else:
            logger.error("Transcode failed: %s", result.stderr[:500])
            return None
    except Exception as e:
        logger.error("Transcode exception: %s", e)
        return None
