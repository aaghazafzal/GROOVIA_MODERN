'use client';

import { useState, useEffect, useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiTimeFive } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';

interface LongListeningProps { } // No props needed anymore

const LongListening = () => {
    const [songs, setSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                setLoading(true);
                // Queries: Videos usually have long durations (Mashups/Jukeboxes)
                const queries = ['Bollywood Mashup 2024', 'Hindi Nonstop Jukebox', 'Best of Arijit Singh Jukebox', 'Lofi Hindi Mashup'];

                const results = await Promise.all(
                    queries.map(q =>
                        // Explicitly request videos to get duration-heavy content
                        fetch(`http://localhost:8000/search?query=${encodeURIComponent(q)}&filter=videos&limit=10`)
                            .then(res => {
                                if (!res.ok) throw new Error('Fetch failed');
                                return res.json();
                            })
                            .then(data => data.data || [])
                            .catch(err => {
                                console.warn(`Query ${q} failed:`, err);
                                return [];
                            })
                    )
                );

                const allItems = results.flat();

                const uniqueItems = Array.from(new Map(allItems.map(item => [item.videoId, item])).values());

                // Filter: relaxed to 3 mins (180s) to ensure we get content
                const longItems = uniqueItems.filter((item: any) => {
                    if (!item.duration || !item.videoId) return false;
                    const parts = item.duration.split(':').map(Number);
                    let seconds = 0;
                    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                    else return false; // Single part (seconds only? rare)

                    return seconds > 180;
                });

                if (longItems.length > 0) {
                    setSongs(longItems.sort(() => 0.5 - Math.random()).slice(0, 16));
                } else {
                    console.log("No long items found.");
                    setSongs([]);
                }
            } catch (err) {
                console.error("Error in LongListening:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, []);

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);

    const handlePlay = (song: any) => {
        const songObj = {
            id: song.videoId,
            name: song.title,
            type: 'youtube',
            youtubeId: song.videoId,
            url: '',
            image: song.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [],
            artists: {
                primary: song.artists?.map((a: any) => ({ name: a.name })) || []
            },
            duration: song.duration,
            album: { name: song.album?.name || 'YouTube Music' },
        };

        // Radio Mode: Set queue to ONLY this song.
        // Triggers global Autoplay for infinite related songs.
        setQueue([songObj]);
        playSong(songObj);
    };

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
    if (songs.length === 0) return null;

    return (
        <div className="relative py-8 px-4 md:px-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1">Non-stop Jukeboxes & Mashups</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">Long Listening</h2>
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
                {/* 
                    Mobile: 1 full column + peek (85%)
                    Desktop: 2 full columns + half of 3rd (40% width)
                 */}
                <div className="inline-grid grid-rows-4 grid-flow-col gap-x-6 gap-y-3 auto-cols-[85%] md:auto-cols-[40%] lg:auto-cols-[35%]">
                    {songs.map((song, idx) => (
                        <div
                            key={`${song.videoId}-${idx}`}
                            onClick={() => handlePlay(song)}
                            className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group select-none"
                        >
                            {/* Landscape Thumbnail for Long Listening */}
                            <div className="relative w-32 h-[4.5rem] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
                                {song.thumbnails?.[0]?.url ? (
                                    <img
                                        src={song.thumbnails[0].url}
                                        alt={song.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                    />
                                ) : null}

                                {/* Fallback */}
                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${song.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                    <BiTimeFive className="text-gray-500" size={24} />
                                </div>

                                {/* Hover Play */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <BiPlay className="text-white drop-shadow-lg" size={32} />
                                </div>

                                {/* Duration Badge */}
                                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm">
                                    {song.duration}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight group-hover:text-purple-400 transition-colors" title={song.title}>
                                    {he.decode(song.title || '')}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="line-clamp-1 flex-1">
                                        {song.artists?.map((a: any) => a.name).join(', ') || 'Various Artists'}
                                    </span>
                                </div>
                            </div>

                            <button className="text-gray-500 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <BiDotsVerticalRounded size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const SkeletonLoader = () => (
    <div className="px-4 py-8 md:px-8">
        <div className="h-4 w-40 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-10 w-60 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="grid grid-rows-4 grid-flow-col gap-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-4 w-[80vw] md:w-[320px]">
                    <div className="w-32 h-[4.5rem] bg-white/5 rounded-lg animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 py-2">
                        <div className="h-4 bg-white/5 rounded w-[90%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[60%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default LongListening;
