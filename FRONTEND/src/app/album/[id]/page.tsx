'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import SongImage from '@/components/ui/SongImage';
import Link from 'next/link';
import he from 'he';
import {
    BiPlay, BiPause,
    BiDownload,
    BiDotsVerticalRounded,
    BiChevronLeft,
    BiShare,
} from 'react-icons/bi';
import { HiOutlineHeart } from 'react-icons/hi';

interface AlbumData {
    id: string;
    name: string;
    year: string;
    image: { quality: string; url: string }[];
    songs: any[];
    artists: {
        primary: { name: string }[];
    };
    songCount?: number;
}

export default function AlbumPage() {
    const params = useParams();
    const router = useRouter();
    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedAlbums, setRelatedAlbums] = useState<any[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);
    const isPlaying = useMusicStore((state) => state.isPlaying);
    const currentSong = useMusicStore((state) => state.currentSong);
    const pauseSong = useMusicStore((state) => state.pauseSong);
    const resumeSong = useMusicStore((state) => state.resumeSong);

    // Check if current album is playing
    const isCurrentAlbumPlaying = currentSong && album &&
        album.songs.some(song => song.id === currentSong.id) && isPlaying;

    useEffect(() => {
        if (params.id) {
            fetchAlbumDetails();
        }
    }, [params.id]);

    // Fetch related albums when album loads
    useEffect(() => {
        if (album?.id) {
            fetchRelatedAlbums();
        }
    }, [album?.id]);

    const fetchAlbumDetails = async () => {
        try {
            setLoading(true);
            // API expects id as query parameter, not path parameter
            const response = await api.get('/albums', {
                params: {
                    id: params.id,
                    limit: 100 // Fetch all songs (default is usually 10)
                }
            });
            console.log('Album response:', response.data);

            // API returns { success: true, data: {...album details} }
            if (response.data?.data) {
                setAlbum(response.data.data);
            } else {
                console.error('Invalid album data structure');
                setAlbum(null);
            }
        } catch (error) {
            console.error('Error fetching album:', error);
            setAlbum(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedAlbums = async () => {
        try {
            setLoadingRelated(true);
            // Use search API to find similar albums based on artist or genre
            const artistName = album?.artists?.primary?.[0]?.name || '';
            if (artistName) {
                const response = await api.get('/search/albums', {
                    params: {
                        query: artistName,
                        limit: 10
                    }
                });
                const albums = response.data?.data?.results || [];
                // Filter out current album
                setRelatedAlbums(albums.filter((a: any) => a.id !== album?.id));
            }
        } catch (error) {
            console.error('Error fetching related albums:', error);
            setRelatedAlbums([]);
        } finally {
            setLoadingRelated(false);
        }
    };

    const handlePlayAll = () => {
        if (album && album.songs.length > 0) {
            if (isCurrentAlbumPlaying) {
                pauseSong();
            } else {
                setQueue(album.songs);
                playSong(album.songs[0]);
            }
        }
    };

    const handlePlaySong = (song: any, index: number) => {
        if (album) {
            setQueue(album.songs);
            playSong(song);
        }
    };

    const formatDuration = (seconds: string | number) => {
        const secs = typeof seconds === 'string' ? parseInt(seconds) : seconds;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <p className="text-gray-400">Album not found</p>
            </div>
        );
    }

    const totalDuration = album.songs.reduce((acc, song) => acc + (parseInt(song.duration) || 0), 0);
    const totalMinutes = Math.floor(totalDuration / 60);

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden min-h-screen bg-sidebar pb-32">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-sidebar/95 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2">
                        <BiChevronLeft size={28} className="text-white" />
                    </button>
                </div>

                {/* Album Art & Info */}
                <div className="px-6 py-6">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl mb-4">
                        <SongImage
                            src={album.image?.[2]?.url || album.image?.[0]?.url}
                            alt={album.name}
                            fill
                            className="object-cover"
                            priority
                            sizes="100vw"
                            fallbackSize={100}
                        />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">{he.decode(album.name)}</h1>
                    <p className="text-sm text-gray-400">
                        {album.artists?.primary?.map((a) => a.name).join(', ')} • {album.year}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {album.songs.length} songs • {totalMinutes} minutes
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-around px-6 pb-6 border-b border-zinc-800">
                    <button className="flex flex-col items-center gap-1">
                        <div className="p-3 rounded-full bg-zinc-900">
                            <BiDownload size={20} className="text-white" />
                        </div>
                    </button>
                    <button className="flex flex-col items-center gap-1">
                        <div className="p-3 rounded-full bg-zinc-900">
                            <HiOutlineHeart size={20} className="text-white" />
                        </div>
                    </button>
                    <button onClick={handlePlayAll} className="flex flex-col items-center gap-1">
                        <div className="p-6 rounded-full bg-white">
                            {isCurrentAlbumPlaying ? (
                                <BiPause size={32} className="text-black" />
                            ) : (
                                <BiPlay size={32} className="text-black ml-1" />
                            )}
                        </div>
                    </button>
                    <button className="flex flex-col items-center gap-1">
                        <div className="p-3 rounded-full bg-zinc-900">
                            <BiShare size={20} className="text-white" />
                        </div>
                    </button>
                    <button className="flex flex-col items-center gap-1">
                        <div className="p-3 rounded-full bg-zinc-900">
                            <BiDotsVerticalRounded size={20} className="text-white" />
                        </div>
                    </button>
                </div>

                {/* Song List */}
                <div className="px-4 py-4">
                    {album.songs.map((song, index) => (
                        <div
                            key={song.id}
                            onClick={() => handlePlaySong(song, index)}
                            className="flex items-center gap-3 py-3 active:bg-white/5 transition-colors"
                        >
                            <span className="text-gray-400 text-sm w-6 flex-shrink-0">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-sm line-clamp-1">
                                    {he.decode(song.name)}
                                </h3>
                                <p className="text-gray-400 text-xs line-clamp-1">
                                    {song.artists?.primary?.map((a: any) => a.name).join(', ')} • {song.duration || '0:00'}
                                </p>
                            </div>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 flex-shrink-0"
                            >
                                <BiDotsVerticalRounded size={20} className="text-gray-400" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Releases for You - Mobile */}
                {relatedAlbums.length > 0 && (
                    <div className="pb-6">
                        <h2 className="text-xl font-bold text-white mb-4 px-4">Releases for you</h2>
                        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
                            {relatedAlbums.map((relAlbum) => (
                                <Link
                                    key={relAlbum.id}
                                    href={`/album/${relAlbum.id}`}
                                    className="flex-shrink-0 w-[calc(50%-6px)] snap-start"
                                >
                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900">
                                        <SongImage
                                            src={relAlbum.image?.[2]?.url || relAlbum.image?.[0]?.url}
                                            alt={relAlbum.name}
                                            fill
                                            className="object-cover"
                                            sizes="50vw"
                                            fallbackSize={40}
                                        />
                                    </div>
                                    <h3 className="text-white font-medium text-sm line-clamp-1 mb-1">
                                        {he.decode(relAlbum.name)}
                                    </h3>
                                    <p className="text-gray-400 text-xs line-clamp-1">
                                        {relAlbum.year} • {relAlbum.artists?.primary?.map((a: any) => a.name).join(', ')}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Summary */}
                <div className="px-4 py-6 text-center">
                    <p className="text-gray-400 text-sm">
                        {album.songs.length} songs • {totalMinutes} minutes
                    </p>
                </div>
            </div>

            {/* Desktop View - YouTube Music Style */}
            <div className="hidden md:block bg-sidebar -m-4 md:-m-8 h-[calc(100vh)] overflow-hidden">
                <div className="flex h-full">
                    {/* Left: Album Art - Sticky, No Scroll */}
                    <div className="w-[400px] flex-shrink-0 flex flex-col">
                        <div className="sticky top-20 pt-8 pl-6 pr-6">
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl mb-6">
                                <SongImage
                                    src={album.image?.[2]?.url || album.image?.[0]?.url}
                                    alt={album.name}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="400px"
                                    fallbackSize={120}
                                />
                            </div>

                            {/* Album Info */}
                            <h1 className="text-3xl font-bold text-white mb-2 line-clamp-2 leading-tight">{he.decode(album.name)}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                                <span>Album</span>
                                <span>•</span>
                                <span>{album.year}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 mb-6">
                                <button
                                    onClick={handlePlayAll}
                                    className="px-8 py-2.5 rounded-full bg-white text-black font-medium hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    {isCurrentAlbumPlaying ? (
                                        <>
                                            <BiPause size={24} />
                                            <span>PAUSE</span>
                                        </>
                                    ) : (
                                        <>
                                            <BiPlay size={24} />
                                            <span>PLAY</span>
                                        </>
                                    )}
                                </button>
                                <button className="p-2.5 rounded-full hover:bg-zinc-800 transition-colors border border-gray-700">
                                    <HiOutlineHeart size={20} className="text-white" />
                                </button>
                                <button className="p-2.5 rounded-full hover:bg-zinc-800 transition-colors border border-gray-700">
                                    <BiDotsVerticalRounded size={20} className="text-white" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-400 line-clamp-2">
                                {album.songs.length} songs • {totalMinutes} minutes • {album.artists?.primary?.map((a) => a.name).join(', ')}
                            </p>
                        </div>
                    </div>

                    {/* Right: Song List & Related - Scrollable */}
                    <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
                        <div className="max-w-full px-8 py-8">
                            {/* Songs */}
                            <div className="space-y-1 mb-16">
                                {album.songs.map((song, index) => (
                                    <div
                                        key={song.id}
                                        onClick={() => handlePlaySong(song, index)}
                                        className="flex items-center gap-6 px-4 py-3 rounded-md hover:bg-white/10 cursor-pointer group transition-colors border-b border-transparent hover:border-white/5"
                                    >
                                        {/* Number */}
                                        <span className="text-gray-400 text-sm w-6 flex-shrink-0 group-hover:text-white text-center">
                                            {index + 1}
                                        </span>

                                        {/* Song Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-base line-clamp-1 group-hover:text-primary">
                                                {he.decode(song.name)}
                                            </h3>
                                            <p className="text-gray-400 text-sm line-clamp-1 mt-0.5">
                                                {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                            </p>
                                        </div>

                                        {/* Album Name (Desktop only) */}
                                        <div className="hidden lg:block w-1/3 text-gray-400 text-sm line-clamp-1 group-hover:text-white">
                                            {he.decode(album.name)}
                                        </div>

                                        {/* Duration */}
                                        <span className="text-gray-400 text-sm flex-shrink-0 font-medium">
                                            {song.duration || '0:00'}
                                        </span>

                                        {/* More Button */}
                                        <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-white/10 rounded-full"
                                        >
                                            <BiDotsVerticalRounded size={20} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Releases for You - Desktop */}
                            {relatedAlbums.length > 0 && (
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-8">Releases for you</h2>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {relatedAlbums.slice(0, 10).map((relAlbum) => (
                                            <Link
                                                key={relAlbum.id}
                                                href={`/album/${relAlbum.id}`}
                                                className="group"
                                            >
                                                <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-900 shadow-lg">
                                                    <SongImage
                                                        src={relAlbum.image?.[2]?.url || relAlbum.image?.[0]?.url}
                                                        alt={relAlbum.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        sizes="(max-width: 1200px) 25vw, 200px"
                                                        fallbackSize={80}
                                                    />
                                                </div>
                                                <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">
                                                    {he.decode(relAlbum.name)}
                                                </h3>
                                                <p className="text-gray-400 text-sm line-clamp-1">
                                                    {relAlbum.year} • Album
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
