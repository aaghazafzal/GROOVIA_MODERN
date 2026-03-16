from fastapi import FastAPI, HTTPException, Request, Response, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from ytmusicapi import YTMusic
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
import logging
import os
import httpx

# ── Deno PATH setup (installed by build.sh, needed for yt-dlp JS challenge solving) ──
_home = os.path.expanduser("~")
_deno_bin = os.path.join(_home, ".deno", "bin")
if os.path.isdir(_deno_bin) and _deno_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _deno_bin + os.pathsep + os.environ.get("PATH", "")
    logging.getLogger(__name__).info(f"🦕 Deno PATH set: {_deno_bin}")

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

# ─────────────────────────────────────────────────────────────────────────────
# Cookies Setup for Cloud Deployment (Render bot bypass)
# ─────────────────────────────────────────────────────────────────────────────
cookies_b64 = os.environ.get("YT_COOKIES_B64")
import base64

def _setup_cookies():
    # 1. First try Env Var (Fastest)
    if cookies_b64:
        try:
            cookies_txt = base64.b64decode(cookies_b64).decode("utf-8")
            with open("cookies.txt", "w") as f:
                f.write(cookies_txt)
            logger.info("🍪 Decoded YT_COOKIES_B64 from ENV and generated cookies.txt for bot bypass.")
            return
        except Exception as e:
            logger.error(f"❌ Failed to decode ENV cookies: {e}")

    # 2. Try looking for the raw or b64 file in the filesystem
    potential_paths = [
        "cookies_b64_for_render.txt", 
        "../cookies_b64_for_render.txt",
        "cookies.txt"
    ]
    
    for path in potential_paths:
        if os.path.exists(path):
            if path.endswith("cookies.txt"):
                logger.info("🍪 Found existing cookies.txt directly in filesystem.")
                return
            else:
                try:
                    with open(path, "r") as f:
                        b64_content = f.read().strip()
                    cookies_txt = base64.b64decode(b64_content).decode("utf-8")
                    with open("cookies.txt", "w") as f:
                        f.write(cookies_txt)
                    logger.info(f"🍪 Decoded '{path}' and generated cookies.txt for bot bypass.")
                    return
                except Exception as e:
                    logger.error(f"❌ Failed to decode file {path}: {e}")
                    
    logger.warning("⚠️ NO COOKIES FOUND: yt-dlp will run unauthenticated and might get blocked by YouTube on Datacenter IPs!")

_setup_cookies()

def _parse_netscape_cookies(filepath: str) -> dict:
    """Parse a Netscape cookies.txt file into a name→value dict."""
    cookies = {}
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("\t")
                if len(parts) >= 7:
                    cookies[parts[5]] = parts[6]
    except Exception:
        pass
    return cookies


def _make_sapisidhash(sapisid: str, origin: str = "https://www.youtube.com") -> str:
    """Generate YouTube SAPISIDHASH authorization header value."""
    import hashlib
    ts = int(time.time())
    h = hashlib.sha1(f"{ts} {sapisid} {origin}".encode()).hexdigest()
    return f"SAPISIDHASH {ts}_{h}"


