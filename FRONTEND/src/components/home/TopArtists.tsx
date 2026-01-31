'use client';

import { useRef } from 'react';
import { topArtists } from '@/data/topArtists';
import SongImage from '@/components/ui/SongImage';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { BiPlay } from 'react-icons/bi';

const TopArtists = () => {
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
                <h2 className="text-2xl md:text-3xl font-bold text-white">Top Artists</h2>

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

            {/* Artists Grid */}
            <div
                ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-scroll scrollbar-hide scroll-smooth -mx-4 px-4 md:px-4"
            >
                {topArtists.map((artist) => (
                    <Link
                        key={artist.id}
                        href={`/artist/${artist.id}`}
                        className="flex-shrink-0 group cursor-pointer"
                    >
                        <div className="flex flex-col items-center w-[140px] md:w-[160px]">
                            {/* Circular Image */}
                            <div className="relative w-[140px] h-[140px] md:w-[160px] md:h-[160px] rounded-full overflow-hidden mb-3">
                                <SongImage
                                    src={artist.url}
                                    alt={artist.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 120px, 160px"
                                    fallbackSize={60}
                                />

                                {/* Play Button - Bottom Right (Spotify Style) */}
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                    <div className="bg-primary text-white p-2.5 md:p-3 rounded-full shadow-2xl hover:scale-110 transition-transform">
                                        <BiPlay size={24} className="ml-0.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Artist Name */}
                            <h3 className="text-white font-semibold text-sm md:text-base text-center line-clamp-1 mb-1 w-full px-2">
                                {artist.name}
                            </h3>

                            {/* Artist Tag */}
                            <p className="text-gray-400 text-xs md:text-sm">
                                Artist
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default TopArtists;
