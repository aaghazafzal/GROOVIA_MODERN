'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchPlaylistById } from '@/lib/api';
import { communityPlaylists } from '@/data/communityPlaylists';
import { useMusicStore } from '@/store/useMusicStore';
import Image from 'next/image';
import he from 'he';
import { BiPlay } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import Link from 'next/link';

interface PlaylistData {
    id: number;
    title: string;
    owner: string;
    songCountLabel: string;
    from: string;
    to: string;
    image?: string;
    songs?: any[];
}

const CommunityPlaylists = () => {
    const [playlistsData, setPlaylistsData] = useState<PlaylistData[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const playSong = useMusicStore((state) => state.playSong);

    useEffect(() => {
        const fetchAllPlaylists = async () => {
            try {
                setLoading(true);

                // Fetch first 4 songs from each playlist
                const promises = communityPlaylists.map(async (playlist) => {
                    try {
                        const response = await fetchPlaylistById(playlist.id.toString(), 4);
                        return {
                            ...playlist,
                            image: response.data?.image?.[2]?.url || response.data?.image?.[1]?.url,
                            songs: response.data?.songs?.slice(0, 4) || []
                        };
                    } catch (error) {
                        console.error(`Error fetching playlist ${playlist.id}:`, error);
                        return {
                            ...playlist,
                            songs: []
                        };
                    }
                });

                const results = await Promise.all(promises);
                setPlaylistsData(results);
            } catch (error) {
                console.error('Error fetching community playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPlaylists();
    }, []);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            // Desktop: scroll exactly 3 cards width
            const cardWidth = scrollRef.current.scrollWidth / playlistsData.length;
            const scrollAmount = cardWidth * 3;

            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (loading) {
        return (
            <div className="px-3 md:px-4 py-4">
                <div className="h-8 w-48 bg-white/10 rounded mb-4 animate-pulse"></div>
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
                <h2 className="text-2xl md:text-3xl font-bold text-white">From the Community</h2>

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

            {/* Playlists Grid */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory px-3 md:px-4"
            >
                {playlistsData.map((playlist) => (
                    <div
                        key={playlist.id}
                        className="flex-shrink-0 w-[85%] md:w-[32%] snap-center rounded-2xl p-4 md:p-5 group cursor-pointer"
                        style={{
                            background: `linear-gradient(135deg, ${playlist.from} 0%, ${playlist.to} 100%)`
                        }}
                    >
                        {/* Playlist Header */}
                        <div className="mb-4">
                            <h3 className="text-white font-bold text-lg md:text-xl mb-1">
                                {playlist.title}
                            </h3>
                            <p className="text-gray-400 text-xs md:text-sm">
                                {playlist.owner}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {playlist.songCountLabel}
                            </p>
                        </div>

                        {/* Song List - 4 Songs */}
                        <div className="space-y-2 mb-4">
                            {playlist.songs?.slice(0, 4).map((song, index) => (
                                <div
                                    key={song.id || index}
                                    onClick={() => playSong({
                                        ...song,
                                        type: 'song',
                                        url: song.url || '',
                                        downloadUrl: song.downloadUrl || []
                                    } as any)}
                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors group/song"
                                >
                                    {/* Mini Album Art */}
                                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                        <Image
                                            src={song.image?.[1]?.url || song.image?.[0]?.url}
                                            alt={he.decode(song.name)}
                                            fill
                                            className="object-cover"
                                            sizes="40px"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/song:opacity-100 transition-opacity flex items-center justify-center">
                                            <BiPlay size={20} className="text-white" />
                                        </div>
                                    </div>

                                    {/* Song Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium line-clamp-1">
                                            {he.decode(song.name)}
                                        </p>
                                        <p className="text-gray-400 text-xs line-clamp-1">
                                            {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* View Full Playlist Button */}
                        <Link
                            href={`/playlist/${playlist.id}`}
                            className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-full transition-colors w-fit text-sm font-medium"
                        >
                            <BiPlay size={20} />
                            <span>View full playlist</span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommunityPlaylists;