def _innertube_extract(video_id: str) -> dict | None:
    """
    Call YouTube InnerTube API via ytmusicapi with full authentication from cookies.txt.
    Works from ANY IP (including Render datacenter) when valid auth cookies present.
    """
    cookies = _parse_netscape_cookies("cookies.txt") if os.path.exists("cookies.txt") else {}
    
    headers = None
    if cookies:
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        sapisid = cookies.get("SAPISID") or cookies.get("__Secure-3PAPISID") or cookies.get("__Secure-1PAPISID")
        if sapisid:
            import hashlib
            ts = int(time.time())
            h = hashlib.sha1(f"{ts} {sapisid} https://music.youtube.com".encode()).hexdigest()
            auth = f"SAPISIDHASH {ts}_{h}"
            headers = {"Cookie": cookie_str, "Authorization": auth}

    try:
        if headers:
            yt = YTMusic(auth=headers)
        else:
            yt = YTMusic()
            
        data = yt.get_song(video_id)
    except Exception as e:
        logger.warning(f"InnerTube request failed: {e}")
        return None

    playability = data.get("playabilityStatus", {})
    status = playability.get("status")
    if status not in ("OK", None):
        reason = playability.get("reason", "unknown")
        logger.warning(f"InnerTube playability [{status}] for {video_id}: {reason}")
        return None

    streaming_data = data.get("streamingData", {})
    formats = streaming_data.get("adaptiveFormats", []) + streaming_data.get("formats", [])

    audio_formats = [
        f for f in formats
        if f.get("mimeType", "").startswith("audio") and f.get("url")
    ]

    if not audio_formats:
        logger.warning(f"InnerTube: no direct audio URLs for {video_id} (may need signature decryption)")
        return None

    m4a = [f for f in audio_formats if "mp4" in f.get("mimeType", "")]
    chosen = sorted(m4a or audio_formats, key=lambda f: f.get("averageBitrate", f.get("bitrate", 0)), reverse=True)[0]

    stream_url = chosen["url"]
    mime = chosen.get("mimeType", "audio/webm")
    ext = "m4a" if "mp4" in mime else "webm"
    title = data.get("videoDetails", {}).get("title", video_id)

    logger.info(f"🎵 InnerTube SUCCESS for {video_id} [{ext}] @ {chosen.get('averageBitrate', '?')}bps")
    return {
        "url": stream_url,
        "ext": ext,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
        "title": title,
    }


