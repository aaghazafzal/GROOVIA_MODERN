'use client';

import { useAuthStore } from '@/store/useAuthStore';
import SongImage from '@/components/ui/SongImage';
import { BiPlay, BiTime, BiHeart } from 'react-icons/bi';
import { useMusicStore } from '@/store/useMusicStore';
import he from 'he';

export default function LikedSongsPage() {
    const { user, userData } = useAuthStore();
    const playSong = useMusicStore((state) => state.playSong);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                    <BiHeart size={32} className="text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Liked Songs</h2>
                <p className="text-gray-400 mb-6 max-w-md">
                    Login to see your liked songs and build your collection.
                </p>
                <a href="/login" className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">
                    Login
                </a>
            </div>
        );
    }

    const likedSongs = userData?.likedSongs || [];

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-end gap-6 mb-8 bg-gradient-to-b from-purple-900/50 to-transparent p-8 -mx-4 md:-mx-8 rounded-b-3xl">
                <div className="w-52 h-52 bg-gradient-to-br from-purple-600 to-blue-600 shadow-2xl rounded-xl flex items-center justify-center">
                    <BiHeart size={80} className="text-white drop-shadow-lg" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white uppercase tracking-wider mb-2">Playlist</p>
                    <h1 className="text-6xl font-black text-white mb-6 truncate">Liked Songs</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="font-semibold text-white">{user.displayName}</span>
                        <span>•</span>
                        <span>{likedSongs.length} songs</span>
                    </div>
                </div>
            </div>

            {/* Song List */}
            <div className="space-y-1">
                {likedSongs.length > 0 ? (
                    likedSongs.map((song: any, index: number) => (
                        <div
                            key={song.id || index}
                            onClick={() => playSong(song)}
                            className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <span className="w-8 text-center text-gray-400 group-hover:hidden">{index + 1}</span>
                            <button className="w-8 hidden group-hover:flex justify-center text-white">
                                <BiPlay size={24} />
                            </button>

                            <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <SongImage
                                    src={song.image?.[1]?.url || song.image?.[0]?.url}
                                    alt={song.name}
                                    fill
                                    className="object-cover"
                                    fallbackSize={24}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium truncate">{he.decode(song.name || '')}</h3>
                                <p className="text-gray-400 text-sm truncate">
                                    {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                </p>
                            </div>

                            <div className="hidden md:block text-gray-400 text-sm w-16 text-right">
                                {song.duration && !isNaN(Number(song.duration))
                                    ? `${Math.floor(Number(song.duration) / 60)}:${(Number(song.duration) % 60).toString().padStart(2, '0')}`
                                    : '0:00'}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-center py-10">No liked songs yet.</p>
                )}
            </div>
        </div>
    );
}
