'use client';

import { useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiMusic } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';
import { useYTCacheStore } from '@/store/useYTCacheStore';

const QuickPicks = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const songs = useYTCacheStore((state) => state.quickPicks);
    const qpReady = useYTCacheStore((state) => state.qpReady);
    const loading = !qpReady;

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);

    const handlePlay = (song: any) => {
        const songObj = {
            id: song.videoId,
            name: song.title,
            type: 'youtube',
            youtubeId: song.videoId,
            url: '',
            image: song.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [],
            artists: {
                primary: song.artists?.map((a: any) => ({ name: a.name })) || []
            },
            duration: song.duration,
            album: { name: song.album?.name || 'YouTube Music' },
        };
        setQueue([songObj]);
        playSong(songObj);
    };

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -400 : 400,
                behavior: 'smooth'
            });
        }
    };

    const handleImageError = (e: any) => {
        const img = e.target;
        const parent = img.parentElement;
        if (parent) {
            const fallback = parent.querySelector('.fallback-icon') as HTMLElement;
            if (fallback) {
                img.style.display = 'none';
                fallback.style.display = 'flex';
            }
        }
    };

    if (loading) return <SkeletonLoader />;
    if (songs.length === 0) return null;

    return (
        <div className="relative py-3 md:py-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-3 md:mb-6">
                <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Start Radio from a song</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">Quick Picks</h2>
                </div>

                {/* Nav Arrows - Desktop Only */}
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleScroll('left')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronBack size={22} />
                    </button>
                    <button onClick={() => handleScroll('right')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronForward size={22} />
                    </button>
                </div>
            </div>

            {/* Scroll Container — edge to edge on mobile */}
            <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
            >
                {/* 
                  Mobile: auto-cols-[92%] — 1 full column + 8% peek of next column
                  Desktop: auto-cols-[30%] — 3 columns visible + 4th peeking
                */}
                <div className="inline-grid grid-rows-4 grid-flow-col gap-x-2 gap-y-1 md:gap-x-6 md:gap-y-3 auto-cols-[92%] md:auto-cols-[30%] lg:auto-cols-[29%]">
                    {songs.map((song, idx) => (
                        <div
                            key={`${song.videoId}-${idx}`}
                            onClick={() => handlePlay(song)}
                            className="flex items-center gap-2.5 md:gap-4 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group select-none h-[68px] overflow-hidden"
                        >
                            {/* Thumb */}
                            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 shadow-lg">
                                {song.thumbnails?.[0]?.url ? (
                                    <img
                                        src={song.thumbnails[0].url}
                                        alt={song.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                    />
                                ) : null}

                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${song.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                    <BiMusic className="text-gray-500" size={20} />
                                </div>

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <BiPlay className="text-white drop-shadow-md" size={24} />
                                </div>
                            </div>

                            {/* Meta — min-w-0 ensures flex child doesn't overflow */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
                                <h3 className="text-white font-medium md:font-semibold text-sm truncate group-hover:text-purple-400 transition-colors" title={song.title}>
                                    {he.decode(song.title || 'Unknown Track')}
                                </h3>
                                <p className="text-gray-400 text-xs truncate font-medium">
                                    {song.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                                </p>
                            </div>

                            {/* Menu Button */}
                            <button
                                className="text-gray-500 hover:text-white p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); }}
                            >
                                <BiDotsVerticalRounded size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const SkeletonLoader = () => (
    <div className="py-3 md:py-6 md:px-8">
        <div className="h-4 w-32 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-40 md:w-48 bg-white/10 rounded mb-4 md:mb-8 animate-pulse" />
        {/* Mobile Skeleton */}
        <div className="md:hidden">
            <div className="inline-grid grid-rows-4 grid-flow-col gap-1.5 -mx-4 px-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-[50vw] h-[68px] flex gap-2.5 p-2">
                        <div className="w-12 h-12 bg-white/5 rounded-lg animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 py-2">
                            <div className="h-3.5 bg-white/5 rounded w-[70%] animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-[45%] animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Desktop Skeleton */}
        <div className="hidden md:grid grid-rows-4 grid-flow-col gap-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-3 w-[300px]">
                    <div className="w-16 h-16 bg-white/5 rounded-md animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 py-3">
                        <div className="h-4 bg-white/5 rounded w-[70%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[40%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default QuickPicks;
