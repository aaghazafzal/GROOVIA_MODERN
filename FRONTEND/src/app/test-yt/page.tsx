'use client';

import { useState } from 'react';
import { BiSearch, BiPlay } from 'react-icons/bi';

export default function TestYTPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            // Call Python Server
            const res = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            // ytmusicapi returns list directly or inside 'data' depending on my server wrapper.
            // My server returns {"data": results}
            setResults(data.data || []);
        } catch (error) {
            console.error(error);
            alert('Failed to connect to Python Server. Is it running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 min-h-screen bg-black text-white pb-32 ml-0 md:ml-0">
            {/* Note: In real app this page is inside Layout which has Sidebar margin. 
                But for pure isolation test we can ignore layout or let it inherit.
                Since it's in /app/test-yt/page.tsx, it wraps in RootLayout.
                So it will have Sidebar and proper margins. 
            */}

            <h1 className="text-3xl font-bold mb-8 text-purple-500">YouTube Music API Integration Test (Python Backend)</h1>

            {/* Search Box */}
            <div className="flex gap-4 mb-8 max-w-2xl bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search songs (e.g., Arijit Singh)..."
                    className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-white placeholder-gray-500"
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-white shadow-lg shadow-purple-600/20"
                >
                    {loading ? '...' : <BiSearch size={24} />}
                </button>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((item: any, idx: number) => (
                    <div key={idx} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-800 hover:border-purple-500/30 transition-all group">
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
                                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                        <BiPlay size={24} className="text-white ml-1" />
                                    </div>
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 mt-1">
                                <h3 className="font-bold truncate text-white mb-1 group-hover:text-purple-400 transition-colors">{item.title}</h3>
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
                <div className="text-center py-20 text-gray-600">
                    <p>Enter a song name to search directly via Python API</p>
                </div>
            )}

            {/* Float Player */}
            {currentVideoId && (
                <div className="fixed bottom-24 right-8 z-[200] animate-bounce-in">
                    <div className="bg-zinc-900 border border-purple-500/30 p-3 rounded-2xl shadow-2xl w-[320px] md:w-[400px] backdrop-blur-xl bg-opacity-90">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <h4 className="text-white text-xs font-bold tracking-wide">LIVE PREVIEW</h4>
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