def _extract_stream_url(video_id: str) -> dict:
    """
    Audio URL extraction - 3 layers:
    LAYER 0 (PRIMARY): YouTube InnerTube API (ytmusicapi.get_song)
    LAYER 1: pytubefix (local fallback)
    LAYER 2: Vercel Scraper API (remote fallback - no bot detection)
    """
    cached = _stream_cache.get(video_id)
    if cached and cached.get("expires_at", 0) > time.time():
        logger.info(f"✅ Stream cache hit: {video_id}")
        return cached

    url = None
    ext = "webm"
    http_headers = {"User-Agent": "Mozilla/5.0"}
    title_res = video_id

    # ── LAYER 0: InnerTube direct API ────────────────────────────────────────
    try:
        logger.info(f"🔍 Layer 0: InnerTube API for {video_id}...")
        result = _innertube_extract(video_id)
        if result:
            url = result["url"]
            ext = result["ext"]
            http_headers = result["http_headers"]
            title_res = result["title"]
            logger.info(f"🎵 Layer 0 InnerTube SUCCESS for {video_id} [{ext}]")
    except Exception as e:
        logger.warning(f"⚠️ Layer 0 (InnerTube) failed: {str(e)[:120]}")

    # ── LAYER 1: pytubefix ────────────────────────────────────────────────────
    if not url:
        try:
            logger.info(f"🔍 Layer 1: pytubefix for {video_id}...")
            from pytubefix import YouTube
            yt = YouTube(f"https://music.youtube.com/watch?v={video_id}", use_oauth=False, allow_oauth_cache=False)
            audio_streams = yt.streams.filter(only_audio=True).order_by('abr').desc()
            if audio_streams:
                best_audio = audio_streams[0]
                url = best_audio.url
                ext = "m4a" if "mp4" in best_audio.mime_type else "webm"
                http_headers = {"User-Agent": "Mozilla/5.0"}
                title_res = yt.title or video_id
                logger.info(f"🎵 Layer 1 pytubefix SUCCESS for {video_id}")
        except Exception as e:
            logger.warning(f"⚠️ Layer 1 pytubefix failed: {str(e)[:100]}")

    # ── LAYER 2: Vercel Scraper API (no bot detection) ─────────────────────────
    if not url:
        try:
            logger.info(f"🔍 Layer 2: Vercel Scraper for {video_id}...")
            scraper_url = f"https://grooviaytmusic.vercel.app/audio/{video_id}?quality=high"
            resp = httpx.get(scraper_url, timeout=15, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success") and data.get("data", {}).get("url"):
                    url = data["data"]["url"]
                    ext = data["data"].get("mimeType", "webm").split("/")[-1]
                    if ext == "webm":
                        ext = "webm"
                    elif ext == "mp4":
                        ext = "m4a"
                    http_headers = {"User-Agent": "Mozilla/5.0"}
                    title_res = data["data"].get("title", video_id)
                    logger.info(f"🎵 Layer 2 Vercel Scraper SUCCESS for {video_id}")
        except Exception as e:
            logger.warning(f"⚠️ Layer 2 Vercel Scraper failed: {str(e)[:100]}")

    if url:
        cache_data = {
            "url": url, "ext": ext,
            "http_headers": http_headers, "title": title_res,
            "expires_at": time.time() + 3000
        }
        _stream_cache[video_id] = cache_data
        return cache_data

    raise ValueError(f"All 3 layers exhausted for {video_id}. No working stream found.")

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
    """Pre-warms the stream URL cache silently in background."""
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, _extract_stream_url, videoId)
        return {"status": "cached", "videoId": videoId}
    except Exception as e:
        logger.warning(f"Prefetch failed for {videoId}: {e}")
        return {"status": "error", "detail": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# /stream — Main audio streaming endpoint
# Replaces pytubefix with yt-dlp for reliability
# Supports HTTP Range requests (crucial for seek support)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/stream")
async def stream_audio(
    videoId: str,
    range: str = Header(None, alias="range"),
    request_range: str = Query(None),
    download: bool = False,
    title: str = "song"
):
    """
    Proxy-streams audio from YouTube.
    Forwards Content-Range + Content-Length for proper HTML5 audio seekability.
    """
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(executor, _extract_stream_url, videoId)
        url = data["url"]
        http_headers = data.get("http_headers", {})
        ext = data.get("ext", "webm")

        # Build upstream request headers
        req_headers = {
            "User-Agent": http_headers.get(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/112.0.0.0 Safari/537.36",
            ),
        }

        # Always include Range so YouTube returns Content-Range + Content-Length
        range_header = range or request_range or "bytes=0-"
        req_headers["Range"] = range_header

        content_type_map = {
            "m4a": "audio/mp4",
            "webm": "audio/webm",
            "mp4": "audio/mp4",
            "opus": "audio/ogg",
        }
        content_type = content_type_map.get(ext, "audio/webm")

        # Open the upstream request (non-streaming first to grab headers)
        upstream_client = httpx.AsyncClient(timeout=60)
        upstream_resp = await upstream_client.send(
            upstream_client.build_request("GET", url, headers=req_headers),
            stream=True,
            follow_redirects=True,
        )

        # Build response headers, forwarding critical ones from upstream
        resp_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
        for h in ("Content-Length", "Content-Range", "Content-Type"):
            val = upstream_resp.headers.get(h)
            if val:
                resp_headers[h] = val

        # Override with our known content-type if upstream didn't send a good one
        if not resp_headers.get("Content-Type", "").startswith("audio"):
            resp_headers["Content-Type"] = content_type

        status_code = upstream_resp.status_code
        if status_code not in (200, 206):
            status_code = 206

        if download:
            safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()
            resp_headers["Content-Disposition"] = f'attachment; filename="{safe_title or videoId}.{ext}"'
            resp_headers["Access-Control-Expose-Headers"] = "Content-Disposition"
            status_code = 200

        async def proxy_stream():
            try:
                async for chunk in upstream_resp.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await upstream_resp.aclose()
                await upstream_client.aclose()

        logger.info(f"🎧 Streaming {videoId} [{ext}] status={status_code} range={range_header}")
        return StreamingResponse(
            proxy_stream(),
            status_code=status_code,
            media_type=content_type,
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
