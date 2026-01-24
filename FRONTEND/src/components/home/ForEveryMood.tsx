'use client';

import { useRef } from 'react';
import { moodPlaylists } from '@/data/moodPlaylists';
import Image from 'next/image';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import he from 'he';

const ForEveryMood = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            // Desktop: scroll exactly 3 cards width
            const cardWidth = scrollRef.current.scrollWidth / moodPlaylists.length;
            const scrollAmount = cardWidth * 3;

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
                <h2 className="text-2xl md:text-3xl font-bold text-white">For Every Mood</h2>

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

            {/* Mobile: New Songs Style - Large Portrait Cards */}
            <div className="md:hidden flex gap-3 overflow-x-scroll scrollbar-hide scroll-smooth snap-x snap-mandatory px-3">
                {moodPlaylists.map((playlist) => (
                    <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="flex-shrink-0 w-[85%] snap-center cursor-pointer group"
                    >
                        {/* Large Portrait Card */}
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3">
                            <Image
                                src={playlist.image}
                                alt={he.decode(playlist.name)}
                                fill
                                className="object-cover"
                                sizes="85vw"
                                quality={100}
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                            {/* Text at Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-gray-300 text-xs mb-1">
                                    {playlist.moodTag}
                                </p>
                                <h3 className="text-white font-bold text-lg line-clamp-2 mb-1">
                                    {he.decode(playlist.name)}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-1">
                                    {playlist.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Desktop: Community Playlists Style - 3 Cards Visible */}
            <div
                ref={scrollRef}
                className="hidden md:flex gap-4 overflow-x-scroll scrollbar-hide scroll-smooth px-4"
            >
                {moodPlaylists.map((playlist) => (
                    <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="flex-shrink-0 w-[32%] cursor-pointer group"
                    >
                        {/* Large Portrait Card */}
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3">
                            <Image
                                src={playlist.image}
                                alt={he.decode(playlist.name)}
                                fill
                                className="object-cover"
                                sizes="32vw"
                                quality={100}
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                            {/* Text at Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <p className="text-gray-300 text-sm mb-1">
                                    {playlist.moodTag}
                                </p>
                                <h3 className="text-white font-bold text-xl line-clamp-2 mb-2">
                                    {he.decode(playlist.name)}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-2">
                                    {playlist.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default ForEveryMood;
