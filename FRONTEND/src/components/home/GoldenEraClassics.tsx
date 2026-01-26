'use client';

import { useRef } from 'react';
import { goldenEraPlaylists } from '@/data/goldenEraPlaylists';
import Image from 'next/image';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

const GoldenEraClassics = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 800;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="py-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-3 md:px-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Golden Era Classics</h2>

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

            {/* Albums Grid - Apple Music Style */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-scroll scrollbar-hide scroll-smooth -mx-4 px-4 md:px-4"
            >
                {goldenEraPlaylists.map((playlist) => (
                    <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                    >
                        <div className="w-[185px] md:w-[200px]">
                            {/* Square Album Art */}
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-900">
                                <Image
                                    src={playlist.image}
                                    alt={he.decode(playlist.name)}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                    sizes="(max-width: 768px) 165px, 200px"
                                />
                            </div>

                            {/* Playlist Info */}
                            <div className="space-y-1">
                                <h3 className="text-white font-semibold text-sm md:text-base line-clamp-1">
                                    {he.decode(playlist.name)}
                                </h3>
                                <p className="text-gray-400 text-xs md:text-sm line-clamp-1">
                                    {playlist.tagLine}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    Playlist • {playlist.songCount} songs
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default GoldenEraClassics;
