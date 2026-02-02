'use client';

import { useAuthStore } from '@/store/useAuthStore';
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
    BiMusic,
    BiCheckSquare,
    BiSquare,
    BiLoaderAlt,
    BiTrash,
    BiSelectMultiple
} from 'react-icons/bi';
import { HiOutlineHeart } from 'react-icons/hi';

interface PlaylistData {
    id: string;
    name: string;
    description?: string;
    year?: string;
    firstname?: string;
    lastname?: string;
    image: { quality: string; url: string }[];
    songs: any[];
    songCount?: number;
    ownerId?: string; // Add ownerId to interface if we return it?
}

export default function PlaylistPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData } = useAuthStore();
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedPlaylists, setRelatedPlaylists] = useState<any[]>([]);

    // New State for Edit/Select/Download
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null); // For song 3-dot menu
    const [showHeaderMenu, setShowHeaderMenu] = useState(false); // For header 3-dot menu
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'batch', id?: string } | null>(null);

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);
    const isPlaying = useMusicStore((state) => state.isPlaying);
    const currentSong = useMusicStore((state) => state.currentSong);
    const pauseSong = useMusicStore((state) => state.pauseSong);

    const isLocalPlaylist = /^[0-9a-fA-F]{24}$/.test(playlist?.id || '');
    const isOwner = isLocalPlaylist && userData?.playlists?.some((p: any) => p._id === playlist?.id);

    const toggleSongSelection = (id: string) => {
        if (selectedSongs.includes(id)) {
            setSelectedSongs(prev => prev.filter(sid => sid !== id));
        } else {
            setSelectedSongs(prev => [...prev, id]);
        }
    };

    const handleRemoveSelected = () => {
        setDeleteAction({ type: 'batch' });
        setShowDeleteConfirm(true);
    };

    const handleRemoveSong = (songId: string) => {
        setDeleteAction({ type: 'single', id: songId });
        setOpenMenuId(null);
        setShowDeleteConfirm(true);
    };

    const executeRemove = async () => {
        if (!deleteAction) return;
        const targetIds = deleteAction.type === 'batch' ? selectedSongs : [deleteAction.id!];

        try {
            const res = await fetch('/api/playlists/remove-songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user?.uid, playlistId: playlist?.id, songIds: targetIds })
            });
            if (res.ok) {
                const updatedSongs = playlist?.songs.filter(s => !targetIds.includes(s.id)) || [];
                setPlaylist(prev => prev ? { ...prev, songs: updatedSongs } : null);

                if (deleteAction.type === 'batch') {
                    setIsSelectMode(false);
                    setSelectedSongs([]);
                }
                setShowDeleteConfirm(false);
                setDeleteAction(null);
            }
        } catch (e) { console.error(e); }
    };

    const handleDownload = async (song: any) => {
        setDownloadingId(song.id);
        setOpenMenuId(null);
        try {
            // Get download URL from song data based on settings
            const prefQuality = userData?.settings?.downloadQuality || '320kbps';

            const url = song.downloadUrl?.find((d: any) => d.quality === prefQuality)?.url ||
                song.downloadUrl?.find((d: any) => d.quality === '320kbps')?.url ||
                song.downloadUrl?.find((d: any) => d.quality === '160kbps')?.url ||
                song.downloadUrl?.[0]?.url;
            if (!url) { alert('No download link'); return; }

            const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
            if (res.ok) {
                const blob = await res.blob();
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                const name = he.decode(song.name || 'song').replace(/[^a-z0-9]/gi, '_');
                link.download = `${name}.mp3`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e) {
            console.error('Download failed', e);
        } finally {
            setDownloadingId(null);
        }
    };

    // Check if current playlist is playing
    const isCurrentPlaylistPlaying = currentSong && playlist &&
        playlist.songs.some(song => song.id === currentSong.id) && isPlaying;

    useEffect(() => {
        if (params.id) {
            fetchPlaylistDetails();
        }
    }, [params.id, userData]); // Re-run if userData loads (for liked/local)

    useEffect(() => {
        if (playlist?.id) {
            fetchRelatedPlaylists();
        }
    }, [playlist?.id, userData]);

    const fetchPlaylistDetails = async () => {
        setLoading(true);
        const id = params.id as string;

        try {
            // Case 0: YouTube Playlist (PL, VL, RD prefixes)
            if (id.startsWith('PL') || id.startsWith('VL') || id.startsWith('RD') || id.startsWith('OLAK5')) { // OLAK5 can be Album or Playlist in some contexts, but let's safe guard
                try {
                    const res = await fetch(`http://localhost:8000/playlist?browseId=${id}`);
                    const json = await res.json();

                    if (!json.data) throw new Error("No data");
                    const ytData = json.data;

                    const formattedPlaylist: PlaylistData = {
                        id: ytData.id || id,
                        name: ytData.title,
                        description: ytData.description || '',
                        image: ytData.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
                        firstname: ytData.author?.name || 'YouTube Music',
                        year: ytData.year || new Date().getFullYear().toString(),
                        songCount: ytData.trackCount || ytData.tracks?.length || 0,
                        songs: ytData.tracks?.map((t: any) => {
                            let durSec = 0;
                            if (t.duration) {
                                const parts = t.duration.split(':').map(Number);
                                if (parts.length === 3) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                else if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
                            }
                            return {
                                id: t.videoId,
                                name: t.title,
                                duration: String(durSec),
                                image: t.thumbnails?.map((thumb: any) => ({ quality: 'high', url: thumb.url })) || [],
                                artists: { primary: t.artists || [] },
                                downloadUrl: [{ quality: '320kbps', url: `http://localhost:8000/stream?videoId=${t.videoId}` }],
                                url: `http://localhost:8000/stream?videoId=${t.videoId}`
                            };
                        }) || []
                    };
                    setPlaylist(formattedPlaylist);
                    return;
                } catch (err) {
                    console.error("YT Playlist Fetch Failed", err);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Case 1: Liked Songs
            if (id === 'liked') {
                if (!userData) {
                    // Wait for auth
                    return;
                }
                const likedSongs = userData.likedSongs || [];
                const mockPlaylist: PlaylistData = {
                    id: 'liked',
                    name: 'Liked Songs',
                    description: 'Your favorite tracks',
                    image: likedSongs.length > 0 ? likedSongs[0].image : [],
                    songs: likedSongs,
                    songCount: likedSongs.length
                };
                setPlaylist(mockPlaylist);
                setLoading(false);
                return;
            }

            // Case 2: Local Playlist (Mongo ObjectId 24 hex)
            const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
            if (isMongoId) {
                const response = await fetch(`/api/playlists/local?id=${id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.playlist) {
                        const p = data.playlist;
                        // Format to match PlaylistData
                        const formattedPlaylist: PlaylistData = {
                            id: p._id,
                            name: p.name,
                            description: p.description,
                            // Use first song image if playlist image is missing
                            image: p.image
                                ? [{ quality: '500x500', url: p.image }]
                                : (p.songs.length > 0 ? p.songs[0].image : []),
                            songs: p.songs,
                            songCount: p.songs.length,
                            firstname: p.owner?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User',
                            year: new Date(p.createdAt).getFullYear().toString()
                        };
                        setPlaylist(formattedPlaylist);
                        setLoading(false);
                        return;
                    }
                }
                // If failed (maybe not mongo id?), fall through to online
            }

            // Case 3: Online Playlist
            const response = await api.get('/playlists', {
                params: {
                    id: params.id,
                    limit: 100
                }
            });
            console.log('Playlist response:', response.data);

            if (response.data?.data) {
                setPlaylist(response.data.data);
            } else {
                console.error('Invalid playlist data structure');
                setPlaylist(null);
            }
        } catch (error) {
            console.error('Error fetching playlist:', error);
            setPlaylist(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedPlaylists = async () => {
        // If Local or Liked -> Show User's other playlists
        const id = params.id as string;
        const isLocal = id === 'liked' || /^[0-9a-fA-F]{24}$/.test(id);

        if (isLocal) {
            if (userData?.playlists) {
                // Filter current playlist and Liked Songs (if viewing liked)
                const others = userData.playlists.filter((p: any) =>
                    p._id !== id && p.id !== id && p._id !== 'liked' // assuming playlists have _id
                );

                // Map to match display format
                const mapped = others.slice(0, 9).map((p: any) => ({
                    id: p._id,
                    name: p.name,
                    title: p.name, // Component uses title or name
                    image: p.image
                        ? [{ quality: '500x500', url: p.image }]
                        : (p.songs?.[0]?.image || []),
                    songCount: p.songs?.length || 0
                }));
                setRelatedPlaylists(mapped);
            }
            return;
        }

        // Online Logic (Keep existing)
        try {
            const query = playlist?.name?.split(' ')[0] || 'hits';
            const response = await api.get('/search/playlists', {
                params: {
                    query: query,
                    limit: 10
                }
            });
            const playlists = response.data?.data?.results || [];
            setRelatedPlaylists(playlists.filter((p: any) => p.id !== playlist?.id));
        } catch (error) {
            console.error('Error fetching related playlists:', error);
        }
    };

    const handlePlayAll = () => {
        if (playlist && playlist.songs.length > 0) {
            if (isCurrentPlaylistPlaying) {
                pauseSong();
            } else {
                setQueue(playlist.songs);
                playSong(playlist.songs[0]);
            }
        }
    };

    const handlePlaySong = (song: any) => {
        if (playlist) {
            setQueue(playlist.songs);
            playSong(song);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <p className="text-gray-400">Playlist not found</p>
            </div>
        );
    }

    const totalDuration = playlist.songs.reduce((acc, song) => acc + (parseInt(song.duration) || 0), 0);
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

                {/* Playlist Art & Info */}
                <div className="px-6 py-6">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl mb-4 flex items-center justify-center bg-zinc-900">
                        <SongImage
                            src={playlist.image?.[2]?.url || playlist.image?.[0]?.url}
                            alt={playlist.name}
                            fill
                            className="object-cover"
                            priority
                            sizes="100vw"
                            fallbackSize={80}
                        />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">{he.decode(playlist.name)}</h1>
                    <p className="text-sm text-gray-400 mb-2">Groovia Music</p>
                    {playlist.description && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                            {he.decode(playlist.description)}
                        </p>
                    )}
                    <p className="text-sm text-gray-400">
                        {playlist.songs.length} songs • {totalMinutes} minutes
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-around px-6 pb-6 border-b border-zinc-800 relative">
                    {isSelectMode ? (
                        <>
                            <button
                                onClick={() => { setIsSelectMode(false); setSelectedSongs([]); }}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemoveSelected}
                                disabled={selectedSongs.length === 0}
                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg disabled:opacity-50"
                            >
                                <BiTrash size={20} />
                                Remove ({selectedSongs.length})
                            </button>
                        </>
                    ) : (
                        <>
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
                                    {isCurrentPlaylistPlaying ? (
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

                            {isOwner && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                                        className="flex flex-col items-center gap-1"
                                    >
                                        <div className="p-3 rounded-full bg-zinc-900">
                                            <BiDotsVerticalRounded size={20} className="text-white" />
                                        </div>
                                    </button>
                                    {showHeaderMenu && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                {isOwner && (
                                                    <button
                                                        onClick={() => { setIsSelectMode(true); setShowHeaderMenu(false); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white text-sm flex items-center gap-2"
                                                    >
                                                        <BiSelectMultiple size={20} />
                                                        Select Songs
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Song List - With Thumbnails */}
                <div className="px-4 py-4 min-h-[300px]">
                    {playlist.songs.map((song, index) => (
                        <div
                            key={song.id}
                            onClick={() => isSelectMode ? toggleSongSelection(song.id) : handlePlaySong(song)}
                            className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${selectedSongs.includes(song.id) ? 'bg-white/10' : 'active:bg-white/5'}`}
                        >
                            {isSelectMode && (
                                <div className="text-purple-500 flex-shrink-0">
                                    {selectedSongs.includes(song.id) ? <BiCheckSquare size={24} /> : <BiSquare size={24} className="text-gray-500" />}
                                </div>
                            )}

                            <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-zinc-900">
                                <SongImage
                                    src={song.image?.[1]?.url || song.image?.[0]?.url}
                                    alt={song.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    fallbackSize={24}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-sm line-clamp-1">
                                    {he.decode(song.name)}
                                </h3>
                                <p className="text-gray-400 text-xs line-clamp-1">
                                    {song.artists?.primary?.map((a: any) => a.name).join(', ')} • {song.duration || '0:00'}
                                </p>
                            </div>

                            {!isSelectMode && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === song.id ? null : song.id); }}
                                        className="w-10 h-10 flex items-center justify-center -mr-2 text-gray-400 hover:text-white transition-colors rounded-full active:bg-white/10"
                                    >
                                        {downloadingId === song.id ? <BiLoaderAlt size={20} className="animate-spin" /> : <BiDotsVerticalRounded size={20} />}
                                    </button>

                                    {openMenuId === song.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(song); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-white flex items-center gap-2"
                                                >
                                                    <BiDownload size={16} /> Download
                                                </button>
                                                {isOwner && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-red-400 flex items-center gap-2"
                                                    >
                                                        <BiTrash size={16} /> Remove
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Similar Playlists - Mobile */}
                {relatedPlaylists.length > 0 && (
                    <div className="pb-6">
                        <h2 className="text-xl font-bold text-white mb-4 px-4">You might also like</h2>
                        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
                            {relatedPlaylists.map((relPlaylist) => {
                                const imageUrl = relPlaylist.image?.[2]?.url || relPlaylist.image?.[0]?.url;
                                return (
                                    <Link
                                        key={relPlaylist.id}
                                        href={`/playlist/${relPlaylist.id}`}
                                        className="flex-shrink-0 w-[calc(50%-6px)] snap-start"
                                    >
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900 flex items-center justify-center">
                                            <SongImage
                                                src={imageUrl}
                                                alt={relPlaylist.name}
                                                fill
                                                className="object-cover"
                                                sizes="50vw"
                                                fallbackSize={40}
                                            />
                                        </div>
                                        <h3 className="text-white font-medium text-sm line-clamp-1 mb-1">
                                            {he.decode(relPlaylist.title || relPlaylist.name)}
                                        </h3>
                                        <p className="text-gray-400 text-xs line-clamp-1">
                                            Playlist • {relPlaylist.songCount || 'Various'} songs
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer Summary */}
                <div className="px-4 py-6 text-center">
                    <p className="text-gray-400 text-sm">
                        {playlist.songs.length} songs • {totalMinutes} minutes
                    </p>
                </div>
            </div>

            {/* Desktop View - YouTube Music Style */}
            <div className="hidden md:block bg-sidebar -m-4 md:-m-8 h-[calc(100vh)] overflow-hidden">
                <div className="flex h-full">
                    {/* Left: Playlist Art - Sticky, No Scroll */}
                    <div className="w-[400px] flex-shrink-0 flex flex-col">
                        <div className="sticky top-20 pt-8 pl-6 pr-6">
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl mb-6 flex items-center justify-center bg-zinc-900">
                                <SongImage
                                    src={playlist.image?.[2]?.url || playlist.image?.[0]?.url}
                                    alt={playlist.name}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="400px"
                                    fallbackSize={120}
                                />
                            </div>

                            {/* Playlist Info */}
                            <h1 className="text-3xl font-bold text-white mb-2 line-clamp-2 leading-tight">{he.decode(playlist.name)}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <span>{playlist.year || 'Playlist'}</span>
                                {playlist.firstname && <span>• {playlist.firstname} {playlist.lastname}</span>}
                            </div>

                            {playlist.description && (
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {he.decode(playlist.description)}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 mb-6 relative">
                                {isSelectMode ? (
                                    <>
                                        <button
                                            onClick={() => { setIsSelectMode(false); setSelectedSongs([]); }}
                                            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRemoveSelected}
                                            disabled={selectedSongs.length === 0}
                                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                        >
                                            <BiTrash size={20} />
                                            Remove ({selectedSongs.length})
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handlePlayAll}
                                            className="px-8 py-2.5 rounded-full bg-white text-black font-medium hover:scale-105 transition-transform flex items-center gap-2"
                                        >
                                            {isCurrentPlaylistPlaying ? (
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

                                        {isOwner && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                                                    className="p-2.5 rounded-full hover:bg-zinc-800 transition-colors border border-gray-700"
                                                >
                                                    <BiDotsVerticalRounded size={20} className="text-white" />
                                                </button>

                                                {showHeaderMenu && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                                                        <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                            {isOwner && (
                                                                <button
                                                                    onClick={() => { setIsSelectMode(true); setShowHeaderMenu(false); }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-white flex items-center gap-2"
                                                                >
                                                                    <BiSelectMultiple size={20} /> Select Songs
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <p className="text-sm text-gray-400 line-clamp-2">
                                {playlist.songs.length} songs • {totalMinutes} minutes
                            </p>
                        </div>
                    </div>

                    {/* Right: Song List & Related - Scrollable */}
                    <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
                        <div className="max-w-full px-8 py-8">
                            {/* Songs */}
                            <div className="space-y-1 mb-16">
                                {playlist.songs.map((song, index) => (
                                    <div
                                        key={song.id}
                                        onClick={() => isSelectMode ? toggleSongSelection(song.id) : handlePlaySong(song)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-md cursor-pointer group transition-colors border-b border-transparent hover:border-white/5 ${selectedSongs.includes(song.id) ? 'bg-white/10' : 'hover:bg-white/10'}`}
                                    >
                                        {/* Number OR Checkbox */}
                                        <div className="w-8 flex-shrink-0 text-center flex items-center justify-center">
                                            {isSelectMode ? (
                                                <div className="text-purple-500">
                                                    {selectedSongs.includes(song.id) ? <BiCheckSquare size={20} /> : <BiSquare size={20} className="text-gray-500" />}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm group-hover:text-white">
                                                    {index + 1}
                                                </span>
                                            )}
                                        </div>

                                        {/* Thumbnail - Playlist Only */}
                                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-900">
                                            <SongImage
                                                src={song.image?.[1]?.url || song.image?.[0]?.url}
                                                alt={song.name}
                                                fill
                                                className="object-cover"
                                                sizes="40px"
                                                fallbackSize={20}
                                            />
                                        </div>

                                        {/* Song Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-base line-clamp-1 group-hover:text-primary">
                                                {he.decode(song.name)}
                                            </h3>
                                            <p className="text-gray-400 text-sm line-clamp-1 mt-0.5">
                                                {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                            </p>
                                        </div>

                                        {/* Album Name (Desktop) */}
                                        <div className="hidden lg:block w-1/4 text-gray-400 text-sm line-clamp-1 group-hover:text-white">
                                            {he.decode(song.album?.name || '')}
                                        </div>

                                        {/* Duration */}
                                        <span className="text-gray-400 text-sm flex-shrink-0 font-medium">
                                            {song.duration || '0:00'}
                                        </span>

                                        {/* More Button */}
                                        {!isSelectMode && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === song.id ? null : song.id); }}
                                                    className={`p-2 transition-opacity flex-shrink-0 hover:bg-white/10 rounded-full ${openMenuId === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                >
                                                    {downloadingId === song.id ? <BiLoaderAlt size={20} className="animate-spin text-white" /> : <BiDotsVerticalRounded size={20} className="text-white" />}
                                                </button>

                                                {openMenuId === song.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(song); }}
                                                                className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-white flex items-center gap-2"
                                                            >
                                                                <BiDownload size={18} /> Download
                                                            </button>
                                                            {isOwner && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-red-400 flex items-center gap-2"
                                                                >
                                                                    <BiTrash size={18} /> Remove Song
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Similar Playlists - Desktop */}
                            {relatedPlaylists.length > 0 && (
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-8">You might also like</h2>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {relatedPlaylists.slice(0, 10).map((relPlaylist) => {
                                            const imageUrl = relPlaylist.image?.[2]?.url || relPlaylist.image?.[0]?.url;
                                            return (
                                                <Link
                                                    key={relPlaylist.id}
                                                    href={`/playlist/${relPlaylist.id}`}
                                                    className="group"
                                                >
                                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-900 shadow-lg flex items-center justify-center">
                                                        <SongImage
                                                            src={imageUrl}
                                                            alt={relPlaylist.name}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                            sizes="(max-width: 1200px) 25vw, 200px"
                                                            fallbackSize={80}
                                                        />
                                                    </div>
                                                    <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">
                                                        {he.decode(relPlaylist.title || relPlaylist.name)}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm line-clamp-1">
                                                        Playlist • {relPlaylist.songCount || 'Various'} songs
                                                    </p>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-zinc-900 w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-2">
                            {deleteAction?.type === 'batch' ? 'Remove Songs?' : 'Remove Song?'}
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to remove {deleteAction?.type === 'batch' ? `${selectedSongs.length} songs` : 'this song'} from the playlist?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteAction(null); }}
                                className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeRemove}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
