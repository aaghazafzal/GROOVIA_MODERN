'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import SongImage from '@/components/ui/SongImage';
import Link from 'next/link';
import he from 'he';
import {
    BiPlay, BiPause, BiShuffle, BiChevronLeft, BiChevronRight, BiDotsVerticalRounded, BiChevronDown, BiChevronUp
} from 'react-icons/bi';
import { HiOutlineHeart } from 'react-icons/hi';
import { IoRadioOutline, IoShareOutline } from 'react-icons/io5';

interface ArtistData {
    id: string;
    name: string;
    image: { quality: string; url: string }[];
    followerCount?: string;
    fanCount?: string;
    bio?: any;
    topSongs?: any[];
    topAlbums?: any[];
    singles?: any[];
    similarArtists?: any[];
    featuredPlaylists?: any[];
}

export default function ArtistPage() {
    const params = useParams();
    const router = useRouter();
    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFullBio, setShowFullBio] = useState(false);
    const [showAllSongs, setShowAllSongs] = useState(false);

    const albumsRef = useRef<HTMLDivElement>(null);
    const singlesRef = useRef<HTMLDivElement>(null);
    const playlistsRef = useRef<HTMLDivElement>(null);
    const similarRef = useRef<HTMLDivElement>(null);

    const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (ref.current) {
            const { current } = ref;
            const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);
    const isPlaying = useMusicStore((state) => state.isPlaying);
    const currentSong = useMusicStore((state) => state.currentSong);
    const pauseSong = useMusicStore((state) => state.pauseSong);

    // Check if artist's song is playing
    const isArtistPlaying = currentSong && artist &&
        artist.topSongs?.some(song => song.id === currentSong.id) && isPlaying;

    // Safe decode function
    const safeDecode = (text: any) => {
        if (!text) return '';
        // Handle bio objects with text property
        if (typeof text === 'object' && text.text) {
            return he.decode(text.text);
        }
        if (typeof text !== 'string') return text || '';
        return he.decode(text);
    };

    // Get bio text from potentially complex bio object
    const getBioText = () => {
        if (!artist?.bio) return '';
        if (typeof artist.bio === 'string') return artist.bio;
        if (typeof artist.bio === 'object') {
            // Bio might be array of objects or single object
            if (Array.isArray(artist.bio)) {
                return artist.bio.map((b: any) => b.text || '').join(' ');
            }
            return (artist.bio as any).text || '';
        }
        return '';
    };

    useEffect(() => {
        if (params.id) {
            fetchArtistDetails();
        }
    }, [params.id]);

    const fetchArtistDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get('/artists', {
                params: { id: params.id }
            });
            console.log('Artist response:', response.data);

            if (response.data?.data) {
                setArtist(response.data.data);
            } else {
                setArtist(null);
            }
        } catch (error) {
            console.error('Error fetching artist:', error);
            setArtist(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayAll = () => {
        if (artist && artist.topSongs && artist.topSongs.length > 0) {
            if (isArtistPlaying) {
                pauseSong();
            } else {
                setQueue(artist.topSongs);
                playSong(artist.topSongs[0]);
            }
        }
    };

    const handlePlaySong = (song: any) => {
        if (artist && artist.topSongs) {
            setQueue(artist.topSongs);
            playSong(song);
        }
    };

    const handleShuffle = () => {
        if (artist && artist.topSongs && artist.topSongs.length > 0) {
            const shuffled = [...artist.topSongs].sort(() => Math.random() - 0.5);
            setQueue(shuffled);
            playSong(shuffled[0]);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!artist) {
        return (
            <div className="fixed inset-0 bg-sidebar flex items-center justify-center">
                <p className="text-gray-400">Artist not found</p>
            </div>
        );
    }

    return (
        <>

            {/* Mobile View - YouTube Music Style */}
            <div className="md:hidden min-h-screen bg-black pb-32 -m-4">
                {/* Header Back Button */}
                <div className="fixed top-0 left-0 z-20 p-4">
                    <button onClick={() => router.back()} className="p-2 bg-black/50 rounded-full backdrop-blur-md">
                        <BiChevronLeft size={28} className="text-white" />
                    </button>
                </div>

                {/* Hero Section */}
                <div className="relative w-full aspect-[4/3]">
                    <SongImage
                        src={artist.image?.[2]?.url || artist.image?.[0]?.url}
                        alt={artist.name}
                        fill
                        className="object-cover"
                        priority
                        sizes="100vw"
                        fallbackSize={100}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

                    <div className="absolute bottom-0 left-0 w-full px-4 pb-4">
                        <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-md">
                            {safeDecode(artist.name)}
                        </h1>
                        {artist.followerCount && (
                            <p className="text-gray-300 text-sm font-medium mb-4">
                                {(parseInt(artist.followerCount) / 10000000).toFixed(1)} crore monthly audience
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons & Info */}
                <div className="px-4 py-4">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <button
                            onClick={handlePlayAll}
                            className="w-full py-3.5 rounded-full bg-white text-black font-bold text-lg flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
                        >
                            {isArtistPlaying ? <BiPause size={32} /> : <BiPlay size={32} className="ml-1" />}
                            <span className="uppercase tracking-wide">Play</span>
                        </button>
                    </div>

                    {/* New Single Promo */}
                    {artist.singles && artist.singles.length > 0 && (
                        <div className="bg-zinc-900/50 rounded-lg p-3 flex items-center gap-4 mb-8 border border-zinc-800" onClick={() => router.push(`/album/${artist.singles![0].id}`)}>
                            <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <SongImage
                                    src={artist.singles![0].image?.[1]?.url || artist.singles![0].image?.[0]?.url}
                                    alt={artist.singles![0].name}
                                    fill
                                    className="object-cover"
                                    fallbackSize={24}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Listen to the new single</p>
                                <h3 className="text-white font-bold text-sm line-clamp-1">{safeDecode(artist.singles![0].name)}</h3>
                            </div>
                            <BiChevronLeft size={24} className="text-gray-400 rotate-180" />
                        </div>
                    )}

                    {/* Top Songs */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Top songs</h2>
                        </div>
                        <div className="space-y-1">
                            {artist.topSongs?.slice(0, showAllSongs ? artist.topSongs.length : 5).map((song, index) => (
                                <div
                                    key={song.id}
                                    onClick={() => handlePlaySong(song)}
                                    className="flex items-center gap-4 py-3 active:bg-zinc-900/50 rounded-lg -mx-2 px-2 transition-colors"
                                >
                                    <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md">
                                        <SongImage
                                            src={song.image?.[1]?.url || song.image?.[0]?.url}
                                            alt={song.name}
                                            fill
                                            className="object-cover"
                                            fallbackSize={28}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h3 className="text-white font-medium text-base line-clamp-1 mb-0.5">
                                            {safeDecode(song.name)}
                                        </h3>
                                        <p className="text-gray-400 text-xs line-clamp-1">
                                            {artist.name}
                                        </p>
                                    </div>
                                    <button className="p-2 text-gray-400" onClick={(e) => e.stopPropagation()}>
                                        <BiDotsVerticalRounded size={24} />
                                    </button>
                                </div>
                            ))}
                            {artist.topSongs && artist.topSongs.length > 5 && (
                                <button
                                    onClick={() => setShowAllSongs(!showAllSongs)}
                                    className="w-full py-3 text-center text-white font-bold text-sm mt-2 border border-zinc-800 rounded-full hover:bg-zinc-900 transition-colors uppercase tracking-wider"
                                >
                                    {showAllSongs ? 'Show Less' : 'Show All'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Albums Carousel */}
                    {artist.topAlbums && artist.topAlbums.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
                            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {artist.topAlbums.map((album) => (
                                    <Link key={album.id} href={`/album/${album.id}`} className="flex-shrink-0 w-[140px] snap-start">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900 shadow-md">
                                            <SongImage
                                                src={album.image?.[2]?.url || album.image?.[0]?.url}
                                                alt={album.name}
                                                fill
                                                className="object-cover"
                                                fallbackSize={60}
                                            />
                                        </div>
                                        <h3 className="text-white font-medium text-sm line-clamp-1 mb-0.5">{safeDecode(album.name)}</h3>
                                        <p className="text-gray-400 text-xs">Album • {album.year}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Singles Carousel */}
                    {artist.singles && artist.singles.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Singles and EPs</h2>
                            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {artist.singles.map((single) => (
                                    <Link key={single.id} href={`/album/${single.id}`} className="flex-shrink-0 w-[140px] snap-start">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900 shadow-md">
                                            <SongImage
                                                src={single.image?.[2]?.url || single.image?.[0]?.url}
                                                alt={single.name}
                                                fill
                                                className="object-cover"
                                                fallbackSize={60}
                                            />
                                        </div>
                                        <h3 className="text-white font-medium text-sm line-clamp-1 mb-0.5">{safeDecode(single.name)}</h3>
                                        <p className="text-gray-400 text-xs">Single • {single.year}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Featured On */}
                    {artist.featuredPlaylists && artist.featuredPlaylists.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Featured on</h2>
                            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {artist.featuredPlaylists.map((playlist) => (
                                    <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="flex-shrink-0 w-[140px] snap-start">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900 shadow-md">
                                            <SongImage
                                                src={playlist.image?.[2]?.url || playlist.image?.[0]?.url}
                                                alt={playlist.name}
                                                fill
                                                className="object-cover"
                                                fallbackSize={60}
                                            />
                                        </div>
                                        <h3 className="text-white font-medium text-sm line-clamp-1 mb-0.5">{safeDecode(playlist.name)}</h3>
                                        <p className="text-gray-400 text-xs">Playlist</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fans Also Like (Circular) */}
                    {artist.similarArtists && artist.similarArtists.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-4">Fans might also like</h2>
                            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {artist.similarArtists.map((simArtist) => (
                                    <Link key={simArtist.id} href={`/artist/${simArtist.id}`} className="flex-shrink-0 w-[120px] snap-start text-center">
                                        <div className="relative aspect-square rounded-full overflow-hidden mb-2 bg-zinc-900 shadow-md">
                                            <SongImage
                                                src={simArtist.image?.[2]?.url || simArtist.image?.[0]?.url}
                                                alt={simArtist.name}
                                                fill
                                                className="object-cover"
                                                fallbackSize={60}
                                            />
                                        </div>
                                        <h3 className="text-white font-medium text-sm line-clamp-2">{safeDecode(simArtist.name)}</h3>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* About Section */}
                    {artist.bio && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-white mb-2">About</h2>
                            {artist.followerCount && (
                                <p className="text-gray-400 text-sm mb-2">
                                    {(parseInt(artist.followerCount) / 10000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} views
                                </p>
                            )}
                            <p className={`text-gray-400 text-sm leading-relaxed ${!showFullBio && 'line-clamp-4'}`}>
                                {getBioText()}
                            </p>
                            <button
                                onClick={() => setShowFullBio(!showFullBio)}
                                className="text-white text-sm mt-2 flex items-center gap-1 font-medium"
                            >
                                {showFullBio ? (
                                    <>Show less <BiChevronUp size={16} /></>
                                ) : (
                                    <>... <BiChevronDown size={16} /></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop View - YouTube Music Style */}
            <div className="hidden md:block bg-black -m-4 md:-m-8 h-[calc(100vh)] overflow-y-auto scrollbar-hide">
                {/* Hero Section */}
                <div className="relative h-[65vh] w-full">
                    <div className="absolute inset-0">
                        <SongImage
                            src={artist.image?.[2]?.url || artist.image?.[0]?.url}
                            alt={artist.name}
                            fill
                            className="object-cover object-top"
                            priority
                            sizes="100vw"
                            fallbackSize={120}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"></div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-10">
                        <div className="max-w-[1600px] mx-auto">
                            <h1 className="text-7xl font-bold text-white mb-4 drop-shadow-2xl tracking-tight">
                                {safeDecode(artist.name)}
                            </h1>

                            <div className="flex items-center gap-6 mb-8 text-lg font-medium text-gray-200">
                                {artist.followerCount && (
                                    <span>{(parseInt(artist.followerCount) / 10000000).toFixed(1)} crore monthly audience</span>
                                )}
                            </div>

                            <p className="text-gray-300 text-base max-w-3xl line-clamp-2 mb-8 leading-relaxed">
                                {getBioText()}
                                {artist.bio && (
                                    <button onClick={() => setShowFullBio(true)} className="text-white font-semibold ml-2 hover:underline">
                                        MORE
                                    </button>
                                )}
                            </p>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePlayAll}
                                    className="px-8 py-3 rounded-full bg-white text-black font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform"
                                >
                                    <BiPlay size={32} /> Play
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-16">

                    {/* Top Songs */}
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 xl:col-span-12">
                            <h2 className="text-3xl font-bold text-white mb-6">Top songs</h2>
                            <div className="flex flex-col">
                                {artist.topSongs?.slice(0, showAllSongs ? artist.topSongs.length : 5).map((song, index) => (
                                    <div
                                        key={song.id}
                                        onClick={() => handlePlaySong(song)}
                                        className="flex items-center gap-6 p-3 rounded-md hover:bg-white/10 cursor-pointer group transition-colors border-b border-transparent hover:border-white/5"
                                    >
                                        <span className="text-gray-400 w-6 text-center font-medium group-hover:hidden">{index + 1}</span>
                                        <BiPlay size={24} className="hidden group-hover:block w-6 text-white" />

                                        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                                            <SongImage
                                                src={song.image?.[1]?.url || song.image?.[0]?.url}
                                                alt={song.name}
                                                fill
                                                className="object-cover"
                                                fallbackSize={24}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-base line-clamp-1">{safeDecode(song.name)}</h3>
                                            <p className="text-gray-400 text-sm line-clamp-1">{artist.name}</p>
                                        </div>

                                        <div className="w-[200px] text-gray-400 text-sm hidden lg:block line-clamp-1">
                                            {safeDecode(song.album?.name || '')}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <HiOutlineHeart size={20} className="text-white" />
                                            </button>
                                            <span className="text-gray-400 text-sm font-medium w-12 text-right">{song.duration || '0:00'}</span>
                                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <BiDotsVerticalRounded size={20} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {artist.topSongs && artist.topSongs.length > 5 && (
                                    <div className="mt-4 px-4">
                                        <button
                                            onClick={() => setShowAllSongs(!showAllSongs)}
                                            className="text-gray-400 font-bold text-sm hover:text-white uppercase tracking-wider"
                                        >
                                            {showAllSongs ? 'Show Less' : 'Show All'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Albums */}
                    {artist.topAlbums && artist.topAlbums.length > 0 && (
                        <div className="relative group/section">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">Albums</h2>
                                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => scroll(albumsRef, 'left')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronLeft size={24} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => scroll(albumsRef, 'right')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronRight size={24} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={albumsRef}
                                className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                            >
                                {artist.topAlbums.map((album) => (
                                    <Link key={album.id} href={`/album/${album.id}`} className="min-w-[200px] w-[200px] snap-start group">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-900 shadow-lg">
                                            <SongImage
                                                src={album.image?.[2]?.url || album.image?.[0]?.url}
                                                alt={album.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                fallbackSize={80}
                                            />
                                        </div>
                                        <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">{safeDecode(album.name)}</h3>
                                        <p className="text-gray-400 text-sm">Album • {album.year}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Singles */}
                    {artist.singles && artist.singles.length > 0 && (
                        <div className="relative group/section">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">Singles & EPs</h2>
                                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => scroll(singlesRef, 'left')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronLeft size={24} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => scroll(singlesRef, 'right')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronRight size={24} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={singlesRef}
                                className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                            >
                                {artist.singles.map((single) => (
                                    <Link key={single.id} href={`/album/${single.id}`} className="min-w-[200px] w-[200px] snap-start group">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-900 shadow-lg">
                                            <SongImage
                                                src={single.image?.[2]?.url || single.image?.[0]?.url}
                                                alt={single.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                fallbackSize={80}
                                            />
                                        </div>
                                        <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">{safeDecode(single.name)}</h3>
                                        <p className="text-gray-400 text-sm">Single • {single.year}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Playlists */}
                    {artist.featuredPlaylists && artist.featuredPlaylists.length > 0 && (
                        <div className="relative group/section">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">Featured Playlists</h2>
                                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => scroll(playlistsRef, 'left')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronLeft size={24} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => scroll(playlistsRef, 'right')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronRight size={24} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={playlistsRef}
                                className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                            >
                                {artist.featuredPlaylists.map((playlist) => (
                                    <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="min-w-[200px] w-[200px] snap-start group">
                                        <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-zinc-900 shadow-lg">
                                            <SongImage
                                                src={playlist.image?.[2]?.url || playlist.image?.[0]?.url}
                                                alt={playlist.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                fallbackSize={80}
                                            />
                                        </div>
                                        <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">{safeDecode(playlist.name)}</h3>
                                        <p className="text-gray-400 text-sm">Playlist</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fans Also Like (Similar Artists) */}
                    {artist.similarArtists && artist.similarArtists.length > 0 && (
                        <div className="relative group/section">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white mb-6">Fans might also like</h2>
                                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => scroll(similarRef, 'left')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronLeft size={24} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => scroll(similarRef, 'right')}
                                        className="p-2 rounded-full border border-gray-600 hover:bg-white/10 hover:border-white transition-colors"
                                    >
                                        <BiChevronRight size={24} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={similarRef}
                                className="flex gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                            >
                                {artist.similarArtists.map((simArtist) => (
                                    <Link key={simArtist.id} href={`/artist/${simArtist.id}`} className="min-w-[180px] w-[180px] snap-start group text-center">
                                        <div className="relative aspect-square rounded-full overflow-hidden mb-4 bg-zinc-900 shadow-lg mx-auto w-full">
                                            <SongImage
                                                src={simArtist.image?.[2]?.url || simArtist.image?.[0]?.url}
                                                alt={simArtist.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                fallbackSize={80}
                                            />
                                        </div>
                                        <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:underline decoration-white/50">{safeDecode(simArtist.name)}</h3>
                                        <p className="text-gray-400 text-sm">Artist</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Full Bio Overlay */}
                {showFullBio && artist.bio && (
                    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 transition-opacity duration-300">
                        <div className="bg-zinc-900 p-8 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto relative shadow-2xl border border-zinc-800">
                            <button
                                onClick={() => setShowFullBio(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-white/20 transition-colors"
                            >
                                <BiChevronDown size={32} className="text-white" />
                            </button>
                            <h2 className="text-4xl font-bold text-white mb-6">About {artist.name}</h2>
                            <p className="text-gray-200 text-lg leading-loose whitespace-pre-wrap">
                                {getBioText()}
                            </p>
                            {artist.followerCount && (
                                <div className="mt-8 pt-8 border-t border-zinc-800">
                                    <p className="text-3xl font-bold text-white">
                                        {(parseInt(artist.followerCount) / 10000000).toFixed(2)} Crore
                                    </p>
                                    <p className="text-gray-400">Monthly Viewers</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
