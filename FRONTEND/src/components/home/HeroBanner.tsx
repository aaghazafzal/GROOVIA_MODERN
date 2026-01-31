'use client';

import { useEffect, useState } from 'react';
import { fetchPlaylistById } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import SongImage from '@/components/ui/SongImage';
import { BiPlay } from 'react-icons/bi';
import he from 'he';

interface Song {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    artists: {
        primary: { name: string }[];
    };
    duration?: number;
}

const HeroBanner = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
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
                console.error('Error fetching Hero Banner data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (songs.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % songs.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [songs.length]);

    if (loading) {
        return (
            <div className="hidden md:block relative h-[60vh] min-h-[500px] rounded-[2rem] overflow-hidden bg-zinc-900 animate-pulse">
                <div className="absolute inset-0 flex items-end p-12">
                    <div className="space-y-4 w-full max-w-2xl">
                        <div className="h-4 w-24 bg-white/10 rounded"></div>
                        <div className="h-12 w-3/4 bg-white/10 rounded"></div>
                        <div className="h-6 w-1/2 bg-white/10 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const currentSong = songs[currentIndex];

    if (!currentSong) return null;

    return (
        <div className="hidden md:block relative h-[60vh] min-h-[500px] rounded-[2rem] overflow-hidden group">
            {/* Background Image with Smooth Transition */}
            <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
                <SongImage
                    src={currentSong.image[currentSong.image.length - 1]?.url}
                    alt={he.decode(currentSong.name)}
                    fill
                    className="object-cover"
                    priority
                    sizes="100vw"
                    fallbackSize={100}
                />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8 md:p-12">
                <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 backdrop-blur-md rounded-full border border-primary/20 w-fit">
                    Trending Now
                </span>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 drop-shadow-2xl leading-tight line-clamp-2">
                    {he.decode(currentSong.name)}
                </h1>

                <p className="text-gray-300 text-lg md:text-xl mb-8 font-light">
                    {currentSong.artists.primary.map((a) => a.name).join(', ')}
                </p>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => playSong({
                            ...currentSong,
                            type: 'song',
                            url: (currentSong as any).url || '',
                            downloadUrl: (currentSong as any).downloadUrl || []
                        } as any)}
                        className="bg-primary hover:bg-primary-dark text-white pl-6 pr-8 py-3 md:py-4 rounded-full font-bold text-base md:text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(124,58,237,0.4)] flex items-center gap-2 group/btn"
                    >
                        <span className="bg-white text-primary rounded-full p-1 group-hover/btn:scale-110 transition-transform">
                            <BiPlay className="ml-0.5" size={24} />
                        </span>
                        Play Now
                    </button>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 mt-8">
                    {songs.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-8 bg-primary'
                                : 'w-2 bg-white/30 hover:bg-white/50'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;
