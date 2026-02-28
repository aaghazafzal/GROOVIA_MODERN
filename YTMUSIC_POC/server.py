from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from ytmusicapi import YTMusic
import uvicorn
import subprocess
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────────────────
# Thread pool — ytmusicapi calls are blocking
# 10 workers = 10 concurrent YT requests
# ────────────────────────────────────────────
executor = ThreadPoolExecutor(max_workers=12)

# ────────────────────────────────────────────
# Simple in-memory TTL cache
# search results change rarely — cache 30 min
# charts refresh daily — cache 60 min
# ────────────────────────────────────────────
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

# Initialize YTMusic (unauthenticated — public data)
yt = YTMusic()

@app.get("/")
def read_root():
    return {"message": "Groovia YTMusic API Proxy is running"}

# ────────────────────────────────────────────────────────────
# /search — Fully async + cached
# ────────────────────────────────────────────────────────────
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
        cache_set(cache_key, results, ttl=1800)  # 30 min
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────────────────
# /watch — Async + cached
# ────────────────────────────────────────────────────────────
@app.get("/watch")
async def get_watch_playlist(videoId: str):
    cache_key = f"watch:{videoId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_watch_playlist(videoId=videoId))
        cache_set(cache_key, results, ttl=600)  # 10 min (watch playlists are dynamic)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────────────────
# /album — Async + cached
# ────────────────────────────────────────────────────────────
@app.get("/album")
async def get_album(browseId: str):
    cache_key = f"album:{browseId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_album(browseId=browseId))
        cache_set(cache_key, results, ttl=3600)  # 1 hour
        return {"data": results}
    except Exception as e:
        print(f"Error getting album: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────────────────
# /stream — Async (no cache — URLs expire)
# ────────────────────────────────────────────────────────────
@app.get("/stream")
async def stream_audio(videoId: str):
    try:
        loop = asyncio.get_event_loop()
        url = await loop.run_in_executor(
            executor,
            lambda: subprocess.check_output(
                ["yt-dlp", "-f", "bestaudio[ext=m4a]/bestaudio", "-g", f"https://www.youtube.com/watch?v={videoId}"],
                timeout=15
            ).decode("utf-8").strip()
        )
        return RedirectResponse(url=url)
    except Exception as e:
        print(f"Error streaming {videoId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────────────────
# /playlist — Async + cached
# ────────────────────────────────────────────────────────────
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
        cache_set(cache_key, results, ttl=1800)  # 30 min
        return {"data": results}
    except Exception as e:
        print(f"Error getting playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────────────────
# /lyrics — Async + cached
# ────────────────────────────────────────────────────────────
@app.get("/lyrics")
async def get_lyrics(browseId: str):
    cache_key = f"lyrics:{browseId}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(executor, lambda: yt.get_lyrics(browseId=browseId))
        cache_set(cache_key, results, ttl=86400)  # 24 hours (lyrics don't change)
        return {"data": results}
    except Exception as e:
        print(f"Error getting lyrics: {e}")
        return {"data": None}

# ────────────────────────────────────────────────────────────
# /charts — Async + cached (daily update — 60 min TTL)
# ────────────────────────────────────────────────────────────
@app.get("/charts")
async def get_charts_data(country: str = "IN"):
    cache_key = f"charts:{country}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}
    try:
        loop = asyncio.get_event_loop()

        # Step 1: Get charts metadata
        charts = await loop.run_in_executor(executor, lambda: yt.get_charts(country=country))

        songs = []
        # Step 2: Try to get songs from the chart playlist
        if charts.get("videos"):
            playlist_id = charts["videos"][0].get("playlistId")
            if playlist_id:
                playlist = await loop.run_in_executor(
                    executor,
                    lambda: yt.get_playlist(playlistId=playlist_id, limit=30)
                )
                tracks = playlist.get("tracks", []) or []
                # Only keep tracks with a valid videoId
                songs = [t for t in tracks if t.get("videoId")]

        # Step 3: Fallback — if still empty, do a direct search
        if not songs:
            print(f"Charts playlist empty for {country}, falling back to search")
            fallback = await loop.run_in_executor(
                executor,
                lambda: yt.search("India Top Songs Hindi 2025", filter="songs", limit=20)
            )
            songs = [s for s in (fallback or []) if s.get("videoId")]

        result = {"charts": charts, "songs": songs}
        cache_set(cache_key, result, ttl=3600)  # 1 hour
        return {"data": result}
    except Exception as e:
        print(f"Error fetching charts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
