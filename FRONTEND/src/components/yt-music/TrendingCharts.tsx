'use client';

import { useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiMusic } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';
import { useYTCacheStore } from '@/store/useYTCacheStore';

const TrendingCharts = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const songs = useYTCacheStore((state) => state.trendingCharts);
    const chartsReady = useYTCacheStore((state) => state.chartsReady);
    const loading = !chartsReady;

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);

    const handlePlay = (song: any) => {
        const allMapped = songs.map((s: any) => ({
            id: s.videoId, name: s.title, type: 'youtube', youtubeId: s.videoId, url: '',
            image: s.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [], artists: { primary: s.artists?.map((a: any) => ({ name: a.name })) || [] },
            duration: s.duration, album: { name: s.album?.name || 'YouTube Music' },
        }));
        const songObj = allMapped.find((s: any) => s.id === song.videoId) || allMapped[0];
        setQueue(allMapped);
        playSong(songObj);
    };

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    const handleImageError = (e: any) => {
        const img = e.target;
        const parent = img.parentElement;
        if (parent) {
            const fallback = parent.querySelector('.fallback-icon') as HTMLElement;
            if (fallback) { img.style.display = 'none'; fallback.style.display = 'flex'; }
        }
    };

    if (loading) return <SkeletonLoader />;
    if (songs.length === 0) return null;

    return (
        <div className="relative py-3 md:py-6">
            {/* Header — same style as QuickPicks */}
            <div className="flex justify-between items-end mb-3 md:mb-6">
                <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">India · Daily Top Charts</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">Trending Pulse</h2>
                </div>
                {/* Desktop nav arrows */}
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleScroll('left')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronBack size={22} />
                    </button>
                    <button onClick={() => handleScroll('right')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronForward size={22} />
                    </button>
                </div>
            </div>

            {/* Scroll container — same pattern as QuickPicks */}
            <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
            >
                {/*
                  Mobile: auto-cols-[92%] — 1 full column + 8% peek (4 rows)
                  Desktop: auto-cols-[30%] — 3 columns visible + 4th peeking (5 rows)
                */}
                <div className="inline-grid grid-rows-4 grid-flow-col md:grid-rows-5 gap-x-2 gap-y-1 md:gap-x-6 md:gap-y-2 auto-cols-[92%] md:auto-cols-[30%] lg:auto-cols-[28%]">
                    {songs.map((song, idx) => {
                        const rank = idx + 1;
                        const thumb = song.thumbnails?.[0]?.url;
                        const isTop3 = rank <= 3;

                        return (
                            <div
                                key={`${song.videoId}-${idx}`}
                                onClick={() => handlePlay(song)}
                                className="flex items-center gap-2.5 md:gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group select-none h-[68px] overflow-hidden"
                            >
                                {/* Rank number — tight, no fixed wide width */}
                                <div className="w-5 flex-shrink-0 text-right">
                                    <span className={`font-bold tabular-nums text-xs ${isTop3 ? 'text-purple-400' : 'text-gray-600'} group-hover:text-purple-400 transition-colors`}>
                                        {rank}
                                    </span>
                                </div>

                                {/* Thumbnail */}
                                <div className="relative w-12 h-12 md:w-11 md:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                    {thumb ? (
                                        <img
                                            src={thumb}
                                            alt={song.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            onError={handleImageError}
                                        />
                                    ) : null}
                                    <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${thumb ? 'hidden' : 'flex'}`}>
                                        <BiMusic className="text-gray-600" size={18} />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay className="text-white" size={22} />
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
                                    <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                                        {he.decode(song.title || '')}
                                    </h3>
                                    <p className="text-gray-500 text-xs truncate">
                                        {song.artists?.map((a: any) => a.name).join(', ') || '—'}
                                    </p>
                                </div>

                                {/* Menu button */}
                                <button
                                    className="text-gray-600 hover:text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <BiDotsVerticalRounded size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="py-3 md:py-6 md:px-8">
        <div className="h-4 w-36 bg-white/5 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-48 bg-white/10 rounded mb-4 md:mb-6 animate-pulse" />
        {/* Mobile skeleton */}
        <div className="md:hidden">
            <div className="inline-grid grid-rows-4 grid-flow-col gap-1 -mx-4 px-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[92vw] h-[68px] flex items-center gap-2.5 p-2">
                        <div className="w-6 h-4 bg-white/5 rounded animate-pulse flex-shrink-0" />
                        <div className="w-12 h-12 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3.5 bg-white/5 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
            <div className="inline-grid grid-rows-5 grid-flow-col gap-2 overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="w-[28vw] h-[68px] flex items-center gap-3 p-2">
                        <div className="w-6 h-4 bg-white/5 rounded animate-pulse" />
                        <div className="w-11 h-11 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-white/5 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default TrendingCharts;
