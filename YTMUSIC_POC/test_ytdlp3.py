import yt_dlp
import json

def test_ytdlp(video_id):
    ydl_opts = {
        'format': 'bestaudio',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'cookiefile': 'cookies.txt',
        'extractor_args': {
            'youtube': ['player_client=android']
        }
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"https://music.youtube.com/watch?v={video_id}", download=False)
            print(json.dumps({'url': info.get('url'), 'ext': info.get('ext')}))
        except Exception as e:
            print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    test_ytdlp('kJQP7kiw5Fk')
