'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import SongImage from '@/components/ui/SongImage';
import { getImageUrl as getSafeImageUrl } from '@/lib/imageUtils';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import he from 'he';
import YouTube, { YouTubeProps } from 'react-youtube';
import {
    BiPlay,
    BiPause,
    BiSkipNext,
    BiSkipPrevious,
    BiShuffle,
    BiRepeat,
    BiVolumeFull,
    BiChevronUp,
} from 'react-icons/bi';
import { HiOutlineHeart, HiHeart } from 'react-icons/hi';

const MiniPlayer = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [error, setError] = useState(false);

    // YT Player State
    const [ytPlayer, setYtPlayer] = useState<any>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const currentSong = useMusicStore((state) => state.currentSong);
    const playNext = useMusicStore((state) => state.playNext);
    const playPrevious = useMusicStore((state) => state.playPrevious);
    const isPlayingStore = useMusicStore((state) => state.isPlaying);
    const isShuffle = useMusicStore((state) => state.isShuffle);
    const repeatMode = useMusicStore((state) => state.repeatMode);
    const toggleShuffle = useMusicStore((state) => state.toggleShuffle);
    const toggleRepeat = useMusicStore((state) => state.toggleRepeat);
    const setCurrentTimeStore = useMusicStore((state) => state.setCurrentTime);
    const setDurationStore = useMusicStore((state) => state.setDuration);
    const seekTime = useMusicStore((state) => state.seekTime);

    const { userData, toggleLike } = useAuthStore();
    const isLiked = userData?.likedSongs?.some((s: any) => s.id === currentSong?.id) || false;

    // Determine Source
    const isYoutube = !!currentSong?.youtubeId;

    // Fetch song URL (for Saavn/Local)
    useEffect(() => {
        const fetchSongUrl = async () => {
            // Always clear audioUrl first to prevent ghost audio
            setAudioUrl('');

            if (!currentSong) return;
            // If Youtube, we don't need audioUrl
            if (currentSong.youtubeId) return;

            try {
                setError(false);
                if (currentSong.type === 'local' || (currentSong.url && (currentSong.url.startsWith('http') || currentSong.url.startsWith('blob:')))) {
                    setAudioUrl(currentSong.url || '');
                    return;
                }
                const response = await api.get(`/songs/${currentSong.id}`);
                const songData = response.data?.data?.[0];

                if (songData?.downloadUrl && songData.downloadUrl.length > 0) {
                    const prefQuality = userData?.settings?.streamQuality || '160kbps';
                    const qualityObj = songData.downloadUrl.find((d: any) => d.quality === prefQuality) ||
                        songData.downloadUrl.find((d: any) => d.quality === '320kbps') ||
                        songData.downloadUrl.find((d: any) => d.quality === '160kbps') ||
                        songData.downloadUrl[0];
                    setAudioUrl(qualityObj.url);
                } else {
                    console.error('No download URL found');
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching song URL:', err);
                setError(true);
            }
        };

        fetchSongUrl();
    }, [currentSong?.id]);

    // Handle Seek (Unified)
    useEffect(() => {
        if (seekTime !== null) {
            // Handle Audio Ref
            if (!isYoutube && audioRef.current) {
                audioRef.current.currentTime = seekTime;
                if (isPlayingStore) audioRef.current.play().catch(console.error);
            }
            // Handle YT Player
            if (isYoutube && ytPlayer) {
                ytPlayer.seekTo(seekTime);
                if (isPlayingStore) ytPlayer.playVideo();
            }
            useMusicStore.setState({ seekTime: null });
        }
    }, [seekTime, isPlayingStore, isYoutube, ytPlayer]);

    // Sync Playing State (Unified)
    useEffect(() => {
        if (isPlayingStore) {
            if (!isYoutube && audioRef.current && audioUrl && !error) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
            }
            if (isYoutube && ytPlayer) {
                ytPlayer.playVideo();
                setIsPlaying(true);
            }
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
            if (ytPlayer) {
                ytPlayer.pauseVideo();
                setIsPlaying(false);
            }
        }
    }, [isPlayingStore, audioUrl, isYoutube, ytPlayer, error]);

    // Sync Volume (Unified)
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
        if (ytPlayer) ytPlayer.setVolume(volume);
    }, [volume, ytPlayer]);

    // YouTube Progress Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isYoutube && isPlaying && ytPlayer) {
            interval = setInterval(() => {
                try {
                    const time = ytPlayer.getCurrentTime();
                    // YT duration might lag
                    const dur = ytPlayer.getDuration();
                    if (dur) {
                        setDuration(dur);
                        setDurationStore(dur);
                    }
                    if (time) {
                        setCurrentTime(time);
                        setCurrentTimeStore(time);
                    }
                } catch (e) { }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isYoutube, isPlaying, ytPlayer]);

    // YT Handlers
    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        setYtPlayer(event.target);
        event.target.setVolume(volume);
        if (isPlayingStore) event.target.playVideo();
    };

    const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
        // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
        if (event.data === 1) setIsPlaying(true);
        if (event.data === 2) setIsPlaying(false);
        if (event.data === 0) {
            if (repeatMode === 'one') {
                event.target.seekTo(0);
                event.target.playVideo();
            } else {
                playNext(true);
            }
        }
    };

    const togglePlay = () => {
        const store = useMusicStore.getState();
        if (store.isPlaying) store.pauseSong();
        else store.resumeSong();
    };

    const formatTime = (time: number) => {
        if (!time || !isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const imageUrl = getSafeImageUrl(currentSong?.image);
    const isPlayerPage = pathname === '/player';

    if (!currentSong) return null;

    return (
        <>
            {/* Hidden YouTube Player */}
            {isYoutube && (
                <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden' }}>
                    <YouTube
                        videoId={currentSong.youtubeId}
                        opts={{
                            height: '0',
                            width: '0',
                            playerVars: {
                                autoplay: isPlayingStore ? 1 : 0,
                                controls: 0,
                                playsinline: 1
                            }
                        }}
                        onReady={onPlayerReady}
                        onStateChange={onPlayerStateChange}
                    />
                </div>
            )}

            {/* Mobile Mini Player */}
            {!isPlayerPage && (
                <div className="md:hidden fixed bottom-[4.5rem] left-0 right-0 bg-zinc-900 rounded-t-[2rem] border-t border-white/5 shadow-[0_-8px_20px_rgba(0,0,0,0.6)] z-40 overflow-hidden">
                    <div
                        onClick={() => router.push('/player')}
                        className="flex items-center gap-3 p-3 px-5 cursor-pointer"
                    >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 shadow-lg border border-white/5">
                            <SongImage
                                src={imageUrl}
                                alt={currentSong.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                                fallbackSize={24}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-sm line-clamp-1">
                                {he.decode(currentSong.name)}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-1">
                                {currentSong.artists?.primary?.map((a: any) => a.name).join(', ')}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); playPrevious(); }}
                                className="text-white opacity-80 active:opacity-100"
                            >
                                <BiSkipPrevious size={32} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-black transition-transform active:scale-95 shadow-lg"
                                disabled={!isYoutube && !audioUrl && !error} // Allow check if youtube
                            >
                                {isPlayingStore ? <BiPause size={22} /> : <BiPlay size={24} className="ml-0.5" />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); playNext(false); }}
                                className="text-white opacity-80 active:opacity-100"
                            >
                                <BiSkipNext size={32} />
                            </button>
                        </div>
                    </div>
                    {/* Progress */}
                    <div className="w-full h-[2px] bg-white/10">
                        <div
                            className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Desktop Mini Player */}
            <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-[100]">
                <div className="w-full h-1 bg-zinc-800 cursor-pointer group"
                    onClick={(e) => {
                        // Seek calculation
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const time = percent * duration;
                        setCurrentTime(time);
                        if (isYoutube && ytPlayer) ytPlayer.seekTo(time);
                        else if (audioRef.current) audioRef.current.currentTime = time;
                    }}>
                    <div className="h-full bg-primary relative" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                    {/* Left: Info */}
                    <div className="flex items-center gap-3 w-[30%] min-w-0">
                        <div onClick={() => router.push('/player')} className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0 cursor-pointer bg-zinc-800">
                            <SongImage src={imageUrl} alt={currentSong.name} fill className="object-cover" sizes="56px" fallbackSize={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 onClick={() => router.push('/player')} className="text-white font-medium text-sm line-clamp-1 cursor-pointer hover:underline">
                                {he.decode(currentSong.name)}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-1">
                                {currentSong.artists?.primary?.map((a: any) => a.name).join(', ')}
                            </p>
                        </div>
                        <button className="p-2 hover:bg-zinc-800 rounded" onClick={(e) => { e.stopPropagation(); if (userData) toggleLike(currentSong); else router.push('/login'); }}>
                            {isLiked ? <HiHeart size={20} className="text-purple-500" /> : <HiOutlineHeart size={20} className="text-gray-400 hover:text-white" />}
                        </button>
                    </div>

                    {/* Center: Controls */}
                    <div className="flex flex-col items-center gap-2 w-[40%]">
                        <div className="flex items-center gap-4">
                            <button onClick={(e) => { e.stopPropagation(); toggleShuffle(); }} className="p-2 hover:bg-zinc-800 rounded relative cursor-pointer">
                                <BiShuffle size={18} className={isShuffle ? "text-purple-500" : "text-gray-400"} />
                                {isShuffle && <span className="absolute bottom-1.5 right-2 w-1 h-1 bg-purple-500 rounded-full" />}
                            </button>
                            <button onClick={playPrevious} className="p-2 hover:bg-zinc-800 rounded">
                                <BiSkipPrevious size={24} className="text-white" />
                            </button>
                            <button onClick={togglePlay} className="p-2 rounded-full bg-white hover:scale-105 transition-transform"
                                disabled={!isYoutube && !audioUrl && !error} >
                                {isPlayingStore ? <BiPause size={24} className="text-black" /> : <BiPlay size={24} className="text-black ml-0.5" />}
                            </button>
                            <button onClick={() => playNext(false)} className="p-2 hover:bg-zinc-800 rounded">
                                <BiSkipNext size={24} className="text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); toggleRepeat(); }} className="p-2 hover:bg-zinc-800 rounded relative cursor-pointer">
                                <BiRepeat size={18} className={repeatMode !== 'off' ? "text-purple-500" : "text-gray-400"} />
                                {repeatMode === 'one' && <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-purple-500 bg-zinc-900 rounded-full px-0.5 leading-none">1</span>}
                                {repeatMode === 'all' && <span className="absolute bottom-1.5 right-2 w-1 h-1 bg-purple-500 rounded-full" />}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 w-full">
                            <span>{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (isYoutube && ytPlayer) ytPlayer.seekTo(val);
                                    else if (audioRef.current) audioRef.current.currentTime = val;
                                    setCurrentTime(val);
                                }}
                                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                style={{ background: `linear-gradient(to right, #7c3aed ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #374151 ${duration > 0 ? (currentTime / duration) * 100 : 0}%)` }}
                            />
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Right: Volume */}
                    <div className="flex items-center gap-3 w-[30%] justify-end">
                        <div className="flex items-center gap-2">
                            <BiVolumeFull size={20} className="text-gray-400" />
                            <input
                                type="range" min="0" max="100" value={volume}
                                onChange={(e) => setVolume(Number(e.target.value))}
                                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                style={{ background: `linear-gradient(to right, #7c3aed ${volume}%, #374151 ${volume}%)` }}
                            />
                        </div>
                        <button onClick={() => router.push('/player')} className="p-2 hover:bg-zinc-800 rounded">
                            <BiChevronUp size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Standard Audio */}
            {!isYoutube && audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={(e) => {
                        const time = e.currentTarget.currentTime;
                        setCurrentTime(time); // Local state for immediate UI
                        setCurrentTimeStore(time); // Global state for sync
                    }}
                    onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        setDuration(dur);
                        setDurationStore(dur);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                        const { repeatMode } = useMusicStore.getState();
                        // Immediate loop for Repeat One for seamless experience
                        if (repeatMode === 'one' && audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { });
                        }
                        else {
                            playNext(true);
                        }
                    }}
                    onError={(e) => {
                        console.error('Audio error:', e);
                        setError(true);
                    }}
                />
            )}
        </>
    );
};

export default MiniPlayer;
