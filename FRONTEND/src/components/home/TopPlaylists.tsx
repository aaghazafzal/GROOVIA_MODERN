'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

interface Playlist {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    songCount?: number;
    description?: string;
}

const TopPlaylists = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                setLoading(true);
                const response = await api.get('/search/playlists', {
                    params: { query: 'Top', limit: 12 }
                });

                if (response.data?.data?.results) {
                    setPlaylists(response.data.data.results);
                }
            } catch (error) {
                console.error('Error fetching top playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlaylists();
    }, []);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 800;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (loading) {
        return (
            <div className="py-4 px-3 md:px-4">
                <div className="h-8 w-32 bg-white/10 rounded mb-4 animate-pulse"></div>
                <div className="flex gap-3 md:gap-4 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[165px] md:w-[200px]">
                            <div className="w-full aspect-square bg-zinc-900 rounded-lg animate-pulse mb-3"></div>
                            <div className="h-4 bg-white/10 rounded mb-2 animate-pulse"></div>
                            <div className="h-3 bg-white/10 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-3 md:px-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Top Playlists</h2>

                {/* Desktop Arrows */}
                <div className="hidden md:flex gap-2">
                    <button
                        onClick={() => handleScroll('left')}
                        className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
                        aria-label="Scroll left"
                    >
                        <IoChevronBack size={20} />
                    </button>
                    <button
                        onClick={() => handleScroll('right')}
                        className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
                        aria-label="Scroll right"
                    >
                        <IoChevronForward size={20} />
                    </button>
                </div>
            </div>

            {/* Playlists Grid - Apple Music Style (Same as Golden Era) */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-scroll scrollbar-hide scroll-smooth px-3 md:px-4"
            >
                {playlists.map((playlist) => (
                    <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                    >
                        <div className="w-[165px] md:w-[200px]">
                            {/* Square Album Art */}
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-900">
                                <Image
                                    src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                                    alt={he.decode(playlist.name)}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                    sizes="(max-width: 768px) 165px, 200px"
                                />
                            </div>

                            {/* Playlist Info */}
                            <div className="space-y-1">
                                <h3 className="text-white font-semibold text-sm md:text-base line-clamp-1">
                                    {he.decode(playlist.name)}
                                </h3>
                                {playlist.description && (
                                    <p className="text-gray-400 text-xs md:text-sm line-clamp-1">
                                        {he.decode(playlist.description)}
                                    </p>
                                )}
                                {playlist.songCount && (
                                    <p className="text-gray-500 text-xs">
                                        Playlist • {playlist.songCount} songs
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default TopPlaylists;
