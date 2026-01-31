'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import SongImage from '@/components/ui/SongImage';
import Link from 'next/link';
import he from 'he';

interface Playlist {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    songCount?: number;
    description?: string;
}

const categories = [
    { id: 'all', label: 'All', query: '' },
    { id: 'hindi', label: 'Hindi', query: 'Hindi' },
    { id: 'punjabi', label: 'Punjabi', query: 'Punjabi' },
    { id: 'bengali', label: 'Bengali', query: 'Bengali' },
    { id: 'tamil', label: 'Tamil', query: 'Tamil' },
    { id: 'telugu', label: 'Telugu', query: 'Telugu' },
    { id: 'english', label: 'English', query: 'English' },
];

export default function DiscoverPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                setLoading(true);
                const category = categories.find(c => c.id === selectedCategory);

                const response = await api.get('/search/playlists', {
                    params: {
                        query: category?.query || 'top',
                        limit: 50
                    }
                });

                if (response.data?.data?.results) {
                    setPlaylists(response.data.data.results);
                }
            } catch (error) {
                console.error('Error fetching playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlaylists();
    }, [selectedCategory]);

    return (
        <div className="min-h-screen pb-32 bg-sidebar">
            {/* Header - Reduced top padding */}
            <div className="pt-6 pb-4 px-4 md:px-6 bg-sidebar">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    Discover
                </h1>
                <p className="text-gray-400 text-sm md:text-base">
                    Explore curated playlists for every mood and genre
                </p>
            </div>

            {/* Category Tabs - Properly Sticky */}
            <div className="sticky top-0 z-20 bg-sidebar/95 backdrop-blur-lg border-b border-zinc-800/50">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 md:px-6 py-3">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${selectedCategory === category.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'
                                }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Playlists Grid */}
            <div className="py-6 md:px-6 bg-sidebar">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-4">
                        {[...Array(14)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-square bg-zinc-900 rounded-lg animate-pulse"></div>
                                <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ) : playlists.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-4">
                        {playlists.map((playlist) => (
                            <Link
                                key={playlist.id}
                                href={`/playlist/${playlist.id}`}
                                className="group cursor-pointer"
                            >
                                <div className="space-y-3">
                                    {/* Square Album Art */}
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900">
                                        <SongImage
                                            src={
                                                playlist.image?.[2]?.url ||
                                                playlist.image?.[1]?.url ||
                                                playlist.image?.[0]?.url
                                            }
                                            alt={he.decode(playlist.name)}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-105"
                                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16.66vw, 14.28vw"
                                            fallbackSize={60}
                                        />
                                    </div>

                                    {/* Playlist Info */}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm md:text-base line-clamp-2 mb-1">
                                            {he.decode(playlist.name)}
                                        </h3>
                                        {playlist.description && (
                                            <p className="text-gray-400 text-xs md:text-sm line-clamp-1">
                                                {he.decode(playlist.description)}
                                            </p>
                                        )}
                                        {playlist.songCount && (
                                            <p className="text-gray-500 text-xs mt-1">
                                                {playlist.songCount} songs
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-lg">
                            No playlists found in this category
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
