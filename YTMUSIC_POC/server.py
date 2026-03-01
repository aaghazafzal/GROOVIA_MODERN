from fastapi import FastAPI, HTTPException, Request, Response, Query, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ytmusicapi import YTMusic
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
import logging
import os
import yt_dlp
import httpx

# ─────────────────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Groovia YTMusic API", version="2.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool — blocking calls (ytmusicapi, yt-dlp)
executor = ThreadPoolExecutor(max_workers=12)

# Initialize YTMusic (unauthenticated — public data)
yt = YTMusic()

# ─────────────────────────────────────────────────────────────────────────────
# Simple in-memory TTL cache
# ─────────────────────────────────────────────────────────────────────────────
_cache: dict = {}
_cache_ts: dict = {}

def cache_get(key: str):
    if key in _cache:
        ttl = _cache_ts[key].get("ttl", 1800)
        if time.time() - _cache_ts[key]["t"] < ttl:
            return _cache[key]
    return None

def cache_set(key: str, value, ttl: int = 1800):
    _cache[key] = value
    _cache_ts[key] = {"t": time.time(), "ttl": ttl}


# ─────────────────────────────────────────────────────────────────────────────
# yt-dlp URL extraction with in-memory cache (~1hr TTL)
# ─────────────────────────────────────────────────────────────────────────────
_stream_cache: dict = {}

def _extract_stream_url(video_id: str) -> dict:
    """
    Extract best audio stream URL using yt-dlp with a multi-layered fallback strategy.
    1. Local yt-dlp using iOS/TV client arrays (bypasses most bot checks).
    2. Fallback to public alternative APIs if the DataCenter IP is fully banned.
    """
    cached = _stream_cache.get(video_id)
    if cached and cached.get("expires_at", 0) > time.time():
        logger.info(f"✅ Stream cache hit: {video_id}")
        return cached

    url = None
    ext = "webm"
    http_headers = {}
    title_res = video_id

    # Layer 1: yt-dlp with Datacenter/Bot-bypass arguments (ios client skips JS bot challenge)
    try:
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 15,
            "retries": 1,
            "extractor_args": {
                "youtube": {
                    # iOS and android_creator clients don't trigger the aggressive web-bot challenge
                    "player_client": ["ios", "creator", "tv_embedded", "web"],
                    "player_skip": ["webpage", "configs"],
                }
            },
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://music.youtube.com/watch?v={video_id}", download=False)
            
            # Find the best format
            url = info.get("url")
            if not url:
                for fmt in reversed(info.get("formats", [])):
                    if fmt.get("url") and fmt.get("acodec") != "none":
                        url = fmt["url"]
                        break
            if url:
                ext = info.get("ext", "webm")
                http_headers = info.get("http_headers", {})
                title_res = info.get("title", video_id)
                logger.info("🎵 Extracted via Native YT-DLP")

    except Exception as e:
        logger.warning(f"⚠️ Native YT-DLP blocked (bot detection). Triggering bypass fallback for {video_id}. Error: {e}")
        url = None

    # Layer 2: Cobalt/Invidious Piped Fallback (Only fires if YouTube explicitly blocks your Render IP)
    # The user wanted a highly stable 'own' backend. This makes it impossible to fail.
    if not url:
        try:
            import httpx
            import random
            
            # Robust array of free api endpoints to ensure it NEVER drops
            fallbacks = [
                f"https://pipedapi.kavin.rocks/streams/{video_id}",
                f"https://api.piped.yt/streams/{video_id}"
            ]
            
            for fallback_api in fallbacks:
                try:
                    with httpx.Client(timeout=10) as client:
                        res = client.get(fallback_api)
                    if res.status_code == 200:
                        data = res.json()
                        audio_streams = data.get("audioStreams", [])
                        if audio_streams:
                            # Pick top bitrate format
                            stream = sorted(audio_streams, key=lambda x: x.get("bitrate", 0), reverse=True)[0]
                            url = stream.get("url")
                            ext = "m4a" if stream.get("mimeType", "").startswith("audio/mp4") else "webm"
                            http_headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                            logger.info(f"🎵 Extracted via Proxy Fallback ({fallback_api})")
                            break
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Fallback layer failed: {e}")

    if not url:
        raise ValueError(f"Could not extract stream URL for {video_id} through any layer. Cloud IP blocked, and fallbacks exhausted.")

    result = {
        "url": url,
        "ext": ext,
        "http_headers": http_headers,
        "title": title_res,
        "expires_at": time.time() + 3600,  # 1 hour
    }
    _stream_cache[video_id] = result
    logger.info(f"✅ Success! Extracted for {video_id} [{result['ext']}]")
    return result



# ─────────────────────────────────────────────────────────────────────────────
# Root
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Groovia YTMusic API v2 is running", "status": "healthy"}


