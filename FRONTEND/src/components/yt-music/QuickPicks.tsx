'use client';

import { useState, useEffect, useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiMusic } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';

interface QuickPicksProps { } // No props needed anymore

const QuickPicks = () => {
    const [songs, setSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch diverse songs to simulate Quick Picks
    useEffect(() => {
        const fetchSongs = async () => {
            try {
                setLoading(true);
                // Combined queries to get individual songs
                const queries = ['Bollywood Top 50', 'Arijit Singh Best', 'Global Top 50', 'Trending Reels', 'Punjabi Top Hits'];

                // Fetch all in parallel
                // Use limit=10 per query to get enough candidates
                const results = await Promise.all(
                    queries.map(q =>
                        fetch(`http://localhost:8000/search?query=${encodeURIComponent(q)}&filter=songs&limit=10`)
                            .then(res => res.json())
                            .then(data => data.data || [])
                            .catch(() => [])
                    )
                );

                const allSongs = results.flat();

                // Remove duplicates by videoId
                const uniqueSongsMap = new Map();
                allSongs.forEach((item: any) => {
                    if (item.videoId) uniqueSongsMap.set(item.videoId, item);
                });

                const uniqueSongs = Array.from(uniqueSongsMap.values());

                // Shuffle and Slice to 16
                const shuffled = uniqueSongs.sort(() => 0.5 - Math.random());
                setSongs(shuffled.slice(0, 16));

            } catch (err) {
                console.error("Error fetching Quick Picks:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, []);

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);

    const handlePlay = (song: any) => {
        // Convert YT format to Store Song format
        const songObj = {
            id: song.videoId,
            name: song.title,
            type: 'youtube', // Mark as YouTube source
            youtubeId: song.videoId,
            url: '',
            image: song.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [], // Not applicable
            artists: {
                primary: song.artists?.map((a: any) => ({ name: a.name })) || []
            },
            duration: song.duration,
            album: { name: song.album?.name || 'YouTube Music' },
        };

        // Radio Mode: Set queue to ONLY this song.
        // This triggers the Store's "Autoplay" logic immediately when this song ends,
        // fetching "Related/Watch Playlist" songs, which matches user expectation.
        setQueue([songObj]);
        playSong(songObj);
    };

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            // Adjust scroll amount to match roughly one column group width
            const scrollAmount = direction === 'left' ? -400 : 400;
            scrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Fallback Image Handler
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

    // If no songs found, return nothing or skeleton? Return nothing to avoid broken UI.
    if (songs.length === 0) return null;

    return (
        <div className="relative py-6 px-4 md:px-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Start Radio from a song</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">Quick Picks</h2>
                </div>

                {/* Nav Arrows - Desktop Only */}
                <div className="hidden md:flex gap-2">
                    <button onClick={() => handleScroll('left')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronBack size={22} />
                    </button>
                    <button onClick={() => handleScroll('right')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5">
                        <IoChevronForward size={22} />
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
            >
                {/* Grid Layout: 4 Rows. 
                     Refined Sizing per USER request:
                     Mobile: First column full, second peaks. -> auto-cols-[85%] is mostly fine, maybe [90%] for less peek or [80%] for more.
                     User said: "mobile mein first column dikhega pura or second column ka thoda sa".
                     [85%] achieves this (15% peek). Let's adjust to [88%] to be safe or keep [85%].
                     
                     Desktop: "3 column laptop mein 1 baar dikhe third column ka thoda sa hide rahe". 
                     Wait. "3 column... dikhe... third column ka hide rahe"?
                     If 3 columns visible: 33% each.
                     If "3 column laptop mein 1 baar dikhe... 3rd ka bhi jitna hide tha... or 4th column aaye".
                     Maybe user means: See 3 full columns? Or 3 columns where 3rd is partial?
                     "3 column laptop mein 1 baar dikhe, third column ka thoda sa hide rahe" -> This implies < 3 full columns visible?
                     "uske baad slide krne se 4th column aaye".
                     Usually 3 full + peek 4th is standard.
                     If user wants 3 columns visible, use ~32%. (3 * 32 = 96% + gaps).
                     User said "3 column laptop mein 1 baar dikhe (See 3 columns once)... third column ka thoda sa hide rahe (Third column slightly hidden?)".
                     This phrasing is redundant. Maybe "See 2 full, 3rd partial"? 
                     OR "See 3 full, 4th partial"?
                     "slide krne se 4th column aaye".
                     I'll assume **3 Full + 4th Peeking**.
                     Calculation: 3 * X + Gaps < 100%. 
                     But if 4th peeks, then X should be around 30%. 30+30+30 = 90%. 10% for 4th peek.
                     Current was [33%] or [24%].
                     I'll set Desktop to `md:auto-cols-[30%]`. 
                     (3 columns = 90% space + gaps. 4th peeks).
                     
                     Mobile: `auto-cols-[85%]` (1 full, 2nd peeks 15%).
                 */}
                <div className="inline-grid grid-rows-4 grid-flow-col gap-x-6 gap-y-3 auto-cols-[85%] md:auto-cols-[30%] lg:auto-cols-[29%]">
                    {songs.map((song, idx) => (
                        <div
                            key={`${song.videoId}-${idx}`}
                            onClick={() => handlePlay(song)}
                            className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group select-none"
                        >
                            {/* Thumb */}
                            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 shadow-lg">
                                {song.thumbnails?.[0]?.url ? (
                                    <img
                                        src={song.thumbnails[0].url}
                                        alt={song.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageError}
                                    />
                                ) : null}

                                {/* Fallback Icon (Starts Hidden) */}
                                <div className={`fallback-icon absolute inset-0 bg-zinc-800 flex items-center justify-center ${song.thumbnails?.[0]?.url ? 'hidden' : 'flex'}`}>
                                    <BiMusic className="text-gray-500" size={24} />
                                </div>

                                {/* Hover Play Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                    <BiPlay className="text-white drop-shadow-md" size={32} />
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors" title={song.title}>
                                    {he.decode(song.title || 'Unknown Track')}
                                </h3>
                                <p className="text-gray-400 text-xs line-clamp-1 font-medium">
                                    {song.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                                </p>
                            </div>

                            {/* Menu Button */}
                            <button
                                className="text-gray-500 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); }}
                            >
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
    <div className="px-4 py-6 md:px-8">
        <div className="h-4 w-32 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-10 w-48 bg-white/10 rounded mb-8 animate-pulse" />
        <div className="grid grid-rows-4 grid-flow-col gap-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="flex gap-3 w-[80vw] md:w-[300px]">
                    <div className="w-16 h-16 bg-white/5 rounded-md animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 py-3">
                        <div className="h-4 bg-white/5 rounded w-[70%] animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-[40%] animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default QuickPicks;
