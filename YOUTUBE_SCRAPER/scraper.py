"""
YouTube Direct Link Scraper
Uses yt-dlp (pure-Python) to extract direct audio/video stream URLs.
Works on Vercel Python — no Node.js / Deno required.
Requires valid YouTube cookies via YT_COOKIES_B64 env var (same as YTMUSIC_POC).
"""

import yt_dlp
import logging
import time
import os
import base64
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# ── In-memory URL cache (~50 min TTL) ────────────────────────────────────────
_stream_cache: Dict[str, dict] = {}
_CACHE_TTL = 3000  # seconds (50 min)

# ── Cookies setup (same pattern as YTMUSIC_POC/server.py) ────────────────────
_COOKIES_PATH = "/tmp/yt_cookies.txt"


def _setup_cookies() -> Optional[str]:
    """Write cookie file from env var. Returns path if successful, else None."""
    # 1. Try env var (base64-encoded)
    cookies_b64 = os.environ.get("YT_COOKIES_B64", "")
    if cookies_b64:
        try:
            cookies_txt = base64.b64decode(cookies_b64).decode("utf-8")
            with open(_COOKIES_PATH, "w") as f:
                f.write(cookies_txt)
            logger.info("🍪 Decoded YT_COOKIES_B64 and wrote cookies.txt")
            return _COOKIES_PATH
        except Exception as e:
            logger.error(f"❌ Failed to decode ENV cookies: {e}")

    # 2. Try local files (for local dev)
    for path in ["cookies.txt", "../YTMUSIC_POC/cookies.txt", "../cookies.txt"]:
        if os.path.exists(path):
            logger.info(f"🍪 Using cookies from {path}")
            return path

    logger.warning("⚠️ No cookies found — yt-dlp may get blocked on datacenter IPs")
    return None


_COOKIES_FILE = _setup_cookies()


def _build_ydl_opts(fmt: str = "bestaudio/best") -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "format": fmt,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios"]
            }
        }
    }
    if _COOKIES_FILE and os.path.exists(_COOKIES_FILE):
        opts["cookiefile"] = _COOKIES_FILE
    return opts


# ── Cache helpers ─────────────────────────────────────────────────────────────
def _get_cached(video_id: str) -> Optional[dict]:
    entry = _stream_cache.get(video_id)
    if entry and entry.get("expires_at", 0) > time.time():
        logger.info(f"🗄️  Cache hit: {video_id}")
        return entry["data"]
    return None


def _set_cache(video_id: str, data: dict) -> None:
    _stream_cache[video_id] = {
        "data": data,
        "expires_at": time.time() + _CACHE_TTL,
    }


# ── Core extractor ─────────────────────────────────────────────────────────────
def extract_streams(video_id: str) -> dict:
    """
    Extract all audio and video streams for a YouTube video using yt-dlp.
    Returns dict with audio_streams and video_streams lists.
    """
    cached = _get_cached(video_id)
    if cached:
        return cached

    # Try music.youtube.com first, fallback to youtube.com
    urls_to_try = [
        f"https://music.youtube.com/watch?v={video_id}",
        f"https://www.youtube.com/watch?v={video_id}",
    ]

    info = None
    last_error = None
    for url in urls_to_try:
        try:
            with yt_dlp.YoutubeDL(_build_ydl_opts()) as ydl:
                info = ydl.extract_info(url, download=False)
            if info:
                break
        except Exception as e:
            last_error = e
            logger.warning(f"yt-dlp attempt failed for {url}: {e}")
            continue

    if not info:
        raise Exception(f"yt-dlp failed for {video_id}: {last_error}")

    title = info.get("title", "Unknown")
    thumbnail = info.get("thumbnail", "")
    duration = info.get("duration", 0)
    raw_formats = info.get("formats") or []

    # ── Audio streams ─────────────────────────────────────────────────────────
    audio_streams = []
    for f in raw_formats:
        if not f:
            continue
        if f.get("vcodec") != "none":
            continue  # skip video/muxed formats
        url_f = f.get("url")
        if not url_f:
            continue
        
        # Safe extraction of bitrate
        try:
            abr = float(f.get("abr") or 0)
        except (ValueError, TypeError):
            abr = 0
            
        ext = f.get("ext", "webm")
        audio_streams.append({
            "url": url_f,
            "bitrate": f"{int(abr)}kbps" if abr > 0 else "unknown",
            "codec": f.get("acodec", "unknown"),
            "mimeType": f"audio/{ext}",
            "quality": "high" if abr >= 128 else "low",
            "itag": str(f.get("format_id", "")),
            "size": f.get("filesize"),
        })

    # Sort descending by bitrate
    def sort_key(x):
        try:
            return int(x["bitrate"].replace("kbps", ""))
        except (ValueError, KeyError):
            return 0

    audio_streams.sort(key=sort_key, reverse=True)

    # ── Video streams ─────────────────────────────────────────────────────────
    video_streams = []
    for f in raw_formats:
        if not f:
            continue
        url_f = f.get("url")
        if not url_f:
            continue
        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        if vcodec == "none":
            continue  # pure audio — handled above
        stream_type = "progressive" if acodec != "none" else "adaptive"
        video_streams.append({
            "url": url_f,
            "quality": str(f.get("resolution") or f.get("height", "unknown")),
            "fps": f.get("fps", 30),
            "mimeType": f"video/{f.get('ext', 'mp4')}",
            "type": stream_type,
            "itag": str(f.get("format_id", "")),
            "size": f.get("filesize"),
        })

    result = {
        "videoId": video_id,
        "title": title,
        "thumbnail": thumbnail,
        "duration": duration,
        "audio_streams": audio_streams[:8],
        "video_streams": video_streams[:8],
    }

    _set_cache(video_id, result)
    logger.info(
        f"✅ yt-dlp extracted {len(audio_streams)} audio, {len(video_streams)} video streams for {video_id}"
    )
    return result


# ── Convenience helpers ───────────────────────────────────────────────────────
def get_best_audio(video_id: str) -> Optional[dict]:
    """Get the highest-quality audio stream."""
    try:
        data = extract_streams(video_id)
        streams = data["audio_streams"]
        return streams[0] if streams else None
    except Exception as e:
        logger.error(f"get_best_audio failed: {e}")
        return None


def get_best_video(video_id: str, max_quality: str = "1080p") -> Optional[dict]:
    """Get best progressive video (falls back to adaptive)."""
    try:
        data = extract_streams(video_id)
        videos = data["video_streams"]
        progressive = [v for v in videos if v.get("type") == "progressive"]
        if progressive:
            return progressive[0]
        adaptive = [v for v in videos if v.get("type") == "adaptive"]
        return adaptive[0] if adaptive else (videos[0] if videos else None)
    except Exception as e:
        logger.error(f"get_best_video failed: {e}")
        return None


def get_audio_by_quality(video_id: str, quality: str = "high") -> Optional[dict]:
    """Get audio stream by quality preference ('high' or 'low')."""
    try:
        data = extract_streams(video_id)
        streams = data["audio_streams"]
        if not streams:
            return None
        return streams[0] if quality == "high" else streams[-1]
    except Exception as e:
        logger.error(f"get_audio_by_quality failed: {e}")
        return None
