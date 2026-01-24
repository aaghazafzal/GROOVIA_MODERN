'use client';

import { useEffect, useState } from 'react';
import { fetchPlaylistById } from '@/lib/api';
import Image from 'next/image';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';

interface Song {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    artists: {
        primary: { name: string }[];
    };
}

const SpeedDial = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const playSong = useMusicStore((state) => state.playSong);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetchPlaylistById('110858205', 9); // Trending Today

                if (response.success && response.data.songs) {
                    setSongs(response.data.songs.slice(0, 9));
                }
            } catch (error) {
                console.error('Error fetching Speed Dial data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="px-4 py-6 md:hidden">
                <div className="mb-4">
                    <div className="h-6 w-24 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="aspect-square bg-zinc-900 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 md:hidden">
            {/* Header - Just "Trending" */}
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Trending</h2>
            </div>

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-2">
                {songs.map((song) => (
                    <div
                        key={song.id}
                        onClick={() => playSong(song as any)}
                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border-2 border-transparent hover:border-white transition-all duration-200"
                    >
                        <Image
                            src={song.image[2]?.url || song.image[0]?.url}
                            alt={he.decode(song.name)}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw"
                        />
                        {/* Overlay with title */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                            <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                                {he.decode(song.name)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpeedDial;
