'use client';

import { useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiTimeFive } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';
import { useYTCacheStore } from '@/store/useYTCacheStore';

const LongListening = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const songs = useYTCacheStore((state) => state.longListening);
    const llReady = useYTCacheStore((state) => state.llReady);
    const loading = !llReady;

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
            scrollRef.current.scrollBy({ left: direction === 'left' ? -500 : 500, behavior: 'smooth' });
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
        <div className="relative py-4 md:py-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-3 md:mb-6">
                <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1">Non-stop Jukeboxes &amp; Mashups</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">Long Listening</h2>
                </div>
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleScroll('left')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <IoChevronBack size={22} className="text-white" />
                    </button>
                    <button onClick={() => handleScroll('right')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <IoChevronForward size={22} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Scroll container — edge to edge on mobile */}
            <div ref={scrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                {/*
                  Mobile: auto-cols-[90%] (1 full item + 10% peek of next)
                  Desktop: 2 full + third peeking
                */}
                <div className="inline-grid grid-rows-4 grid-flow-col gap-x-2 gap-y-1 md:gap-x-6 md:gap-y-3 auto-cols-[90%] md:auto-cols-[40%] lg:auto-cols-[35%]">
                    {songs.map((song, idx) => (
                        <div
                            key={`${song.videoId}-${idx}`}
                            onClick={() => handlePlay(song)}
                            className="flex items-center gap-3 md:gap-4 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group select-none overflow-hidden"
                        >
                            {/* Landscape Thumbnail */}
                            <div className="relative w-24 h-14 md:w-32 md:h-[4.5rem] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
                                {song.thumbnails?.[0]?.url ? (
                                    <img
                                        src={song.thumbnails[0].url}
                                        alt={song.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                    />
                                ) : null}

                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${song.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                    <BiTimeFive className="text-gray-500" size={20} />
                                </div>

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <BiPlay className="text-white drop-shadow-lg" size={28} />
                                </div>

                                {/* Duration Badge */}
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] md:text-[10px] font-bold text-white shadow-sm">
                                    {song.duration}
                                </div>
                            </div>

                            {/* Meta — min-w-0 to stop overflow */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
                                <h3 className="text-white font-semibold text-xs md:text-sm line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors" title={song.title}>
                                    {he.decode(song.title || '')}
                                </h3>
                                <p className="text-gray-400 text-xs truncate">
                                    {song.artists?.map((a: any) => a.name).join(', ') || 'Various Artists'}
                                </p>
                            </div>

                            <button className="text-gray-500 hover:text-white p-1.5 md:p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
    <div className="py-4 md:py-8 md:px-8">
        <div className="h-4 w-40 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-48 md:w-60 bg-white/10 rounded mb-4 md:mb-6 animate-pulse" />
        {/* Mobile skeleton */}
        <div className="md:hidden">
            <div className="inline-grid grid-rows-4 grid-flow-col gap-1.5 -mx-4 px-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-2 w-[88vw]">
                        <div className="w-24 h-14 bg-white/5 rounded-lg animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 py-2">
                            <div className="h-3.5 bg-white/5 rounded w-[90%] animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-[60%] animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:grid grid-rows-4 grid-flow-col gap-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-4 w-[320px]">
                    <div className="w-32 h-[4.5rem] bg-white/5 rounded-lg animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 py-2">
                        <div className="h-4 bg-white/5 rounded w-[90%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[60%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default LongListening;
