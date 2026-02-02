'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import he from 'he';
import {
    BiPlay,
    BiPause,
    BiSkipNext,
    BiSkipPrevious,
    BiShuffle,
    BiRepeat,
    BiDownload,
    BiLoaderAlt,
    BiChevronDown,
    BiDotsVerticalRounded,
    BiVolumeFull,
    BiPlus,
    BiListPlus,
} from 'react-icons/bi';
import { HiOutlineHeart, HiHeart } from 'react-icons/hi';
import { IoShareOutline, IoChevronBack, IoChevronForward, IoLogoWhatsapp, IoLogoFacebook, IoLogoTwitter, IoCopyOutline, IoClose } from 'react-icons/io5';
import SongImage from '@/components/ui/SongImage';
import { getImageUrl } from '@/lib/imageUtils';

function PlayerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryId = searchParams.get('id');
    const [isInitializing, setIsInitializing] = useState(!!queryId);
    const [showShareModal, setShowShareModal] = useState(false);

    const [activeTab, setActiveTab] = useState<'related' | 'upnext' | 'details'>('related');
    // Removed local time/duration state to use global store
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [relatedSongs, setRelatedSongs] = useState<any[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);

    // Details Tab State
    const [fullSongDetails, setFullSongDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    // Scroll refs for carousels
    const artistsScrollRef = useRef<HTMLDivElement>(null);
    const starringScrollRef = useRef<HTMLDivElement>(null);

    const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = 600;
            ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // Removed audioRef - using global MiniPlayer
    const currentSong = useMusicStore((state) => state.currentSong);

    // Auth and Like Logic
    const { user, userData, toggleLike, addPlaylist } = useAuthStore();
    const isLiked = userData?.likedSongs?.some((s: any) => s.id === currentSong?.id) || false;

    const queue = useMusicStore((state) => state.queue);
    const playNext = useMusicStore((state) => state.playNext);
    const playPrevious = useMusicStore((state) => state.playPrevious);
    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);
    const isShuffle = useMusicStore((state) => state.isShuffle);
    const repeatMode = useMusicStore((state) => state.repeatMode);
    const toggleShuffle = useMusicStore((state) => state.toggleShuffle);
    const toggleRepeat = useMusicStore((state) => state.toggleRepeat);
    const currentTime = useMusicStore((state) => state.currentTime);
    const duration = useMusicStore((state) => state.duration);
    const seekTo = useMusicStore((state) => state.seekTo);

    const filters = ['All', 'Familiar', 'Discover', 'Popular', 'Deep cuts'];

    // Fetch related songs and Details when current song changes
    useEffect(() => {
        if (!currentSong?.id) return;

        fetchRelatedSongs();
        fetchSongDetails();
    }, [currentSong?.id]);

    const fetchSongDetails = async () => {
        if (!currentSong?.id) return;
        // Don't re-fetch if we already have data for this song
        if (fullSongDetails?.id === currentSong.id) return;
        if (currentSong.youtubeId) return; // Skip for YouTube songs

        setLoadingDetails(true);
        try {
            // Fetch Song Details
            const songRes = await api.get(`/songs/${currentSong.id}`);
            if (songRes.data?.data?.[0]) {
                setFullSongDetails(songRes.data.data[0]);
            }

        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const [showMenu, setShowMenu] = useState(false);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [toastMessage, setToastMessage] = useState('');

    const toggleMenu = () => setShowMenu(!showMenu);

    const handleShare = async () => {
        if (!currentSong) return;
        const shareUrl = `${window.location.origin}/player?id=${currentSong.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentSong.name,
                    text: `Listen to ${currentSong.name} on Groovia!`,
                    url: shareUrl
                });
                return;
            } catch (err) {
                if ((err as any).name !== 'AbortError') setShowShareModal(true);
            }
        } else {
            setShowShareModal(true);
        }
    };

    const copyLink = () => {
        const shareUrl = `${window.location.origin}/player?id=${currentSong?.id}`;
        navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard');
        setShowShareModal(false);
    };

    const openPlaylistSelector = async () => {
        setShowMenu(false);
        setShowPlaylistSelector(true);
        if (user) {
            fetchUserPlaylists();
        }
    };

    const fetchUserPlaylists = async () => {
        if (!user) return;
        try {
            // Use fetch directly to hit local API
            const response = await fetch(`/api/user/playlists?uid=${user.uid}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUserPlaylists(data.playlists);
                }
            }
        } catch (error) {
            console.error('Error fetching playlists:', error);
        }
    };

    const createPlaylist = async () => {
        if (!newPlaylistName.trim() || !user) return;
        try {
            const response = await fetch('/api/playlists/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    name: newPlaylistName,
                    description: `Created from Player`
                })
            });
            if (response.ok) {
                const data = await response.json();
                setUserPlaylists(prev => [...prev, data.playlist]);
                setNewPlaylistName('');
                setShowCreateInput(false);

                // Propagate to Global Store so Library Page updates
                addPlaylist(data.playlist);
            }
        } catch (error) {
            console.error('Error creating playlist', error);
        }
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!user || !currentSong) return;
        try {
            const response = await fetch('/api/playlists/add-song', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    playlistId,
                    song: currentSong
                })
            });

            if (response.ok) {
                showToast('Added to playlist');
                setShowPlaylistSelector(false);
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to add');
            }
        } catch (error) {
            showToast('Error adding song');
        }
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const fetchRelatedSongs = async () => {
        if (!currentSong?.id) return;

        try {
            setLoadingRelated(true);

            if (currentSong.youtubeId) {
                const response = await fetch(`http://localhost:8000/watch?videoId=${currentSong.youtubeId}`);
                const data = await response.json();
                const tracks = data.data?.tracks || [];
                const mappedSongs = tracks.map((t: any) => ({
                    id: t.videoId,
                    name: t.title,
                    type: 'youtube', // distinctive
                    artists: { primary: t.artists ? t.artists.map((a: any) => ({ name: a.name })) : [{ name: 'Unknown' }] },
                    image: t.thumbnail || [],
                    youtubeId: t.videoId
                }));
                setRelatedSongs(mappedSongs);
            } else {
                const response = await api.get(`/songs/${currentSong.id}/suggestions`, {
                    params: { limit: 20 }
                });
                setRelatedSongs(response.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching related songs:', error);
            setRelatedSongs([]);
        } finally {
            setLoadingRelated(false);
        }
    };

    // Play song from related and set related as new queue
    const handlePlayRelated = (song: any) => {
        setQueue(relatedSongs); // Set related songs as queue
        playSong(song);
    };

    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!currentSong || isDownloading) return;

        try {
            setIsDownloading(true);
            // Get download URL from song data based on settings
            const prefQuality = userData?.settings?.downloadQuality || '320kbps';

            const downloadUrl = currentSong.downloadUrl?.find((d: any) => d.quality === prefQuality)?.url ||
                currentSong.downloadUrl?.find((d: any) => d.quality === '320kbps')?.url ||
                currentSong.downloadUrl?.find((d: any) => d.quality === '160kbps')?.url ||
                currentSong.downloadUrl?.[0]?.url;

            if (downloadUrl) {
                // Use our local proxy to avoid CORS issues
                const proxyUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}`;

                // Fetch the file as blob via proxy
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();

                // Create blob URL
                const blobUrl = window.URL.createObjectURL(blob);

                // Create temporary anchor
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${he.decode(currentSong.name)}.mp3`;
                link.style.display = 'none';

                // Append, click, and cleanup
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Revoke blob URL after download
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

                console.log('Download started:', currentSong.name);
            } else {
                console.error('No download URL available');
            }
        } catch (error) {
            console.error('Download error:', error);
        } finally {
            setIsDownloading(false);
        }
    };


    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const pauseSong = useMusicStore((state) => state.pauseSong);
    const resumeSong = useMusicStore((state) => state.resumeSong);
    const isPlaying = useMusicStore((state) => state.isPlaying);

    // Toggle play/pause
    const togglePlayPause = () => {
        if (isPlaying) {
            pauseSong();
        } else {
            resumeSong();
        }
    };

    // Deep Linking Effect
    useEffect(() => {
        if (queryId && (!currentSong || currentSong.id !== queryId)) {
            setIsInitializing(true);
            api.get(`/songs/${queryId}`)
                .then(res => {
                    if (res.data?.data?.[0]) playSong(res.data.data[0]);
                })
                .catch(e => console.error(e))
                .finally(() => setIsInitializing(false));
        } else if (queryId && currentSong?.id === queryId) {
            setIsInitializing(false);
        }
    }, [queryId]);

    // Redirect if no song is playing
    useEffect(() => {
        if (!currentSong && !queryId && !isInitializing) {
            router.replace('/');
        }
    }, [currentSong, router, queryId, isInitializing]);

    if (!currentSong) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <BiLoaderAlt size={40} className="text-purple-500 animate-spin" />
            </div>
        );
    }

    // Derived state for Details
    const rawArtists = fullSongDetails?.artists?.all || fullSongDetails?.artists?.primary || [];
    const getUniqueList = (list: any[]) => {
        const seen = new Set();
        return list.filter(item => {
            const id = item.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    };
    const starringList = getUniqueList(rawArtists.filter((a: any) =>
        ['starring', 'actor', 'actress', 'cast'].includes(a.role?.toLowerCase())
    ));
    const musiciansList = getUniqueList(rawArtists.filter((a: any) =>
        !['starring', 'actor', 'actress', 'cast'].includes(a.role?.toLowerCase())
    ));

    return (
        <>
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full shadow-2xl font-bold animate-fadeIn transition-all">
                    {toastMessage}
                </div>
            )}

            {/* Main Option Menu (3-dots) */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center animation-fade-in"
                    onClick={() => setShowMenu(false)}
                >
                    <div
                        className="bg-[#1e1e1e] w-full md:w-72 md:rounded-xl rounded-t-3xl p-4 shadow-2xl border border-white/10 flex flex-col gap-2 transform transition-transform"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 md:hidden"></div>

                        <button
                            onClick={openPlaylistSelector}
                            className="w-full flex items-center gap-4 p-4 text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                        >
                            <div className="p-2 bg-white/10 rounded-full">
                                <BiListPlus size={24} />
                            </div>
                            <span className="font-medium text-lg md:text-base">Add to Playlist</span>
                        </button>

                        <button
                            onClick={() => setShowMenu(false)}
                            className="w-full md:hidden py-4 text-white/50 font-medium border-t border-white/5 mt-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div
                    className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animation-fade-in"
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        className="bg-[#1e1e1e] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl p-6 relative transform transition-all scale-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/20">
                            <IoClose size={20} className="text-white" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6 text-center">Share Song</h3>

                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {/* WhatsApp */}
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Listen to ${currentSong.name} on Groovia! ${window.location.origin}/player?id=${currentSong.id}`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <IoLogoWhatsapp size={28} className="text-white" />
                                </div>
                                <span className="text-xs text-gray-400">WhatsApp</span>
                            </a>

                            {/* Facebook */}
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/player?id=${currentSong.id}`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <IoLogoFacebook size={28} className="text-white" />
                                </div>
                                <span className="text-xs text-gray-400">Facebook</span>
                            </a>

                            {/* Twitter */}
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Listen to ${currentSong.name} on Groovia!`)}&url=${encodeURIComponent(`${window.location.origin}/player?id=${currentSong.id}`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#1DA1F2] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <IoLogoTwitter size={28} className="text-white" />
                                </div>
                                <span className="text-xs text-gray-400">Twitter</span>
                            </a>

                            {/* Copy Link */}
                            <button
                                onClick={copyLink}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    <IoCopyOutline size={28} className="text-white" />
                                </div>
                                <span className="text-xs text-gray-400">Copy Link</span>
                            </button>
                        </div>

                        <div className="p-3 bg-black/40 rounded-xl flex items-center justify-between border border-white/5">
                            <p className="text-xs text-gray-400 truncate flex-1 mr-4">
                                {`${window.location.origin}/player?id=${currentSong.id}`}
                            </p>
                            <button onClick={copyLink} className="text-purple-400 text-xs font-bold hover:text-purple-300">
                                COPY
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Playlist Selector Modal */}
            {showPlaylistSelector && (
                <div
                    className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setShowPlaylistSelector(false)}
                >
                    <div
                        className="bg-[#121212] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between bg-[#121212]">
                            <h3 className="text-white font-bold text-xl">Add to Playlist</h3>
                            <button onClick={() => setShowPlaylistSelector(false)} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                                <BiChevronDown size={24} />
                            </button>
                        </div>

                        {!user ? (
                            <div className="p-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-6">
                                    <BiListPlus size={32} className="text-purple-500" />
                                </div>
                                <h4 className="text-white font-bold text-lg mb-2">Login Required</h4>
                                <p className="text-gray-400 mb-8 text-sm">Please login to manage your playlists.</p>
                                <button
                                    onClick={() => router.push('/login')}
                                    className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                                >
                                    Login to Continue
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                                {/* Create New Button */}
                                <button
                                    onClick={() => setShowCreateInput(!showCreateInput)}
                                    className="w-full flex items-center gap-4 p-3 mb-2 text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all border border-dashed border-purple-500/30 font-bold"
                                >
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <BiPlus size={24} />
                                    </div>
                                    Create New Playlist
                                </button>

                                {/* Inline Create Input */}
                                {showCreateInput && (
                                    <div className="p-3 bg-zinc-900 rounded-xl mb-4 border border-white/10 animate-fadeIn">
                                        <input
                                            type="text"
                                            placeholder="My Awesome Playlist"
                                            className="w-full bg-black/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 border border-white/5"
                                            value={newPlaylistName}
                                            onChange={e => setNewPlaylistName(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={createPlaylist}
                                                disabled={!newPlaylistName.trim()}
                                                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                                            >
                                                Create & Add
                                            </button>
                                            <button
                                                onClick={() => setShowCreateInput(false)}
                                                className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Playlist List */}
                                <div className="space-y-1 mt-2">
                                    {userPlaylists.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8 text-sm">No playlists found</p>
                                    ) : (
                                        userPlaylists.map(playlist => (
                                            <button
                                                key={playlist._id}
                                                onClick={() => handleAddToPlaylist(playlist._id)}
                                                className="w-full flex items-center gap-4 p-2 hover:bg-[#2a2a2a] rounded-xl group text-left transition-colors active:scale-[0.98]"
                                            >
                                                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg relative">
                                                    <SongImage src={playlist.image} alt={playlist.name} fill className="object-cover" fallbackSize={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-bold text-sm truncate">{playlist.name}</p>
                                                    <p className="text-gray-500 text-xs truncate">{playlist.songs?.length || 0} songs</p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <BiPlus size={20} className="text-white" />
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile View */}
            <div className="md:hidden fixed inset-0 bg-sidebar z-50 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-sidebar/95 backdrop-blur-lg sticky top-0 z-10">
                    <button onClick={() => router.back()} className="p-2">
                        <BiChevronDown size={28} className="text-white" />
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm text-gray-400">Playing from</p>
                        <p className="text-sm text-white font-medium line-clamp-1">Groovia Mix</p>
                    </div>
                    <button onClick={toggleMenu} className="p-2">
                        <BiDotsVerticalRounded size={24} className="text-white" />
                    </button>
                </div>

                {/* Album Art */}
                <div className="px-6 py-8">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
                        <SongImage
                            src={currentSong.image?.[2]?.url || currentSong.image?.[0]?.url}
                            alt={currentSong.name}
                            fill
                            className="object-cover"
                            priority
                            fallbackSize={80}
                        />
                    </div>
                </div>

                {/* Song Info */}
                <div className="px-6 pb-4">
                    <h1 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                        {he.decode(currentSong.name)}
                    </h1>
                    <p className="text-base text-gray-400 line-clamp-1">
                        {currentSong.artists?.primary?.map((a: any) => a.name).join(', ')}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-around px-6 pb-6">
                    <button
                        onClick={() => {
                            if (!user) {
                                router.push('/login');
                                return;
                            }
                            toggleLike(currentSong);
                        }}
                        className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    >
                        <div className={`p-3 rounded-lg hover:bg-zinc-800 ${isLiked ? 'bg-purple-500/10' : 'bg-zinc-900'}`}>
                            {isLiked ? (
                                <HiHeart size={20} className="text-purple-500 animate-pulse-once" />
                            ) : (
                                <HiOutlineHeart size={20} className="text-white" />
                            )}
                        </div>
                        <span className={`text-xs ${isLiked ? 'text-purple-400' : 'text-gray-400'}`}>
                            {isLiked ? 'Liked' : 'Save'}
                        </span>
                    </button>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                        <div className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800">
                            <IoShareOutline size={20} className="text-white" />
                        </div>
                        <span className="text-xs text-gray-400">Share</span>
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex flex-col items-center gap-1"
                        disabled={isDownloading}
                    >
                        <div className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
                            {isDownloading ? (
                                <BiLoaderAlt size={20} className="text-purple-500 animate-spin" />
                            ) : (
                                <BiDownload size={20} className="text-white" />
                            )}
                        </div>
                        <span className="text-xs text-gray-400">
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pb-4">
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                            seekTo(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #7c3aed ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%)`
                        }}
                    />
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 px-6 pb-8">
                    <button onClick={toggleShuffle} className="p-2">
                        <BiShuffle size={24} className={isShuffle ? "text-purple-500" : "text-gray-400"} />
                    </button>
                    <button onClick={playPrevious} className="p-2">
                        <BiSkipPrevious size={32} className="text-white" />
                    </button>
                    <button
                        onClick={togglePlayPause}
                        className="p-6 rounded-full bg-white hover:scale-105 transition-transform"
                    >
                        {isPlaying ? (
                            <BiPause size={32} className="text-black" />
                        ) : (
                            <BiPlay size={32} className="text-black ml-1" />
                        )}
                    </button>
                    <button onClick={() => playNext(false)} className="p-2">
                        <BiSkipNext size={32} className="text-white" />
                    </button>
                    <button onClick={toggleRepeat} className="p-2 relative">
                        <BiRepeat size={24} className={repeatMode !== 'off' ? "text-purple-500" : "text-gray-400"} />
                        {repeatMode === 'one' && (
                            <span className="absolute top-1 right-0 text-[10px] font-bold text-purple-500 bg-black rounded-full px-0.5 border border-purple-500 leading-none">1</span>
                        )}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 sticky top-16 bg-sidebar z-10">
                    <button
                        onClick={() => setActiveTab('related')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'related'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-400'
                            }`}
                    >
                        RELATED
                    </button>
                    <button
                        onClick={() => setActiveTab('upnext')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'upnext'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-400'
                            }`}
                    >
                        UP NEXT
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'details'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-400'
                            }`}
                    >
                        DETAILS
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pb-20">
                    {activeTab === 'upnext' && (
                        <div className="p-4">


                            {/* Queue */}
                            {queue.length > 0 ? (
                                <div className="space-y-2">
                                    {queue.map((song, index) => (
                                        <div
                                            key={index}
                                            onClick={() => playSong(song)}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                        >
                                            <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                                <SongImage
                                                    src={getImageUrl(song.image)}
                                                    alt={song.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="48px"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-medium text-sm line-clamp-1">
                                                    {he.decode(song.name)}
                                                </h3>
                                                <p className="text-gray-400 text-xs line-clamp-1">
                                                    {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                                </p>
                                            </div>
                                            <span className="text-gray-400 text-xs">{song.duration || '3:45'}</span>
                                            <button className="p-2">
                                                <BiDotsVerticalRounded size={20} className="text-gray-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No songs in queue</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'related' && (
                        <div className="p-4 space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4">You might also like</h2>
                                {loadingRelated ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </div>
                                ) : relatedSongs.length > 0 ? (
                                    <div className="space-y-2">
                                        {relatedSongs.map((song, i) => (
                                            <div
                                                key={i}
                                                onClick={() => handlePlayRelated(song)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                            >
                                                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                                    <SongImage src={getImageUrl(song.image)} alt={song.name} fill className="object-cover" sizes="48px" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-medium text-sm line-clamp-1">{he.decode(song.name)}</h3>
                                                    <p className="text-gray-400 text-xs line-clamp-1">{song.artists?.primary?.map((a: any) => a.name).join(', ')}</p>
                                                </div>
                                                <button className="p-2">
                                                    <BiDotsVerticalRounded size={20} className="text-gray-400" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-center py-8">No suggestions available</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="p-4 space-y-8 pb-24">
                            {loadingDetails ? (
                                <div className="text-center py-12">
                                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : fullSongDetails ? (
                                <>
                                    {/* Artists */}
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">Artists</h3>
                                        <div className="flex overflow-x-auto scrollbar-hide gap-3 -mx-4 px-4 snap-x">
                                            {musiciansList.map((artist: any) => (
                                                <Link key={artist.id} href={`/artist/${artist.id}`} className="flex-shrink-0 w-[45%] snap-start group">
                                                    <div className="relative w-full aspect-square rounded-full overflow-hidden mb-2 bg-zinc-800">
                                                        <SongImage src={getImageUrl(artist.image, 'medium')} alt={artist.name} fill className="object-cover" />
                                                    </div>
                                                    <p className="text-white text-sm font-medium text-center line-clamp-1 group-hover:underline">{artist.name}</p>
                                                    <p className="text-gray-400 text-xs text-center capitalize">{artist.role}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Starring */}
                                    {starringList.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-3">Starring</h3>
                                            <div className="flex overflow-x-auto scrollbar-hide gap-3 -mx-4 px-4 snap-x">
                                                {starringList.map((artist: any) => (
                                                    <div key={artist.id} className="flex-shrink-0 w-[45%] snap-start">
                                                        <div className="relative w-full aspect-square rounded-full overflow-hidden mb-2 bg-zinc-800">
                                                            <SongImage src={getImageUrl(artist.image, 'medium')} alt={artist.name} fill className="object-cover" />
                                                        </div>
                                                        <p className="text-white text-sm font-medium text-center line-clamp-1">{artist.name}</p>
                                                        <p className="text-gray-400 text-xs text-center capitalize">{artist.role}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Album */}
                                    {fullSongDetails.album && (
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-3">From Album</h3>
                                            <Link href={`/album/${fullSongDetails.album.id}`} className="block w-[45%]">
                                                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-zinc-800">
                                                    <SongImage src={getImageUrl(fullSongDetails.image, 'medium')} alt={fullSongDetails.album.name} fill className="object-cover" />
                                                </div>
                                                <p className="text-white text-sm font-bold line-clamp-1">{fullSongDetails.album.name}</p>
                                            </Link>
                                        </div>
                                    )}

                                    {/* Playlists - Removed as requested */}
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block fixed inset-0 md:pl-64 bg-sidebar pt-16 pb-24">
                {/* Minimize Button - Top Right */}
                <button
                    onClick={() => router.back()}
                    className="hidden md:block fixed top-20 right-6 z-50 p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
                    title="Minimize Player"
                >
                    <BiChevronDown size={24} className="text-white" />
                </button>

                <div className="h-full flex gap-6 p-6 max-w-[1800px] mx-auto">
                    {/* Left: Album Art */}
                    <div className="w-[45%] flex flex-col">
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl mb-6">
                            <SongImage
                                src={getImageUrl(currentSong.image)}
                                alt={currentSong.name}
                                fill
                                className="object-cover"
                                priority
                                sizes="(max-width: 768px) 100vw, 45vw"
                                fallbackSize={120}
                            />
                        </div>

                        {/* Song Info - No truncation, will scroll if needed */}
                        <h1 className="text-3xl font-bold text-white mb-2 break-words">
                            {he.decode(currentSong.name)}
                        </h1>
                        <p className="text-lg text-gray-400 mb-4 break-words">
                            {currentSong.artists?.primary?.map((a: any) => a.name).join(', ')} • 2025
                        </p>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (!user) {
                                        router.push('/login');
                                        return;
                                    }
                                    toggleLike(currentSong);
                                }}
                                className="p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                {isLiked ? (
                                    <HiHeart size={24} className="text-purple-500 animate-pulse-once" />
                                ) : (
                                    <HiOutlineHeart size={24} className="text-white" />
                                )}
                            </button>
                            <button onClick={handleShare} className="p-3 rounded-lg hover:bg-zinc-800" title="Share">
                                <IoShareOutline size={24} className="text-white" />
                            </button>
                            <button
                                onClick={handleDownload}
                                className="p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                                title="Download"
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <BiLoaderAlt size={24} className="text-purple-500 animate-spin" />
                                ) : (
                                    <BiDownload size={24} className="text-white" />
                                )}
                            </button>
                            <button onClick={toggleMenu} className="p-3 rounded-lg hover:bg-zinc-800">
                                <BiDotsVerticalRounded size={24} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Right: Tabs & Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Tabs */}
                        <div className="flex border-b border-zinc-800">
                            <button
                                onClick={() => setActiveTab('related')}
                                className={`px-6 py-3 text-sm font-medium ${activeTab === 'related'
                                    ? 'text-white border-b-2 border-white'
                                    : 'text-gray-400'
                                    }`}
                            >
                                RELATED
                            </button>
                            <button
                                onClick={() => setActiveTab('upnext')}
                                className={`px-6 py-3 text-sm font-medium ${activeTab === 'upnext'
                                    ? 'text-white border-b-2 border-white'
                                    : 'text-gray-400'
                                    }`}
                            >
                                UP NEXT
                            </button>
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-6 py-3 text-sm font-medium ${activeTab === 'details'
                                    ? 'text-white border-b-2 border-white'
                                    : 'text-gray-400'
                                    }`}
                            >
                                DETAILS
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            {activeTab === 'upnext' && (
                                <div className="p-6">


                                    {/* Queue */}
                                    {queue.length > 0 ? (
                                        <div className="space-y-1">
                                            {queue.map((song, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => playSong(song)}
                                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer group"
                                                >
                                                    <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0">
                                                        <SongImage
                                                            src={getImageUrl(song.image)}
                                                            alt={song.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                            fallbackSize={28}
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <BiPlay size={24} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-white font-medium text-sm line-clamp-1">
                                                            {he.decode(song.name)}
                                                        </h3>
                                                        <p className="text-gray-400 text-xs line-clamp-1">
                                                            {song.artists?.primary?.map((a: any) => a.name).join(', ')}
                                                        </p>
                                                    </div>
                                                    <span className="text-gray-400 text-sm">{song.duration || '3:45'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-center py-12">No songs in queue</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'related' && (
                                <div className="p-6 space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-4">You might also like</h2>
                                        {loadingRelated ? (
                                            <div className="text-center py-12">
                                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                <p className="text-gray-400 mt-4">Loading suggestions...</p>
                                            </div>
                                        ) : relatedSongs.length > 0 ? (
                                            <div className="space-y-1">
                                                {relatedSongs.map((song, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handlePlayRelated(song)}
                                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer"
                                                    >
                                                        <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0">
                                                            <SongImage src={getImageUrl(song.image)} alt={song.name} fill className="object-cover" sizes="56px" fallbackSize={28} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-white font-medium text-sm line-clamp-1">{he.decode(song.name)}</h3>
                                                            <p className="text-gray-400 text-xs line-clamp-1">{song.artists?.primary?.map((a: any) => a.name).join(', ')}</p>
                                                        </div>
                                                        <button className="p-2">
                                                            <BiDotsVerticalRounded size={20} className="text-gray-400" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-center py-12">No suggestions available</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="p-6 space-y-8">
                                    {loadingDetails ? (
                                        <div className="text-center py-12">
                                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    ) : fullSongDetails ? (
                                        <>
                                            {/* Artists (Desktop) */}
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-4">Artists</h3>
                                                <div className="relative group/carousel">
                                                    <button onClick={() => scrollCarousel(artistsScrollRef, 'left')} className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 items-center justify-center rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black">
                                                        <IoChevronBack size={24} className="text-white" />
                                                    </button>
                                                    <button onClick={() => scrollCarousel(artistsScrollRef, 'right')} className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 items-center justify-center rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black">
                                                        <IoChevronForward size={24} className="text-white" />
                                                    </button>

                                                    <div ref={artistsScrollRef} className="flex overflow-x-auto scrollbar-hide gap-6 scroll-smooth">
                                                        {musiciansList.map((artist: any) => (
                                                            <Link key={artist.id} href={`/artist/${artist.id}`} className="flex-shrink-0 w-[140px] group text-center">
                                                                <div className="relative w-full aspect-square rounded-full overflow-hidden mb-3 bg-zinc-800 shadow-lg group-hover:scale-105 transition-transform">
                                                                    <SongImage src={getImageUrl(artist.image, 'medium')} alt={artist.name} fill className="object-cover" />
                                                                </div>
                                                                <p className="text-white text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">{artist.name}</p>
                                                                <p className="text-gray-400 text-sm capitalize">{artist.role}</p>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Starring (Desktop) */}
                                            {starringList.length > 0 && (
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white mb-4">Starring</h3>
                                                    <div className="relative group/carousel">
                                                        <button onClick={() => scrollCarousel(starringScrollRef, 'left')} className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 items-center justify-center rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black">
                                                            <IoChevronBack size={24} className="text-white" />
                                                        </button>
                                                        <button onClick={() => scrollCarousel(starringScrollRef, 'right')} className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-white/10 items-center justify-center rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black">
                                                            <IoChevronForward size={24} className="text-white" />
                                                        </button>

                                                        <div ref={starringScrollRef} className="flex overflow-x-auto scrollbar-hide gap-6 scroll-smooth">
                                                            {starringList.map((artist: any) => (
                                                                <div key={artist.id} className="flex-shrink-0 w-[140px] text-center">
                                                                    <div className="relative w-full aspect-square rounded-full overflow-hidden mb-3 bg-zinc-800 shadow-lg">
                                                                        <SongImage src={getImageUrl(artist.image, 'medium')} alt={artist.name} fill className="object-cover" />
                                                                    </div>
                                                                    <p className="text-white text-base font-bold line-clamp-1">{artist.name}</p>
                                                                    <p className="text-gray-400 text-sm capitalize">{artist.role}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Album (Desktop) */}
                                            {fullSongDetails.album && (
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white mb-4">From Album</h3>
                                                    <Link href={`/album/${fullSongDetails.album.id}`} className="block w-[180px]">
                                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-zinc-800 shadow-lg hover:scale-105 transition-transform">
                                                            <SongImage src={getImageUrl(fullSongDetails.image, '500x500')} alt={fullSongDetails.album.name} fill className="object-cover" />
                                                        </div>
                                                        <p className="text-white text-lg font-bold line-clamp-1">{fullSongDetails.album.name}</p>
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Playlists - Removed as requested */}
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audio managed by persistent MiniPlayer */}
        </>
    );
}

export default function PlayerPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <BiLoaderAlt size={40} className="text-purple-500 animate-spin" />
            </div>
        }>
            <PlayerContent />
        </Suspense>
    );
}
