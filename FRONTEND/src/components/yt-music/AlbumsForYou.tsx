'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BiPlay, BiAlbum } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useYTCacheStore } from '@/store/useYTCacheStore';

const AlbumsForYou = () => {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const albums = useYTCacheStore((state) => state.albumsForYou);
    const afyReady = useYTCacheStore((state) => state.afyReady);
    const loading = !afyReady;

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
    if (albums.length === 0) return null;

    return (
        <div className="relative py-4 md:py-8 md:px-8 bg-gradient-to-b from-transparent to-black/20">
            {/* Header */}
            <div className="flex justify-between items-end mb-4 md:mb-6">
                <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1">RECOMMENDED FOR YOU</span>
                    <h2 className="text-2xl md:text-4xl font-bold text-white">Albums for You</h2>
                </div>
                {/* Desktop Nav */}
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleScroll('left')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <IoChevronBack size={22} className="text-white" />
                    </button>
                    <button onClick={() => handleScroll('right')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <IoChevronForward size={22} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Content — edge to edge on mobile */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
            >
                {albums.map((album, idx) => (
                    <div
                        key={`${album.browseId}-${idx}`}
                        onClick={() => router.push(`/album/${album.browseId}`)}
                        className="flex-shrink-0 w-[42vw] sm:w-[160px] md:w-[180px] lg:w-[200px] group cursor-pointer flex flex-col gap-2 md:gap-3"
                    >
                        {/* Card Image */}
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 shadow-md group-hover:shadow-purple-500/20 transition-all duration-300">
                            {album.thumbnails?.[0]?.url ? (
                                <img
                                    src={album.thumbnails[album.thumbnails.length - 1].url}
                                    alt={album.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={handleImageError}
                                    loading="lazy"
                                />
                            ) : null}

                            <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${album.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                <BiAlbum className="text-gray-600" size={40} />
                            </div>

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                    <BiPlay className="text-black ml-1" size={26} />
                                </div>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-col">
                            <h3 className="text-white font-semibold text-sm md:text-base truncate group-hover:text-purple-400 transition-colors" title={album.title}>
                                {he.decode(album.title || '')}
                            </h3>
                            <div className="flex items-center gap-1 text-xs md:text-sm text-gray-400 truncate">
                                <span className="font-medium text-gray-300">{album.type || 'Album'}</span>
                                <span>•</span>
                                <span className="truncate">{album.artists?.map((a: any) => a.name).join(', ') || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const SkeletonLoader = () => (
    <div className="py-4 md:py-8 md:px-8">
        <div className="h-4 w-40 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-48 md:w-60 bg-white/10 rounded mb-4 md:mb-6 animate-pulse" />
        <div className="flex gap-3 md:gap-4 overflow-hidden -mx-4 px-4 md:mx-0 md:px-0">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[42vw] sm:w-[160px] md:w-[180px] lg:w-[200px] space-y-2 md:space-y-3">
                    <div className="aspect-square bg-white/5 rounded-lg animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="h-3.5 bg-white/5 rounded w-[80%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[50%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default AlbumsForYou;
