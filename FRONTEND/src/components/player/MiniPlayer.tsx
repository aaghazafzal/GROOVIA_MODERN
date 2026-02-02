'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useMusicStore } from '@/store/useMusicStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import SongImage from '@/components/ui/SongImage';
import { getImageUrl as getSafeImageUrl } from '@/lib/imageUtils';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import he from 'he';
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

// Dynamically import ReactPlayer
// Using main import as v3 structure uses sub-exports but main handles detection
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const MiniPlayer = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isPlaying, setIsPlaying] = useState(false); // Local state for immediate UI feedback
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [error, setError] = useState(false);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const playerRef = useRef<any>(null); // ReactPlayer v3 ref (HTMLMediaElement-like)

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

    // Handle Source Switching & State Reset
    useEffect(() => {
        // Immediate UI Reset when song changes
        setCurrentTime(0);
        setDuration(0);
        setError(false);
        setIsPlaying(true); // Assume play will start

        // FORCE STOP previous audio immediately to prevent overlap
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src'); // Cleanest way to detach
            audioRef.current.load(); // Force reset
        }

        if (isYoutube) {
            setAudioUrl('');
        }
    }, [currentSong?.id, isYoutube]);

    // Fetch Song URL (Standard)
    useEffect(() => {
        const fetchSongUrl = async () => {
            if (!currentSong || isYoutube) return;
            setAudioUrl(''); // Reset

            try {
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
    }, [currentSong?.id, isYoutube]);

    // Seek Handler
    useEffect(() => {
        if (seekTime !== null) {
            if (isYoutube && playerRef.current) {
                // Optimize Seek: Use optimized buffering strategy
                if (typeof playerRef.current.currentTime !== 'undefined') {
                    playerRef.current.currentTime = seekTime;
                } else if (typeof playerRef.current.seekTo === 'function') {
                    playerRef.current.seekTo(seekTime, 'seconds');
                }
            } else if (!isYoutube && audioRef.current) {
                audioRef.current.currentTime = seekTime;
            }
            useMusicStore.setState({ seekTime: null });
        }
    }, [seekTime, isYoutube]);

    // Sync Volume (Standard Audio needs explicit update)
    useEffect(() => {
        if (!isYoutube && audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume, isYoutube]);

    // Sync Play/Pause for Standard Audio
    useEffect(() => {
        if (!isYoutube && audioRef.current && audioUrl && !error) {
            if (isPlayingStore) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [isPlayingStore, audioUrl, isYoutube, error]);

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
            {/* ReactPlayer for YouTube - Hidden */}
            {isYoutube && currentSong?.youtubeId && (
                <div style={{ position: 'fixed', bottom: 0, right: 0, width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none', zIndex: -5 }}>
                    <ReactPlayer
                        key={currentSong?.id || "yt-player"}
                        ref={playerRef}
                        src={`https://www.youtube.com/watch?v=${currentSong.youtubeId}&autoplay=1&controls=0&rel=0&showinfo=0&modestbranding=1&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                        playing={isPlayingStore}
                        volume={volume / 100}
                        muted={false}
                        width="100%"
                        height="100%"
                        controls={false}
                        onTimeUpdate={(e: any) => {
                            const time = e.currentTarget.currentTime;
                            if (time !== undefined && isFinite(time)) {
                                setCurrentTime(time);
                                setCurrentTimeStore(time);
                            }
                        }}
                        onLoadedMetadata={(e: any) => {
                            const dur = e.currentTarget.duration;
                            if (dur !== undefined && isFinite(dur)) {
                                setDuration(dur);
                                setDurationStore(dur);
                            }
                        }}
                        onEnded={() => {
                            if (repeatMode === 'one') {
                                if (playerRef.current) playerRef.current.currentTime = 0;
                            } else {
                                playNext(true);
                            }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onError={(e: any) => console.error("ReactPlayer Error:", e)}
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
                                disabled={!isYoutube && !audioUrl && !error}
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
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const time = percent * duration;
                        setCurrentTime(time);
                        if (isYoutube && playerRef.current) {
                            // v3 set currentTime
                            playerRef.current.currentTime = time;
                        } else if (audioRef.current) {
                            audioRef.current.currentTime = time;
                        }
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
                                    if (isYoutube && playerRef.current) playerRef.current.currentTime = val;
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
                    key={currentSong?.id || 'audio-player'}
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={(e) => {
                        const time = e.currentTarget.currentTime;
                        setCurrentTime(time);
                        setCurrentTimeStore(time);
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