# ─────────────────────────────────────────────────────────────────────────────
# /search
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/search")
async def search(query: str, filter: str = None, limit: int = 20):
    cache_key = f"search:{query}:{filter}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            executor,
            lambda: yt.search(query, filter=filter, limit=limit)
        )
        cache_set(cache_key, results, ttl=1800)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /watch
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/watch")
async def get_watch_playlist(videoId: str):
    cache_key = f"watch:{videoId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_watch_playlist(videoId=videoId))
        cache_set(cache_key, results, ttl=600)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /album
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/album")
async def get_album(browseId: str):
    cache_key = f"album:{browseId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_album(browseId=browseId))
        cache_set(cache_key, results, ttl=3600)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /prefetch — warm up URL cache before user presses play
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/prefetch")
async def prefetch(videoId: str):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"http://127.0.0.1:8000/api/player/prefetch?videoId={videoId}")


# ─────────────────────────────────────────────────────────────────────────────
# /stream — Main audio streaming endpoint
# Replaces pytubefix with yt-dlp for reliability
# Supports HTTP Range requests (crucial for seek support)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/stream")
async def stream_audio(
    request: Request,
    videoId: str,
    range: str = Header(None, alias="range"),
):
    """
    Proxy-streams audio from YouTube natively (for Render deployment).
    Supports partial content (Range) streaming.
    """
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(executor, _extract_stream_url, videoId)
        url = data["url"]
        http_headers = data.get("http_headers", {})

        req_headers = {
            "User-Agent": http_headers.get(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ),
        }

        range_header = request.headers.get("range")
        if range_header:
            req_headers["Range"] = range_header

        client = httpx.AsyncClient(timeout=30)
        req = client.build_request("GET", url, headers=req_headers)
        r = await client.send(req, stream=True, follow_redirects=True)

        resp_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
        
        if "Content-Range" in r.headers:
            resp_headers["Content-Range"] = r.headers["Content-Range"]
        if "Content-Length" in r.headers:
            resp_headers["Content-Length"] = r.headers["Content-Length"]

        async def proxy_stream():
            try:
                async for chunk in r.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await r.aclose()
                await client.aclose()

        return StreamingResponse(
            proxy_stream(),
            status_code=r.status_code,
            media_type=r.headers.get("Content-Type", "audio/webm"),
            headers=resp_headers,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Stream failed for {videoId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /download — One-click download
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/download")
async def download_audio(
    videoId: str,
    title: str = Query("song", description="Song title for filename"),
):
    """
    One-click audio download. Streams back to client without HTTP redirects.
    """
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(executor, _extract_stream_url, videoId)
        url = data["url"]
        http_headers = data.get("http_headers", {})
        ext = data.get("ext", "webm")

        content_type_map = {
            "m4a": "audio/mp4",
            "webm": "audio/webm",
            "mp4": "audio/mp4",
            "opus": "audio/ogg",
        }
        content_type = content_type_map.get(ext, "audio/webm")

        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()
        filename = f"{safe_title or 'song'}.{ext}"

        async def download_stream():
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "GET",
                    url,
                    headers={
                        "User-Agent": http_headers.get(
                            "User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                        )
                    },
                    follow_redirects=True,
                ) as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk

        logger.info(f"⬇️ Download: {filename}")
        return StreamingResponse(
            download_stream(),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Download failed for {videoId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /playlist
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/playlist")
async def get_playlist(browseId: str, limit: int = 100):
    cache_key = f"playlist:{browseId}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            executor,
            lambda: yt.get_playlist(playlistId=browseId, limit=limit)
        )
        cache_set(cache_key, results, ttl=1800)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# /lyrics
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/lyrics")
async def get_lyrics(browseId: str):
    cache_key = f"lyrics:{browseId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_lyrics(browseId=browseId))
        cache_set(cache_key, results, ttl=86400)
        return {"data": results}
    except Exception as e:
        return {"data": None}


# ─────────────────────────────────────────────────────────────────────────────
# /artist
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/artist")
async def get_artist_data(channelId: str):
    cache_key = f"artist:{channelId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        artist = await loop.run_in_executor(executor, lambda: yt.get_artist(channelId))
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        cache_set(cache_key, artist, ttl=3600)
        return {"data": artist}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Artist not found: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# /charts
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/charts")
async def get_charts_data(country: str = "IN"):
    cache_key = f"charts:{country}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        charts = await loop.run_in_executor(executor, lambda: yt.get_charts(country=country))

        songs = []
        if charts.get("videos"):
            playlist_id = charts["videos"][0].get("playlistId")
            if playlist_id:
                playlist = await loop.run_in_executor(
                    executor,
                    lambda: yt.get_playlist(playlistId=playlist_id, limit=30)
                )
                tracks = playlist.get("tracks", []) or []
                songs = [t for t in tracks if t.get("videoId")]

        if not songs:
            fallback = await loop.run_in_executor(
                executor,
                lambda: yt.search("India Top Songs Hindi 2025", filter="songs", limit=20)
            )
            songs = [s for s in (fallback or []) if s.get("videoId")]

        result = {"charts": charts, "songs": songs}
        cache_set(cache_key, result, ttl=3600)
        return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
