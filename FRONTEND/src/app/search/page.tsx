'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useMusicStore } from '@/store/useMusicStore';
import Image from 'next/image';
import Link from 'next/link';
import he from 'he';
import { BiPlay, BiDotsVerticalRounded, BiSearch, BiX } from 'react-icons/bi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { MdHistory } from 'react-icons/md';

interface SearchResults {
    songs: any[];
    albums: any[];
    artists: any[];
    playlists: any[];
    topResult: any | null;
}

type FilterType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
];

// Helper to validate and get image URL
const getValidImageUrl = (item: any, preferredIdx?: number): string => {
    try {
        const url = preferredIdx !== undefined
            ? item?.image?.[preferredIdx]?.url || item?.image?.[0]?.url
            : item?.image?.[2]?.url || item?.image?.[1]?.url || item?.image?.[0]?.url;

        if (!url || typeof url !== 'string' || url.startsWith('<!doctype') || url.startsWith('<') || url.length < 10) {
            return 'https://via.placeholder.com/300/1a1a1a/ffffff?text=No+Image';
        }
        // Validate URL
        new URL(url);
        return url;
    } catch {
        return 'https://via.placeholder.com/300/1a1a1a/ffffff?text=No+Image';
    }
};

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
    const [results, setResults] = useState<SearchResults>({
        songs: [],
        albums: [],
        artists: [],
        playlists: [],
        topResult: null,
    });
    const [loading, setLoading] = useState(false);
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const playSong = useMusicStore((state) => state.playSong);

    const songsScrollRef = useRef<HTMLDivElement>(null);
    const albumsScrollRef = useRef<HTMLDivElement>(null);
    const artistsScrollRef = useRef<HTMLDivElement>(null);
    const playlistsScrollRef = useRef<HTMLDivElement>(null);

    // Load search history from localStorage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('groovia-search-history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                setSearchHistory(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                console.error('Failed to parse search history:', e);
            }
        }
    }, []);

    // Save search to history
    const saveToHistory = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setSearchHistory((prev) => {
            // Remove duplicate if exists
            const filtered = prev.filter(item => item.toLowerCase() !== searchQuery.toLowerCase());
            // Add to beginning and keep only last 10
            const updated = [searchQuery, ...filtered].slice(0, 10);
            // Save to localStorage
            localStorage.setItem('groovia-search-history', JSON.stringify(updated));
            return updated;
        });
    };

    // Clear all search history
    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('groovia-search-history');
    };

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            if (query.trim()) {
                performSearch();
            } else {
                setResults({ songs: [], albums: [], artists: [], playlists: [], topResult: null });
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query, selectedFilter]);

    // Auto-hide header on scroll (mobile only)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show header when scrolling up or at top
            if (currentScrollY < lastScrollY || currentScrollY < 10) {
                setShowHeader(true);
            }
            // Hide header when scrolling down
            else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowHeader(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const performSearch = async () => {
        try {
            setLoading(true);
            let allResults: SearchResults = { songs: [], albums: [], artists: [], playlists: [], topResult: null };

            // Fetch based on filter
            if (selectedFilter === 'all' || selectedFilter === 'songs') {
                try {
                    const songsRes = await api.get('/search/songs', {
                        params: { query, limit: selectedFilter === 'songs' ? 50 : 16 }
                    });
                    allResults.songs = songsRes.data?.data?.results || [];
                } catch (err) {
                    console.error('Songs search error:', err);
                }
            }

            if (selectedFilter === 'all' || selectedFilter === 'albums') {
                try {
                    const albumsRes = await api.get('/search/albums', {
                        params: { query, limit: selectedFilter === 'albums' ? 50 : 12 }
                    });
                    allResults.albums = albumsRes.data?.data?.results || [];
                } catch (err) {
                    console.error('Albums search error:', err);
                }
            }

            if (selectedFilter === 'all' || selectedFilter === 'artists') {
                try {
                    const artistsRes = await api.get('/search/artists', {
                        params: { query, limit: selectedFilter === 'artists' ? 50 : 12 }
                    });
                    allResults.artists = artistsRes.data?.data?.results || [];
                } catch (err) {
                    console.error('Artists search error:', err);
                }
            }

            if (selectedFilter === 'all' || selectedFilter === 'playlists') {
                try {
                    const playlistsRes = await api.get('/search/playlists', {
                        params: { query, limit: selectedFilter === 'playlists' ? 50 : 12 }
                    });
                    allResults.playlists = playlistsRes.data?.data?.results || [];
                } catch (err) {
                    console.error('Playlists search error:', err);
                }
            }

            // Determine top result from combined results (only in 'all' filter)
            if (selectedFilter === 'all') {
                const queryLower = query.toLowerCase();

                // Check for exact or close matches
                const topSong = allResults.songs.find((s: any) => s.name?.toLowerCase().includes(queryLower));
                const topAlbum = allResults.albums.find((a: any) => a.name?.toLowerCase().includes(queryLower));
                const topArtist = allResults.artists.find((a: any) => a.name?.toLowerCase().includes(queryLower));
                const topPlaylist = allResults.playlists.find((p: any) => p.name?.toLowerCase().includes(queryLower));

                // Priority: Artist > Album > Playlist > Song
                allResults.topResult = topArtist || topAlbum || topPlaylist || topSong || null;
                if (allResults.topResult) {
                    allResults.topResult.type = topArtist ? 'artist' : topAlbum ? 'album' : topPlaylist ? 'playlist' : 'song';
                }
            }

            setResults(allResults);

            // Save to history if we have any results
            const hasAnyResults = allResults.songs.length > 0 || allResults.albums.length > 0 ||
                allResults.artists.length > 0 || allResults.playlists.length > 0;
            if (hasAnyResults) {
                saveToHistory(query.trim());
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = 600;
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const hasResults = results.songs.length > 0 || results.albums.length > 0 ||
        results.artists.length > 0 || results.playlists.length > 0;

    return (
        <div className="min-h-screen pb-32 md:pb-24 bg-sidebar">
            {/* Search Header */}
            <div className={`pt-6 pb-4 md:px-6 bg-sidebar sticky top-0 z-30 -mx-4 px-4 md:mx-0 transition-transform duration-300 md:translate-y-0 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-7xl mx-auto">
                    {/* Search Input */}
                    <div className="relative mb-4 -mx-4 px-4">
                        <BiSearch className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search songs, albums, artists, playlists..."
                            className="w-full bg-zinc-900 text-white pl-14 pr-4 py-4 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                        />
                    </div>

                    {/* Filter Tabs */}
                    {query && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                            {filters.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${selectedFilter === filter.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Results */}
            <div className="md:px-6 pb-6 max-w-7xl mx-auto">
                {!query && (
                    <div className="space-y-6">
                        {/* Search History */}
                        {searchHistory.length > 0 ? (
                            <div className="px-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <MdHistory className="text-purple-500" />
                                        Recent Searches
                                    </h2>
                                    <button
                                        onClick={clearHistory}
                                        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <BiX size={20} />
                                        Clear All
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {searchHistory.map((historyItem, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setQuery(historyItem)}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer group"
                                        >
                                            <BiSearch className="text-gray-400 group-hover:text-purple-400 transition-colors" size={20} />
                                            <span className="flex-1 text-white text-sm">{historyItem}</span>
                                            <IoChevronForward className="text-gray-600 group-hover:text-gray-400 transition-colors" size={16} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <BiSearch size={64} className="mx-auto text-gray-600 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Search Groovia</h2>
                                <p className="text-gray-400">Find your favorite songs, albums, artists, and playlists</p>
                            </div>
                        )}
                    </div>
                )}

                {loading && query && (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-400 mt-4">Searching...</p>
                    </div>
                )}

                {!loading && query && !hasResults && (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-400">No results found for "{query}"</p>
                    </div>
                )}

                {!loading && query && hasResults && (
                    <div className="space-y-8">
                        {/* Top Result - Only in 'All' filter */}
                        {selectedFilter === 'all' && results.topResult && (
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Top Result</h2>
                                <div className="bg-zinc-900/50 rounded-2xl p-6 max-w-md">
                                    {results.topResult.type === 'artist' ? (
                                        <Link href={`/artist/${results.topResult.id}`}>
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 relative bg-zinc-900">
                                                    <Image
                                                        src={getValidImageUrl(results.topResult)}
                                                        alt={results.topResult.name || 'Artist'}
                                                        fill
                                                        className="object-cover"
                                                        sizes="128px"
                                                    />
                                                </div>
                                                <h3 className="text-3xl font-bold text-white mb-2">{he.decode(results.topResult.name || '')}</h3>
                                                <p className="text-gray-400 capitalize">{results.topResult.type}</p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div>
                                            <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 relative bg-zinc-900">
                                                <Image
                                                    src={getValidImageUrl(results.topResult)}
                                                    alt={results.topResult.name || 'Item'}
                                                    fill
                                                    className="object-cover"
                                                    sizes="300px"
                                                />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{he.decode(results.topResult.name || '')}</h3>
                                            <p className="text-gray-400 capitalize">{results.topResult.type}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Songs Section - LastPlayed Style */}
                        {(selectedFilter === 'all' || selectedFilter === 'songs') && results.songs.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">Songs</h2>
                                    {selectedFilter === 'all' && (
                                        <div className="hidden md:flex gap-2">
                                            <button onClick={() => handleScroll(songsScrollRef, 'left')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronBack size={20} />
                                            </button>
                                            <button onClick={() => handleScroll(songsScrollRef, 'right')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronForward size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedFilter === 'all' ? (
                                    <div ref={songsScrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4">
                                        <div className="inline-grid grid-rows-4 grid-flow-col gap-2 auto-cols-[40%] md:auto-cols-[32%]">
                                            {results.songs.slice(0, 16).map((song) => (
                                                <div
                                                    key={song.id}
                                                    onClick={() => playSong({ ...song, type: 'song', url: song.url || '', downloadUrl: song.downloadUrl || [] })}
                                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group h-[68px]"
                                                >
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
                                                        <Image src={getValidImageUrl(song, 1)} alt={song.name || 'Song'} fill className="object-cover" sizes="48px" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <BiPlay size={24} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-white font-medium text-sm line-clamp-1">{he.decode(song.name || '')}</h3>
                                                        <p className="text-gray-400 text-xs line-clamp-1">{song.artists?.primary?.map((a: any) => a.name).join(', ') || 'Unknown'}</p>
                                                    </div>
                                                    <BiDotsVerticalRounded size={18} className="text-gray-400 hover:text-white" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2 px-4">
                                        {results.songs.map((song) => (
                                            <div key={song.id} onClick={() => playSong({ ...song, type: 'song', url: song.url || '', downloadUrl: song.downloadUrl || [] })} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
                                                    <Image src={getValidImageUrl(song, 1)} alt={song.name || 'Song'} fill className="object-cover" sizes="56px" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <BiPlay size={28} className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-semibold text-sm line-clamp-1">{he.decode(song.name || '')}</h3>
                                                    <p className="text-gray-400 text-xs line-clamp-1">{song.artists?.primary?.map((a: any) => a.name).join(', ') || 'Unknown'}</p>
                                                </div>
                                                <BiDotsVerticalRounded size={20} className="text-gray-400 hover:text-white" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Albums Section - YouTube Music Style */}
                        {(selectedFilter === 'all' || selectedFilter === 'albums') && results.albums.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">Albums</h2>
                                    {selectedFilter === 'all' && (
                                        <div className="hidden md:flex gap-2">
                                            <button onClick={() => handleScroll(albumsScrollRef, 'left')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronBack size={20} />
                                            </button>
                                            <button onClick={() => handleScroll(albumsScrollRef, 'right')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronForward size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={selectedFilter === 'all' ? 'overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4' : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1'} ref={selectedFilter === 'all' ? albumsScrollRef : undefined}>
                                    <div className={selectedFilter === 'all' ? 'flex gap-4' : 'contents'}>
                                        {results.albums.map((album) => (
                                            <Link key={album.id} href={`/album/${album.id}`} className={selectedFilter === 'all' ? 'flex-shrink-0 w-[185px] md:w-[200px]' : ''}>
                                                <div className="group cursor-pointer">
                                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-900">
                                                        <Image src={getValidImageUrl(album)} alt={album.name || 'Album'} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                                                    </div>
                                                    <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{he.decode(album.name || '')}</h3>
                                                    <p className="text-gray-400 text-xs line-clamp-1">{album.year || ''} • Album</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Artists Section - Home Page Style */}
                        {(selectedFilter === 'all' || selectedFilter === 'artists') && results.artists.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">Artists</h2>
                                    {selectedFilter === 'all' && (
                                        <div className="hidden md:flex gap-2">
                                            <button onClick={() => handleScroll(artistsScrollRef, 'left')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronBack size={20} />
                                            </button>
                                            <button onClick={() => handleScroll(artistsScrollRef, 'right')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronForward size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={selectedFilter === 'all' ? 'overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4' : 'grid grid-cols-2 md:grid-cols-6 gap-2 px-0.5'} ref={selectedFilter === 'all' ? artistsScrollRef : undefined}>
                                    <div className={selectedFilter === 'all' ? 'flex gap-4' : 'contents'}>
                                        {results.artists.map((artist) => (
                                            <Link key={artist.id} href={`/artist/${artist.id}`} className={selectedFilter === 'all' ? 'flex-shrink-0' : ''}>
                                                <div className="flex flex-col items-center w-[160px] md:w-[160px] group cursor-pointer">
                                                    <div className="relative w-[160px] h-[160px] md:w-[160px] md:h-[160px] rounded-full overflow-hidden mb-3 bg-zinc-900">
                                                        <Image src={getValidImageUrl(artist)} alt={artist.name || 'Artist'} fill className="object-cover" sizes="160px" />
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                            <div className="bg-primary text-white p-2.5 rounded-full shadow-2xl">
                                                                <BiPlay size={24} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-white font-semibold text-sm md:text-base text-center line-clamp-1 mb-1 w-full px-2">{he.decode(artist.name || '')}</h3>
                                                    <p className="text-gray-400 text-xs md:text-sm">Artist</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Playlists Section - TopPlaylists Style */}
                        {(selectedFilter === 'all' || selectedFilter === 'playlists') && results.playlists.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">Playlists</h2>
                                    {selectedFilter === 'all' && (
                                        <div className="hidden md:flex gap-2">
                                            <button onClick={() => handleScroll(playlistsScrollRef, 'left')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronBack size={20} />
                                            </button>
                                            <button onClick={() => handleScroll(playlistsScrollRef, 'right')} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                                                <IoChevronForward size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={selectedFilter === 'all' ? 'overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4' : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 px-1'} ref={selectedFilter === 'all' ? playlistsScrollRef : undefined}>
                                    <div className={selectedFilter === 'all' ? 'flex gap-4' : 'contents'}>
                                        {results.playlists.map((playlist) => (
                                            <Link key={playlist.id} href={`/playlist/${playlist.id}`} className={selectedFilter === 'all' ? 'flex-shrink-0 w-[185px] md:w-[200px]' : ''}>
                                                <div className="group cursor-pointer">
                                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-900">
                                                        <Image src={getValidImageUrl(playlist)} alt={playlist.name || 'Playlist'} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                                                    </div>
                                                    <h3 className="text-white font-semibold text-sm md:text-base line-clamp-2 mb-1">{he.decode(playlist.name || '')}</h3>
                                                    {playlist.description && <p className="text-gray-400 text-xs line-clamp-1">{he.decode(playlist.description)}</p>}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
