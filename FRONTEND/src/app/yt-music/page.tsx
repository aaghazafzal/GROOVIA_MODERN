'use client';

import { useState } from 'react';
import { BiSearch, BiPlay } from 'react-icons/bi';
import { SiYoutubemusic } from 'react-icons/si';

export default function YTMusicPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            // Call Python Server (Localhost for now)
            // Note: In production this should be a proper backend route
            const res = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            setResults(data.data || []);
        } catch (error) {
            console.error(error);
            alert('Service unavailable (Python Backend). Ensure server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-white pb-32">
            <div className="flex items-center gap-4 mb-8">
                <SiYoutubemusic className="text-red-500 text-4xl" />
                <h1 className="text-3xl font-bold text-white">YouTube Music</h1>
            </div>

            {/* Search Box */}
            <div className="flex gap-4 mb-8 max-w-2xl bg-zinc-900/50 p-2 rounded-2xl border border-white/5 mx-auto md:mx-0">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search any song from YouTube Music..."
                    className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-white placeholder-gray-500"
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-white shadow-lg shadow-red-600/20"
                >
                    {loading ? '...' : <BiSearch size={24} />}
                </button>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((item: any, idx: number) => (
                    <div key={idx} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-900 hover:border-red-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                            {/* Thumbnail */}
                            <div className="relative w-24 h-24 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                                {item.thumbnails?.[0]?.url && (
                                    <img src={item.thumbnails[0].url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                )}
                                <button
                                    onClick={() => setCurrentVideoId(item.videoId)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                        <BiPlay size={24} className="text-white ml-1" />
                                    </div>
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 mt-1">
                                <h3 className="font-bold truncate text-white mb-1 group-hover:text-red-400 transition-colors">{item.title}</h3>
                                <p className="text-sm text-gray-400 truncate">
                                    {item.artists?.map((a: any) => a.name).join(', ')}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-white/5 px-2 py-1 rounded text-gray-400 border border-white/5">
                                        {item.resultType}
                                    </span>
                                    {item.duration && (
                                        <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded text-gray-400 border border-white/5">
                                            {item.duration}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {results.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-60">
                    <SiYoutubemusic className="text-6xl mb-4 text-gray-700" />
                    <p>Search specifically on YouTube Music Database</p>
                </div>
            )}

            {/* Float Player */}
            {currentVideoId && (
                <div className="fixed bottom-24 right-8 z-[200] animate-bounce-in">
                    <div className="bg-zinc-900 border border-red-500/30 p-3 rounded-2xl shadow-2xl w-[320px] md:w-[400px] backdrop-blur-xl bg-opacity-90">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <h4 className="text-white text-xs font-bold tracking-wide">PLAYING FROM YOUTUBE</h4>
                            </div>
                            <button onClick={() => setCurrentVideoId(null)} className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors">CLOSE</button>
                        </div>
                        <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-inner">
                            <iframe
                                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0`}
                                title="YouTube Player"
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
