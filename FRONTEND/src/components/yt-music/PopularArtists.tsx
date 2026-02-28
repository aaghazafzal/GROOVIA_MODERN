'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { BiUser } from 'react-icons/bi';
import he from 'he';

import { useYTCacheStore } from '@/store/useYTCacheStore';

const PopularArtists = () => {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const artists = useYTCacheStore((state) => state.featuredArtists);
    const artistsReady = useYTCacheStore((state) => state.artistsReady);
    const loading = !artistsReady;

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -480 : 480, behavior: 'smooth' });
        }
    };

    const handleImageError = (e: any) => {
        const img = e.target;
        if (img) {
            img.style.display = 'none';
            const fallback = img.parentElement?.querySelector('.fallback-icon') as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
        }
    };

    if (loading) return <SkeletonLoader />;
    if (artists.length === 0) return null;

    return (
        <div className="relative py-3 md:py-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-4 md:mb-6">
                <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">YT Music · Updated Daily</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">Popular Artists</h2>
                </div>
                {/* Desktop arrows only */}
                <div className="hidden md:flex gap-2">
                    <button
                        onClick={() => handleScroll('left')}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                        aria-label="Scroll left"
                    >
                        <IoChevronBack size={22} />
                    </button>
                    <button
                        onClick={() => handleScroll('right')}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                        aria-label="Scroll right"
                    >
                        <IoChevronForward size={22} />
                    </button>
                </div>
            </div>

            {/* Single row horizontal scroll — edge to edge on mobile */}
            <div
                ref={scrollRef}
                className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
            >
                {artists.map((artist, idx) => {
                    const thumb =
                        artist.thumbnails?.find((t: any) => t.width >= 200)?.url ||
                        artist.thumbnails?.[artist.thumbnails.length - 1]?.url ||
                        artist.thumbnails?.[0]?.url;

                    return (
                        <div
                            key={`${artist.browseId}-${idx}`}
                            onClick={() => router.push(`/artist/${artist.browseId}`)}
                            className="flex-shrink-0 flex flex-col items-center gap-2.5 md:gap-3 cursor-pointer group"
                        >
                            {/* Circular Artist Image — w-36 mobile / w-44 desktop */}
                            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-transparent group-hover:ring-purple-500/60 transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]">
                                {thumb ? (
                                    <img
                                        src={thumb}
                                        alt={artist.name || artist.artist}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                    />
                                ) : null}
                                {/* Fallback icon */}
                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${thumb ? 'hidden' : 'flex'}`}>
                                    <BiUser className="text-gray-500" size={36} />
                                </div>
                                {/* Subtle gradient overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                            </div>

                            {/* Artist Name */}
                            <div className="text-center w-36 md:w-44">
                                <p className="text-white text-sm md:text-base font-medium leading-tight line-clamp-2 group-hover:text-purple-400 transition-colors">
                                    {he.decode(artist.name || artist.artist || 'Unknown')}
                                </p>
                                {artist.subscribers && (
                                    <p className="text-gray-500 text-xs md:text-sm mt-0.5 truncate">{artist.subscribers}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* Skeleton */
const SkeletonLoader = () => (
    <div className="py-3 md:py-6">
        <div className="h-4 w-40 bg-white/5 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-52 bg-white/10 rounded mb-4 md:mb-6 animate-pulse" />
        <div className="flex gap-4 md:gap-6 overflow-hidden -mx-4 px-4 md:mx-0 md:px-0">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2.5">
                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-white/5 animate-pulse" />
                    <div className="w-24 md:w-32 h-4 bg-white/5 rounded animate-pulse" />
                </div>
            ))}
        </div>
    </div>
);

export default PopularArtists;
