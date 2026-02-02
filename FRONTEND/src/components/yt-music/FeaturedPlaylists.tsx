'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { BiPlay, BiDotsVerticalRounded } from 'react-icons/bi';
import { RiPlayListFill } from 'react-icons/ri';
import he from 'he';

const FeaturedPlaylists = () => {
    const router = useRouter();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                setLoading(true);
                // Diverse Playlist Queries
                const queries = ['Top Hindi Playlist', 'Romantic Bollywood Playlist', 'Party Hits Hindi Playlist', 'Workout Hindi Songs Playlist', 'Travel India Playlist', 'Focus Lofi Hindi', '90s Bollywood Hits'];

                const results = await Promise.all(
                    queries.map(q =>
                        fetch(`http://localhost:8000/search?query=${encodeURIComponent(q)}&filter=playlists&limit=10`)
                            .then(res => res.json())
                            .then(data => data.data || [])
                            .catch(() => [])
                    )
                );

                const allItems = results.flat();
                // Deduplicate by browseId
                const unique = Array.from(new Map(allItems.map(item => [item.browseId, item])).values());

                // Shuffle and limit to 10 as requested
                setPlaylists(unique.sort(() => 0.5 - Math.random()).slice(0, 10));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylists();
    }, []);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 500;
            scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
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
    if (playlists.length === 0) return null;

    return (
        <div className="relative py-8 px-4 md:px-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1">Curated for you</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">Featured Playlists</h2>
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

            <div ref={scrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-4">
                    {playlists.map((playlist, idx) => (
                        <div
                            key={`${playlist.browseId}-${idx}`}
                            onClick={() => router.push(`/playlist/${playlist.browseId}`)}
                            className="flex-shrink-0 w-[42vw] sm:w-[160px] md:w-[180px] lg:w-[200px] group cursor-pointer flex flex-col gap-3"
                        >
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 shadow-md group-hover:shadow-purple-500/20 transition-all duration-300">
                                {playlist.thumbnails?.[0]?.url ? (
                                    <img
                                        src={playlist.thumbnails[playlist.thumbnails.length - 1].url}
                                        alt={playlist.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                        loading="lazy"
                                    />
                                ) : null}

                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${playlist.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                    <RiPlayListFill className="text-gray-600" size={40} />
                                </div>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                                        <BiPlay className="text-black ml-1" size={30} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <h3 className="text-white font-bold text-base truncate group-hover:text-purple-400 transition-colors" title={playlist.title}>
                                    {he.decode(playlist.title || '')}
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-gray-400 truncate">
                                    <span className="font-medium text-gray-300">Playlist</span>
                                    <span>•</span>
                                    <span className="truncate">
                                        {playlist.author?.name || playlist.author || 'YouTube Music'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="px-4 py-8 md:px-8">
        <div className="h-4 w-40 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-10 w-60 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="min-w-[42vw] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] space-y-3">
                    <div className="aspect-square bg-white/5 rounded-lg animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded w-[80%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[50%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default FeaturedPlaylists;
