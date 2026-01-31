'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import SongImage from '@/components/ui/SongImage';
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

const MiniPlayer = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [error, setError] = useState(false);

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

    // Fetch song URL when current song changes
    useEffect(() => {

        const fetchSongUrl = async () => {
            // Reset URL immediately to stop previous song/prevent conflicts
            setAudioUrl('');

            if (!currentSong) {
                return;
            }

            try {
                setError(false);

                // Check if it's a local song or URL already exists
                if (currentSong.type === 'local' || (currentSong.url && (currentSong.url.startsWith('http') || currentSong.url.startsWith('blob:')))) {
                    setAudioUrl(currentSong.url || '');
                    return;
                }

                // Fetch song details to get streaming URL
                const response = await api.get(`/songs/${currentSong.id}`);
                const songData = response.data?.data?.[0];

                if (songData?.downloadUrl && songData.downloadUrl.length > 0) {
                    // Get quality from settings
                    const prefQuality = userData?.settings?.streamQuality || '160kbps';

                    const qualityObj = songData.downloadUrl.find((d: any) => d.quality === prefQuality) ||
                        songData.downloadUrl.find((d: any) => d.quality === '320kbps') ||
                        songData.downloadUrl.find((d: any) => d.quality === '160kbps') ||
                        songData.downloadUrl[0];
                    setAudioUrl(qualityObj.url);
                } else {
                    console.error('No download URL found for song');
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching song URL:', err);
                setError(true);
            }
        };

        fetchSongUrl();
    }, [currentSong?.id]);

    // Handle seek requests from other components
    useEffect(() => {
        if (seekTime !== null && audioRef.current) {
            audioRef.current.currentTime = seekTime;
            useMusicStore.setState({ seekTime: null });
            // Ensure playback resumes if state is playing (Fix for Repeat One/Loop)
            if (isPlayingStore) {
                audioRef.current.play().catch(err => console.error('Resume error:', err));
            }
        }
    }, [seekTime, isPlayingStore]);

    // Sync playing state
    useEffect(() => {
        if (audioRef.current && audioUrl) {
            if (isPlayingStore) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            // Playback started successfully
                            setIsPlaying(true);
                        })
                        .catch(err => {
                            console.error('Play error:', err);
                            // Only set error state, don't interfere with store
                            if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                                setError(true);
                            }
                        });
                }
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [isPlayingStore, audioUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    const togglePlay = () => {
        if (!audioRef.current || !audioUrl) return;

        const store = useMusicStore.getState();
        const currentPlayingState = store.isPlaying;

        if (currentPlayingState) {
            store.pauseSong();
        } else {
            store.resumeSong();
        }
    };

    const formatTime = (time: number) => {
        if (!time || !isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Helper to get image URL safely
    const getImageUrl = () => {
        return currentSong?.image?.[1]?.url || currentSong?.image?.[0]?.url || null;
    };
    const imageUrl = getImageUrl();

    // Hide mobile mini-player on /player route
    const isPlayerPage = pathname === '/player';

    return (
        <>
            {/* Mobile Mini Player - Hide on player page OR when no song */}
            {!isPlayerPage && currentSong && (
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playPrevious();
                                }}
                                className="text-white opacity-80 active:opacity-100 active:scale-90 transition-all"
                            >
                                <BiSkipPrevious size={32} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlay();
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-black transition-transform active:scale-95 shadow-lg"
                                disabled={error || !audioUrl}
                            >
                                {isPlayingStore ? (
                                    <BiPause size={22} />
                                ) : (
                                    <BiPlay size={24} className="ml-0.5" />
                                )}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playNext(false);
                                }}
                                className="text-white opacity-80 active:opacity-100 active:scale-90 transition-all"
                            >
                                <BiSkipNext size={32} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-[2px] bg-white/10">
                        <div
                            className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Desktop Mini Player - Hide when no song */}
            {currentSong && (
                <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-[100]">
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-zinc-800 cursor-pointer group">
                        <div
                            className="h-full bg-primary relative"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3">
                        {/* Left: Song Info */}
                        <div className="flex items-center gap-3 w-[30%] min-w-0">
                            <div
                                onClick={() => router.push('/player')}
                                className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0 cursor-pointer bg-zinc-800"
                            >
                                <SongImage
                                    src={imageUrl}
                                    alt={currentSong.name}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                    fallbackSize={28}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3
                                    onClick={() => router.push('/player')}
                                    className="text-white font-medium text-sm line-clamp-1 cursor-pointer hover:underline"
                                >
                                    {he.decode(currentSong.name)}
                                </h3>
                                <p className="text-gray-400 text-xs line-clamp-1">
                                    {currentSong.artists?.primary?.map((a: any) => a.name).join(', ')}
                                </p>
                            </div>
                            <button
                                className="p-2 hover:bg-zinc-800 rounded"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!userData) {
                                        router.push('/login');
                                        return;
                                    }
                                    toggleLike(currentSong);
                                }}
                            >
                                {isLiked ? (
                                    <HiHeart size={20} className="text-purple-500" />
                                ) : (
                                    <HiOutlineHeart size={20} className="text-gray-400 hover:text-white" />
                                )}
                            </button>
                        </div>

                        {/* Center: Controls */}
                        <div className="flex flex-col items-center gap-2 w-[40%]">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleShuffle();
                                    }}
                                    className="p-2 hover:bg-zinc-800 rounded relative cursor-pointer"
                                >
                                    <BiShuffle size={18} className={isShuffle ? "text-purple-500" : "text-gray-400"} />
                                    {isShuffle && <span className="absolute bottom-1.5 right-2 w-1 h-1 bg-purple-500 rounded-full" />}
                                </button>
                                <button onClick={playPrevious} className="p-2 hover:bg-zinc-800 rounded">
                                    <BiSkipPrevious size={24} className="text-white" />
                                </button>
                                <button
                                    onClick={togglePlay}
                                    className="p-2 rounded-full bg-white hover:scale-105 transition-transform"
                                    disabled={error || !audioUrl}
                                >
                                    {isPlayingStore ? (
                                        <BiPause size={24} className="text-black" />
                                    ) : (
                                        <BiPlay size={24} className="text-black ml-0.5" />
                                    )}
                                </button>
                                <button onClick={() => playNext(false)} className="p-2 hover:bg-zinc-800 rounded">
                                    <BiSkipNext size={24} className="text-white" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRepeat();
                                    }}
                                    className="p-2 hover:bg-zinc-800 rounded relative cursor-pointer"
                                >
                                    <BiRepeat size={18} className={repeatMode !== 'off' ? "text-purple-500" : "text-gray-400"} />
                                    {repeatMode === 'one' && (
                                        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-purple-500 bg-zinc-900 rounded-full px-0.5 leading-none">1</span>
                                    )}
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
                                        if (audioRef.current) {
                                            audioRef.current.currentTime = Number(e.target.value);
                                        }
                                    }}
                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, #7c3aed ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #374151 ${duration > 0 ? (currentTime / duration) * 100 : 0}%)`
                                    }}
                                />
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Right: Volume & Expand */}
                        <div className="flex items-center gap-3 w-[30%] justify-end">
                            <div className="flex items-center gap-2">
                                <BiVolumeFull size={20} className="text-gray-400" />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, #7c3aed ${volume}%, #374151 ${volume}%)`
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => router.push('/player')}
                                className="p-2 hover:bg-zinc-800 rounded"
                            >
                                <BiChevronUp size={20} className="text-gray-400 hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Audio Element */}
            {audioUrl && (
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
                        playNext(true);
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
