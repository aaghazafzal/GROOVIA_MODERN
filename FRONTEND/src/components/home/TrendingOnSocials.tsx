'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import Image from 'next/image';
import he from 'he';
import { BiPlay, BiDotsVerticalRounded } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

interface Song {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    artists: {
        primary: { name: string }[];
    };
    duration?: number;
    album?: {
        name: string;
    };
}

const TrendingOnSocials = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const playSong = useMusicStore((state) => state.playSong);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Search for "Now Trending" playlist
                const searchResponse = await api.get('/search/playlists', {
                    params: { query: 'Now Trending', limit: 5 }
                });

                const results = searchResponse.data?.data?.results || [];

                if (results.length > 0) {
                    // Find the best match
                    const match = results.find((p: any) =>
                        p.url?.includes('now-trending') ||
                        p.name?.toLowerCase().includes('now trending')
                    ) || results[0];

                    // Fetch playlist songs
                    const playlistResponse = await api.get('/playlists', {
                        params: { id: match.id, limit: 24 }
                    });

                    if (playlistResponse.data.success && playlistResponse.data.data.songs) {
                        setSongs(playlistResponse.data.data.songs.slice(0, 24));
                    }
                }
            } catch (error) {
                console.error('Error fetching Trending On Socials:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 600;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Mobile: 16 songs (4 rows × 4 columns), Desktop: 24 songs (4 rows × 6 columns)
    const mobileSongs = songs.slice(0, 16);
    const desktopSongs = songs.slice(0, 24);

    if (loading) {
        return (
            <div className="px-4 py-4">
                <div className="h-8 w-48 bg-white/10 rounded mb-4 animate-pulse"></div>
                {/* Mobile Skeleton */}
                <div className="md:hidden">
                    <div className="inline-grid grid-rows-4 grid-flow-col gap-1.5">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-[60vw] h-[68px] bg-zinc-900 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                </div>
                {/* Desktop Skeleton */}
                <div className="hidden md:grid grid-rows-4 grid-flow-col gap-2">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="h-[70px] bg-zinc-900 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (songs.length === 0) return null;

    return (
        <>
            {/* Mobile View - Horizontal Scrolling Grid (4 rows max) */}
            <div className="md:hidden px-4 py-3">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold text-white">Trending On Socials</h2>
                </div>

                {/* Horizontal Scrolling Container with Grid */}
                <div className="overflow-x-scroll scrollbar-hide -mx-4 px-4 scroll-smooth">
                    <div className="inline-grid grid-rows-4 grid-flow-col gap-1.5 auto-cols-[60%]">
                        {mobileSongs.map((song) => (
                            <div
                                key={song.id}
                                onClick={() => playSong({
                                    ...song,
                                    type: 'song',
                                    url: (song as any).url || '',
                                    downloadUrl: (song as any).downloadUrl || []
                                } as any)}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group h-[68px]"
                            >
                                {/* Album Art */}
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                        src={song.image[1]?.url || song.image[0]?.url}
                                        alt={he.decode(song.name)}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay size={24} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium text-sm line-clamp-1">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>

                                {/* Three Dots Menu */}
                                <button
                                    className="text-gray-400 hover:text-white p-1.5 transition-colors flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Menu logic here
                                    }}
                                >
                                    <BiDotsVerticalRounded size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop View - Horizontal Scrolling Grid (3 columns visible, 4 rows) */}
            <div className="hidden md:block relative py-4 px-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-white">Trending On Socials</h2>

                    {/* Navigation Arrows */}
                    <div className="flex gap-2">
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

                {/* Horizontal Scrollable Grid - 3 Columns Layout */}
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth"
                >
                    <div className="inline-grid grid-rows-4 grid-flow-col gap-2 auto-cols-[32%]">
                        {desktopSongs.map((song) => (
                            <div
                                key={song.id}
                                onClick={() => playSong({
                                    ...song,
                                    type: 'song',
                                    url: (song as any).url || '',
                                    downloadUrl: (song as any).downloadUrl || []
                                } as any)}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                {/* Album Art */}
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                        src={song.image[2]?.url || song.image[1]?.url}
                                        alt={he.decode(song.name)}
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay size={28} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-sm line-clamp-1">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>

                                {/* Three Dots Menu */}
                                <button
                                    className="text-gray-400 hover:text-white p-2 transition-colors flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Menu logic here
                                    }}
                                >
                                    <BiDotsVerticalRounded size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TrendingOnSocials;
