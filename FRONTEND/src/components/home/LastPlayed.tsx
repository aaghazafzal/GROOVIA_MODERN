'use client';

import { useMusicStore } from '@/store/useMusicStore';
import Image from 'next/image';
import he from 'he';
import { BiPlay, BiDotsVerticalRounded, BiMusic } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { useRef } from 'react';

const LastPlayed = () => {
    const lastPlayed = useMusicStore((state) => state.lastPlayed);
    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Don't show if no songs played
    if (lastPlayed.length === 0) return null;

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 600;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handlePlaySong = (song: any) => {
        setQueue(lastPlayed); // Set entire lastPlayed as queue
        playSong(song);
    };

    // Mobile: 16 songs, Desktop: 24 songs
    const mobileSongs = lastPlayed.slice(0, 16);
    const desktopSongs = lastPlayed.slice(0, 24);

    return (
        <>
            {/* Mobile View - Horizontal Scrolling Grid (4 rows max) */}
            <div className="md:hidden py-3">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold text-white">Last Played</h2>
                </div>

                {/* Horizontal Scrolling Container with Grid */}
                <div className="overflow-x-scroll scrollbar-hide -mx-4 px-4 scroll-smooth">
                    <div className="inline-grid grid-rows-4 grid-flow-col gap-2 auto-cols-[90%]">
                        {mobileSongs.map((song) => (
                            <div
                                key={song.id}
                                onClick={() => handlePlaySong(song)}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group h-[68px]"
                            >
                                {/* Album Art */}
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    {song.image?.[0]?.url ? (
                                        <Image
                                            src={song.image[1]?.url || song.image[0]?.url}
                                            alt={he.decode(song.name)}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <BiMusic size={24} className="text-gray-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay size={24} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium text-sm line-clamp-1">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>

                                {/* Three Dots Menu */}
                                <button
                                    className="text-gray-400 hover:text-white p-1.5 transition-colors flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Menu logic here
                                    }}
                                >
                                    <BiDotsVerticalRounded size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop View - Horizontal Scrolling Grid (3 columns visible) */}
            <div className="hidden md:block relative py-4 px-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-white">Last Played</h2>

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

                {/* Horizontal Scrollable Grid - 3 Columns Layout */}
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth"
                >
                    <div className="inline-grid grid-rows-4 grid-flow-col gap-2 auto-cols-[49%]">
                        {desktopSongs.map((song) => (
                            <div
                                key={song.id}
                                onClick={() => handlePlaySong(song)}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                {/* Album Art */}
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                    {song.image?.[0]?.url ? (
                                        <Image
                                            src={song.image[2]?.url || song.image[1]?.url || song.image[0]?.url}
                                            alt={he.decode(song.name)}
                                            fill
                                            className="object-cover"
                                            sizes="56px"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <BiMusic size={28} className="text-gray-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay size={28} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-sm line-clamp-1">
                                        {he.decode(song.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {song.artists.primary.map((a) => a.name).join(', ')}
                                    </p>
                                </div>

                                {/* Three Dots Menu */}
                                <button
                                    className="text-gray-400 hover:text-white p-2 transition-colors flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Menu logic here
                                    }}
                                >
                                    <BiDotsVerticalRounded size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LastPlayed;
