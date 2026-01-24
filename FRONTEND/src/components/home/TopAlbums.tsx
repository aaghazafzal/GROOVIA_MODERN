'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

interface Album {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    artists?: {
        primary?: { name: string }[];
    };
    year?: string;
}

const TopAlbums = () => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAlbums = async () => {
            try {
                setLoading(true);
                const response = await api.get('/search/albums', {
                    params: { query: 'latest', limit: 12 }
                });

                if (response.data?.data?.results) {
                    setAlbums(response.data.data.results);
                }
            } catch (error) {
                console.error('Error fetching top albums:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbums();
    }, []);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            // Desktop: scroll exactly 3 cards width
            const cardWidth = scrollRef.current.scrollWidth / albums.length;
            const scrollAmount = cardWidth * 3;

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
                <div className="flex gap-3 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="min-w-[85%] md:min-w-[32%] h-64 bg-zinc-900 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-3 md:px-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Top Albums</h2>

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

            {/* Albums Grid - CommunityPlaylists Style */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory px-3 md:px-4"
            >
                {albums.map((album) => (
                    <Link
                        key={album.id}
                        href={`/album/${album.id}`}
                        className="flex-shrink-0 w-[85%] md:w-[32%] snap-center cursor-pointer group"
                    >
                        {/* Album Card */}
                        <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-5 hover:bg-zinc-900/70 transition-colors">
                            {/* Album Cover */}
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4">
                                <Image
                                    src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                                    alt={he.decode(album.name)}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                    sizes="(max-width: 768px) 85vw, 32vw"
                                />
                            </div>

                            {/* Album Info */}
                            <div>
                                <h3 className="text-white font-bold text-base md:text-lg line-clamp-1 mb-1">
                                    {he.decode(album.name)}
                                </h3>
                                {album.artists?.primary && (
                                    <p className="text-gray-400 text-sm line-clamp-1 mb-1">
                                        {album.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                )}
                                {album.year && (
                                    <p className="text-gray-500 text-xs">
                                        {album.year} • Album
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

export default TopAlbums;
