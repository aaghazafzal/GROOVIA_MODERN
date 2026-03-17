"""
FastAPI wrapper for YouTube scraper
"""

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, HTMLResponse
import httpx
import logging
import os
from html_ui import HTML_CONTENT

from scraper import extract_streams, get_best_audio, get_best_video, get_audio_by_quality

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="YouTube Direct Link Scraper",
    description="Extract direct audio/video stream URLs from YouTube",
    version="1.0.0"
)

# CORS - Allow all origins for now (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return HTMLResponse(content=HTML_CONTENT)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/extract/{video_id}")
def extract(video_id: str):
    """
    Extract all audio and video streams for a video
    Returns JSON with stream URLs and metadata
    """
    try:
        result = extract_streams(video_id)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Extract error for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audio/{video_id}")
def audio(
    video_id: str,
    quality: str = Query("high", description="Audio quality: high or low"),
    redirect: bool = Query(False, description="Redirect to direct URL")
):
    """
    Get best audio stream URL
    """
    try:
        stream = get_audio_by_quality(video_id, quality)
        if not stream:
            raise HTTPException(status_code=404, detail="No audio stream found")

        if redirect:
            return RedirectResponse(url=stream["url"])

        return {
            "success": True,
            "data": stream
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio error for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/{video_id}")
def video(
    video_id: str,
    max_quality: str = Query("1080p", description="Max video quality"),
    redirect: bool = Query(False, description="Redirect to direct URL")
):
    """
    Get best video stream URL
    """
    try:
        stream = get_best_video(video_id, max_quality)
        if not stream:
            raise HTTPException(status_code=404, detail="No video stream found")

        if redirect:
            return RedirectResponse(url=stream["url"])

        return {
            "success": True,
            "data": stream
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video error for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream/{video_id}")
async def stream(
    video_id: str,
    quality: str = Query("high", description="Audio quality"),
    range: str = Header(None, alias="range")
):
    """
    Proxy stream audio (for CORS compatibility)
    Supports HTTP Range requests for seeking
    """
    try:
        stream_data = get_audio_by_quality(video_id, quality)
        if not stream_data:
            raise HTTPException(status_code=404, detail="No audio stream found")

        url = stream_data["url"]
        mime_type = stream_data.get("mimeType", "audio/mp4")

        # Headers for the request to YouTube
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "identity",
            "Referer": "https://www.youtube.com/",
        }

        if range:
            headers["Range"] = range

        async def proxy_generator():
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", url, headers=headers, follow_redirects=True) as response:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        yield chunk

        response_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": mime_type,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache",
        }

        status_code = 206 if range else 200

        return StreamingResponse(
            proxy_generator(),
            status_code=status_code,
            media_type=mime_type,
            headers=response_headers
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stream error for {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
