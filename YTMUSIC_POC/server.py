from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from ytmusicapi import YTMusic
import uvicorn
import subprocess

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic
# If user provided headers/oauth later, we can init with them.
# For now, public init.
yt = YTMusic()

@app.get("/")
def read_root():
    return {"message": "Groovia YTMusic API Proxy is running"}

@app.get("/search")
def search(query: str, filter: str = None, limit: int = 20):
    try:
        # Search for songs/videos specifically if needed, or all.
        # ytmusicapi.search supports filter parameter
        results = yt.search(query, filter=filter, limit=limit)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/watch")
def get_watch_playlist(videoId: str):
    try:
        results = yt.get_watch_playlist(videoId=videoId)
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/album")
def get_album(browseId: str):
    try:
        results = yt.get_album(browseId=browseId)
        return {"data": results}
    except Exception as e:
        print(f"Error getting album: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream")
def stream_audio(videoId: str):
    try:
        # Resolve direct URL using yt-dlp
        # This allows the frontend <audio> tag to play the stream directly
        cmd = ["yt-dlp", "-f", "bestaudio[ext=m4a]/bestaudio", "-g", f"https://www.youtube.com/watch?v={videoId}"]
        url = subprocess.check_output(cmd, timeout=15).decode("utf-8").strip()
        # Redirect the client (browser) to the Google Video URL
        return RedirectResponse(url=url)
    except Exception as e:
        print(f"Error streaming {videoId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/playlist")
def get_playlist(browseId: str, limit: int = 100):
    try:
        # Fetch playlist details
        results = yt.get_playlist(playlistId=browseId, limit=limit)
        return {"data": results}
    except Exception as e:
        print(f"Error getting playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lyrics")
def get_lyrics(browseId: str):
    try:
        results = yt.get_lyrics(browseId=browseId)
        return {"data": results}
    except Exception as e:
        # Lyrics might not exist, return null or empty
        print(f"Error getting lyrics: {e}")
        return {"data": None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
