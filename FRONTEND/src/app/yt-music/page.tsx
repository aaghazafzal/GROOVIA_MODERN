'use client';

import { useState } from 'react';
import QuickPicks from '@/components/yt-music/QuickPicks';
import AlbumsForYou from '@/components/yt-music/AlbumsForYou';

export default function YTMusicPage() {
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    return (
        <div className="min-h-screen pb-32">
            {/* Section 1: Quick Picks */}
            <QuickPicks onPlay={setCurrentVideoId} />

            {/* Section 2: Albums for You */}
            <AlbumsForYou />

            {/* Additional sections will be added here as requested */}

            {/* Float Player - Custom Implementation for YT Music Page */}
            {currentVideoId && (
                <div className="fixed bottom-24 right-4 md:right-8 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#121212] border border-white/10 p-2 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-[300px] md:w-[380px] backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Now Playing</span>
                            </div>
                            <button
                                onClick={() => setCurrentVideoId(null)}
                                className="text-[10px] font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                            >
                                Close
                            </button>
                        </div>
                        <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-inner ring-1 ring-white/5">
                            <iframe
                                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
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
