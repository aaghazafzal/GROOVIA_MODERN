'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchPlaylistById } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import Image from 'next/image';
import he from 'he';
import { BiPlay } from 'react-icons/bi';
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

const NewSongs = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const playSong = useMusicStore((state) => state.playSong);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Playlist ID: 6689255 (from old website)
                const response = await fetchPlaylistById('6689255', 30);

                if (response.success && response.data.songs) {
                    setSongs(response.data.songs.slice(0, 30));
                }
            } catch (error) {
                console.error('Error fetching New Songs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
            <div className="px-4 py-4">
                <div className="h-8 w-32 bg-white/10 rounded mb-4 animate-pulse"></div>
                {/* Mobile Skeleton */}
                <div className="md:hidden flex gap-4 overflow-hidden">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="min-w-[85%] aspect-[3/4] bg-zinc-900 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
                {/* Desktop Skeleton */}
                <div className="hidden md:grid grid-cols-6 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square bg-zinc-900 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile View - Large Portrait Cards */}
            <div className="md:hidden px-3 py-4">
                <h2 className="text-2xl font-bold text-white mb-4">New Songs</h2>

                <div className="flex gap-3 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory">
                    {songs.map((song) => (
                        <div
                            key={song.id}
                            onClick={() => playSong({
                                ...song,
                                type: 'song',
                                url: (song as any).url || '',
                                downloadUrl: (song as any).downloadUrl || []
                            } as any)}
                            className="flex-shrink-0 w-[85%] snap-center cursor-pointer group"
                        >
                            {/* Large Album Art */}
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3">
                                {song.image[song.image.length - 1]?.url ? (
                                    <Image
                                        src={song.image[song.image.length - 1]?.url}
                                        alt={he.decode(song.name)}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 85vw"
                                        quality={100}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <BiPlay size={40} className="text-gray-600" />
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <div className="bg-primary text-white p-4 rounded-full shadow-xl">
                                        <BiPlay size={40} className="ml-0.5" />
                                    </div>
                                </div>

                                {/* Song Info at Bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h3 className="text-white font-bold text-lg line-clamp-2 mb-1">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-300 text-sm line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop View - 6 Card Grid with Arrows */}
            <div className="hidden md:block px-4 py-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-white">New Songs</h2>

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

                {/* Horizontal Scrollable Grid */}
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth"
                >
                    <div className="inline-flex gap-3">
                        {songs.map((song) => (
                            <div
                                key={song.id}
                                onClick={() => playSong({
                                    ...song,
                                    type: 'song',
                                    url: (song as any).url || '',
                                    downloadUrl: (song as any).downloadUrl || []
                                } as any)}
                                className="flex-shrink-0 w-[200px] p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                            >
                                {/* Album Art */}
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-shadow">
                                    {song.image[song.image.length - 1]?.url ? (
                                        <Image
                                            src={song.image[song.image.length - 1]?.url}
                                            alt={he.decode(song.name)}
                                            fill
                                            className="object-cover"
                                            sizes="200px"
                                            quality={100}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <BiPlay size={24} className="text-gray-600" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-primary text-white p-3 rounded-full shadow-xl transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                                            <BiPlay size={28} className="ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="space-y-1">
                                    <h3 className="text-white font-semibold text-sm line-clamp-2">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default NewSongs;
