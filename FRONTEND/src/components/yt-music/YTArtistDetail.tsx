'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMusicStore } from '@/store/useMusicStore';
import he from 'he';
import {
    BiPlay, BiPause, BiShuffle, BiChevronLeft, BiChevronRight,
    BiDotsVerticalRounded, BiUser, BiMusic, BiRadio
} from 'react-icons/bi';
import { IoChevronBack } from 'react-icons/io5';
import { HiOutlineHeart } from 'react-icons/hi';

// ── Helpers ──────────────────────────────────────────────────────────────────
const bestUrl = (thumbs: any[]): string => {
    if (!thumbs?.length) return '';
    return [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || '';
};

const mapYTSong = (s: any, artistName: string) => ({
    id: s.videoId || '',
    name: s.title || '',
    type: 'youtube',
    youtubeId: s.videoId || '',
    url: '',
    image: (s.thumbnails || []).sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
        .map((t: any) => ({ quality: 'high', url: t.url })),
    downloadUrl: [],
    artists: { primary: [{ name: Array.isArray(s.artists) ? s.artists.map((a: any) => a.name).join(', ') : (s.artist || artistName) }] },
    album: { name: s.album?.name || s.album || '' },
    duration: s.duration || '',
});

// ── Img with fallback ─────────────────────────────────────────────────────────
function YTImg({ src, alt, className, fallbackIcon }: {
    src: string; alt: string; className?: string; fallbackIcon?: React.ReactNode;
}) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className={`bg-zinc-800 flex items-center justify-center ${className || ''}`}>
                {fallbackIcon || <BiMusic className="text-gray-600" size={24} />}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setFailed(true)}
            loading="lazy"
        />
    );
}

// ── Section arrow nav ─────────────────────────────────────────────────────────
function SectionNav({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
    return (
        <div className="hidden md:flex gap-2">
            <button onClick={onLeft} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"><BiChevronLeft size={22} /></button>
            <button onClick={onRight} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"><BiChevronRight size={22} /></button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function YTArtistDetail({ data, channelId }: { data: any; channelId: string }) {
    const router = useRouter();
    const playSong = useMusicStore((s) => s.playSong);
    const setQueue = useMusicStore((s) => s.setQueue);
    const currentSong = useMusicStore((s) => s.currentSong);
    const isPlaying = useMusicStore((s) => s.isPlaying);
    const pauseSong = useMusicStore((s) => s.pauseSong);

    const [showBio, setShowBio] = useState(false);
    const [loadingRadio, setLoadingRadio] = useState(false);
    const [showAllSongs, setShowAllSongs] = useState(false);
    const [moreSongs, setMoreSongs] = useState<any[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    const albumsRef = useRef<HTMLDivElement>(null);
    const singlesRef = useRef<HTMLDivElement>(null);
    const videosRef = useRef<HTMLDivElement>(null);
    const relatedRef = useRef<HTMLDivElement>(null);

    const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
        ref.current?.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' });
    };

    // ── Data ──────────────────────────────────────────────────────────────────
    const name = he.decode(data.name || '');
    const bio = data.description || '';
    const subscribers = data.subscribers || '';
    const views = data.views || '';
    const heroThumb = bestUrl(data.thumbnails || []);
    const songs = (data.songs?.results || []).filter((s: any) => s.videoId);
    const albums = data.albums?.results || [];
    const singles = data.singles?.results || [];
    const videos = data.videos?.results || [];
    const related = data.related?.results || [];

    const mappedSongs = songs.map((s: any) => mapYTSong(s, name));
    const isArtistPlaying = currentSong && songs.some((s: any) => s.videoId === currentSong.id) && isPlaying;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handlePlayAll = () => {
        if (mappedSongs.length === 0) return;
        if (isArtistPlaying) { pauseSong(); return; }
        setQueue(mappedSongs);
        playSong(mappedSongs[0]);
    };

    const handleShuffle = () => {
        if (mappedSongs.length === 0) return;
        const shuffled = [...mappedSongs].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        playSong(shuffled[0]);
    };

    const handleRadio = async () => {
        if (!data.radioId) return;
        setLoadingRadio(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_YT_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/playlist?browseId=${data.radioId}&limit=30`);
            const json = await res.json();
            const tracks = (json?.data?.tracks || []).filter((t: any) => t.videoId);
            const radioSongs = tracks.map((t: any) => mapYTSong(t, name));
            if (radioSongs.length > 0) { setQueue(radioSongs); playSong(radioSongs[0]); }
        } catch (e) { console.error('Radio error:', e); }
        setLoadingRadio(false);
    };

    const handlePlayVideo = (v: any) => {
        const song = mapYTSong(v, name);
        setQueue([song]);
        playSong(song);
    };

    const handlePlaySong = (s: any) => {
        const idx = mappedSongs.findIndex((m: any) => m.id === s.videoId);
        setQueue(mappedSongs);
        playSong(mappedSongs[idx] || mappedSongs[0]);
    };

    // ── Show More Songs — lazy fetch (get_artist only returns 5) ──────────────
    const handleShowMore = async () => {
        if (showAllSongs) { setShowAllSongs(false); return; }
        if (moreSongs.length > 0) { setShowAllSongs(true); return; }
        setLoadingMore(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_YT_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/search?query=${encodeURIComponent(name + ' songs')}&filter=songs&limit=15`);
            const json = await res.json();
            const extra = (json?.data || []).filter((t: any) => t.videoId && !songs.some((s: any) => s.videoId === t.videoId)).map((s: any) => mapYTSong(s, name));
            setMoreSongs(extra.slice(0, 10));
        } catch (e) { console.error(e); }
        setShowAllSongs(true);
        setLoadingMore(false);
    };

    const allDisplaySongs = showAllSongs ? [...mappedSongs, ...moreSongs] : mappedSongs;

    // ────────────────────────────────────────────────────────────────────────
    // MOBILE LAYOUT
    // ────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ─── MOBILE ─── */}
            <div className="md:hidden min-h-screen bg-black pb-32 -m-4">
                {/* Back button */}
                <div className="fixed top-0 left-0 z-20 p-4">
                    <button onClick={() => router.back()} className="p-2 bg-black/50 rounded-full backdrop-blur-md">
                        <IoChevronBack size={26} className="text-white" />
                    </button>
                </div>

                {/* Hero */}
                <div className="relative w-full aspect-[4/3]">
                    <YTImg src={heroThumb} alt={name} className="w-full h-full object-cover object-top" fallbackIcon={<BiUser className="text-gray-500" size={64} />} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 px-4 pb-4">
                        <h1 className="text-3xl font-bold text-white drop-shadow mb-1">{name}</h1>
                        <div className="flex gap-3 text-gray-300 text-xs font-medium">
                            {subscribers && <span>{subscribers} subscribers</span>}
                            {views && <span>· {views}</span>}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={handlePlayAll}
                        className="flex-1 py-3 rounded-full bg-white text-black font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        {isArtistPlaying ? <BiPause size={28} /> : <BiPlay size={28} className="ml-1" />}
                        <span className="uppercase tracking-wide">{isArtistPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                        onClick={handleShuffle}
                        className="p-3.5 rounded-full border border-zinc-700 text-white active:bg-white/10 transition-colors"
                    >
                        <BiShuffle size={22} />
                    </button>
                    {data.radioId && (
                        <button
                            onClick={handleRadio}
                            disabled={loadingRadio}
                            className="p-3.5 rounded-full border border-zinc-700 text-white active:bg-white/10 transition-colors"
                        >
                            {loadingRadio ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <BiRadio size={22} />}
                        </button>
                    )}
                </div>

                <div className="px-4 pb-2 space-y-8">

                    {/* Top Songs */}
                    {mappedSongs.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-white mb-3">Top Songs</h2>
                            <div className="space-y-1">
                                {allDisplaySongs.map((song: any, i: number) => (
                                    <div key={song.id} onClick={() => {
                                        const origIdx = songs.findIndex((s: any) => s.videoId === song.id);
                                        if (origIdx >= 0) handlePlaySong(songs[origIdx]);
                                        else { setQueue(allDisplaySongs); playSong(song); }
                                    }} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-xl active:bg-white/5 transition-colors cursor-pointer">
                                        <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
                                            <YTImg src={bestUrl(song.image?.map((t: any) => ({ url: t.url, width: 200 })))} alt={song.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-medium text-sm line-clamp-1 ${currentSong?.id === song.id ? 'text-purple-400' : 'text-white'}`}>{he.decode(song.name)}</h3>
                                            <p className="text-gray-500 text-xs truncate">{song.artists?.primary?.[0]?.name}</p>
                                        </div>
                                        <button className="text-gray-600 p-1" onClick={(e) => e.stopPropagation()}><BiDotsVerticalRounded size={20} /></button>
                                    </div>
                                ))}
                                {mappedSongs.length > 0 && (
                                    <button
                                        onClick={handleShowMore}
                                        disabled={loadingMore}
                                        className="w-full py-2.5 text-center text-sm text-white font-bold uppercase tracking-wider border border-zinc-800 rounded-full mt-2 hover:bg-zinc-900 transition-colors disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Loading...' : showAllSongs ? 'Show Less' : 'Show More'}
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Videos */}
                    {videos.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-white mb-3">Videos</h2>
                            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {videos.map((v: any, i: number) => (
                                    <div key={v.videoId || i} onClick={() => handlePlayVideo(v)} className="flex-shrink-0 w-52 snap-start cursor-pointer group">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-2">
                                            <YTImg src={bestUrl(v.thumbnails || [])} alt={v.title || ''} className="w-full h-full object-cover group-active:scale-105 transition-transform" fallbackIcon={<BiMusic size={32} className="text-gray-600" />} />
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
                                                <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><BiPlay size={22} className="text-white ml-0.5" /></div>
                                            </div>
                                        </div>
                                        <h3 className="text-white text-xs font-medium line-clamp-2">{he.decode(v.title || '')}</h3>
                                        {v.views && <p className="text-gray-500 text-[10px] mt-0.5">{v.views}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Albums */}
                    {albums.length > 0 && <HScrollSection title="Albums" items={albums} onItemClick={(a) => router.push(`/album/${a.browseId}`)} labelKey="year" labelPrefix="Album" />}

                    {/* Singles */}
                    {singles.length > 0 && <HScrollSection title="Singles & EPs" items={singles} onItemClick={(s) => router.push(`/album/${s.browseId}`)} labelKey="year" labelPrefix="Single" />}

                    {/* Related Artists */}
                    {related.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold text-white mb-3">Fans Might Also Like</h2>
                            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                                {related.map((r: any, i: number) => (
                                    <div key={r.browseId || i} onClick={() => router.push(`/artist/${r.browseId}`)} className="flex-shrink-0 w-28 snap-start text-center cursor-pointer group">
                                        <div className="relative w-28 h-28 rounded-full overflow-hidden bg-zinc-800 mx-auto mb-2 ring-2 ring-transparent group-active:ring-purple-500/50 transition-all">
                                            <YTImg src={bestUrl(r.thumbnails || [])} alt={r.title || ''} className="w-full h-full object-cover" fallbackIcon={<BiUser size={32} className="text-gray-600" />} />
                                        </div>
                                        <h3 className="text-white text-xs font-medium line-clamp-2">{he.decode(r.title || '')}</h3>
                                        {r.subscribers && <p className="text-gray-500 text-[10px] mt-0.5">{r.subscribers}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Bio */}
                    {bio && (
                        <section>
                            <h2 className="text-xl font-bold text-white mb-2">About</h2>
                            <p className={`text-gray-400 text-sm leading-relaxed ${!showBio ? 'line-clamp-4' : ''}`}>{bio}</p>
                            <button onClick={() => setShowBio(!showBio)} className="text-white text-xs mt-2 flex items-center gap-1 font-medium">
                                {showBio ? 'Show less ▲' : '... Show more ▼'}
                            </button>
                        </section>
                    )}
                </div>
            </div>

            {/* ─── DESKTOP ─── */}
            <div className="hidden md:block bg-black -m-8 h-[calc(100vh)] overflow-y-auto scrollbar-hide">
                {/* Hero */}
                <div className="relative h-[65vh] w-full">
                    <div className="absolute inset-0">
                        <YTImg src={heroThumb} alt={name} className="w-full h-full object-cover object-top" fallbackIcon={<div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-zinc-900 flex items-center justify-center"><BiUser size={120} className="text-gray-600" /></div>} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-10">
                        <div className="max-w-[1600px] mx-auto">
                            <h1 className="text-6xl xl:text-8xl font-black text-white mb-3 drop-shadow-2xl tracking-tight">{name}</h1>
                            <div className="flex items-center gap-4 mb-6 text-gray-200 text-base font-medium">
                                {subscribers && <span>{subscribers} subscribers</span>}
                                {views && <span className="text-gray-400">· {views}</span>}
                            </div>
                            {bio && <p className="text-gray-300 text-sm max-w-2xl line-clamp-2 mb-8 leading-relaxed">{bio}</p>}
                            <div className="flex items-center gap-4">
                                <button onClick={handlePlayAll} className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform">
                                    {isArtistPlaying ? <BiPause size={28} /> : <BiPlay size={28} />}
                                    {isArtistPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={handleShuffle} className="p-3.5 rounded-full border border-zinc-600 hover:border-white text-white hover:bg-white/10 transition-all" title="Shuffle">
                                    <BiShuffle size={24} />
                                </button>
                                {data.radioId && (
                                    <button onClick={handleRadio} disabled={loadingRadio} className="flex items-center gap-2 px-5 py-3 rounded-full border border-zinc-600 hover:border-white text-white hover:bg-white/10 transition-all text-sm font-medium" title="Artist Radio">
                                        {loadingRadio
                                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <BiRadio size={22} />}
                                        Radio
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-14">

                    {/* Top Songs */}
                    {mappedSongs.length > 0 && (
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-6">Top Songs</h2>
                            <div className="flex flex-col">
                                {allDisplaySongs.map((song: any, i: number) => (
                                    <div key={song.id} onClick={() => {
                                        const origIdx = songs.findIndex((s: any) => s.videoId === song.id);
                                        if (origIdx >= 0) handlePlaySong(songs[origIdx]);
                                        else { setQueue(allDisplaySongs); playSong(song); }
                                    }} className="flex items-center gap-5 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors">
                                        <span className="text-gray-500 w-5 text-center text-sm group-hover:hidden">{i + 1}</span>
                                        <BiPlay size={20} className="hidden group-hover:block text-white w-5" />
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                            <YTImg src={song.image?.[0]?.url || ''} alt={song.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-semibold text-base line-clamp-1 ${currentSong?.id === song.id ? 'text-purple-400' : 'text-white'}`}>{he.decode(song.name)}</h3>
                                            <p className="text-gray-400 text-sm">{song.artists?.primary?.[0]?.name}</p>
                                        </div>
                                        <div className="hidden lg:block text-gray-500 text-sm w-48 line-clamp-1">{song.album?.name}</div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2" onClick={(e) => e.stopPropagation()}><HiOutlineHeart size={18} className="text-white" /></button>
                                            <span className="text-gray-400 text-sm w-10 text-right">{song.duration}</span>
                                            <button onClick={(e) => e.stopPropagation()} className="p-2"><BiDotsVerticalRounded size={18} className="text-white" /></button>
                                        </div>
                                    </div>
                                ))}
                                {mappedSongs.length > 0 && (
                                    <button
                                        onClick={handleShowMore}
                                        disabled={loadingMore}
                                        className="mt-4 px-4 text-gray-400 hover:text-white text-sm font-bold uppercase tracking-wider text-left disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Loading...' : showAllSongs ? 'Show Less' : 'Show More'}
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Videos — Unique YT Music section */}
                    {videos.length > 0 && (
                        <section className="group/section relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">Videos</h2>
                                <SectionNav onLeft={() => scroll(videosRef, 'left')} onRight={() => scroll(videosRef, 'right')} />
                            </div>
                            <div ref={videosRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
                                {videos.map((v: any, i: number) => (
                                    <div key={v.videoId || i} onClick={() => handlePlayVideo(v)} className="flex-shrink-0 w-72 cursor-pointer group">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-3 shadow-lg">
                                            <YTImg src={bestUrl(v.thumbnails || [])} alt={v.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" fallbackIcon={<BiMusic size={40} className="text-gray-600" />} />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                                                    <BiPlay size={30} className="text-white ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">{he.decode(v.title || '')}</h3>
                                        {v.views && <p className="text-gray-500 text-xs mt-1">{v.views} views</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Albums */}
                    {albums.length > 0 && (
                        <HScrollSectionDesktop ref={albumsRef} title="Albums" items={albums} onItemClick={(a) => router.push(`/album/${a.browseId}`)} labelKey="year" labelPrefix="Album" />
                    )}

                    {/* Singles */}
                    {singles.length > 0 && (
                        <HScrollSectionDesktop ref={singlesRef} title="Singles & EPs" items={singles} onItemClick={(s) => router.push(`/album/${s.browseId}`)} labelKey="year" labelPrefix="Single" />
                    )}

                    {/* Related Artists */}
                    {related.length > 0 && (
                        <section className="relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">Fans Might Also Like</h2>
                                <SectionNav onLeft={() => scroll(relatedRef, 'left')} onRight={() => scroll(relatedRef, 'right')} />
                            </div>
                            <div ref={relatedRef} className="flex gap-8 overflow-x-auto scrollbar-hide pb-4">
                                {related.map((r: any, i: number) => (
                                    <div key={r.browseId || i} onClick={() => router.push(`/artist/${r.browseId}`)} className="flex-shrink-0 w-44 text-center cursor-pointer group">
                                        <div className="relative w-44 h-44 rounded-full overflow-hidden bg-zinc-800 mx-auto mb-3 ring-2 ring-transparent group-hover:ring-purple-500/60 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                            <YTImg src={bestUrl(r.thumbnails || [])} alt={r.title || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" fallbackIcon={<BiUser size={48} className="text-gray-600" />} />
                                        </div>
                                        <h3 className="text-white font-bold text-base line-clamp-1 mb-1 group-hover:text-purple-300 transition-colors">{he.decode(r.title || '')}</h3>
                                        {r.subscribers && <p className="text-gray-500 text-sm">{r.subscribers}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Bio */}
                    {bio && (
                        <section>
                            <h2 className="text-3xl font-bold text-white mb-4">About</h2>
                            <p className={`text-gray-400 text-base leading-loose max-w-4xl ${!showBio ? 'line-clamp-4' : ''}`}>{bio}</p>
                            <button onClick={() => setShowBio(!showBio)} className="text-white text-sm mt-2 font-semibold hover:text-purple-300 transition-colors">
                                {showBio ? 'Show less ▲' : '... Show more ▼'}
                            </button>
                        </section>
                    )}

                </div>
            </div>
        </>
    );
}

// ── Shared subcomponents ──────────────────────────────────────────────────────

function HScrollSection({ title, items, onItemClick, labelKey, labelPrefix }: {
    title: string; items: any[]; onItemClick: (item: any) => void; labelKey?: string; labelPrefix?: string;
}) {
    return (
        <section>
            <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {items.map((item: any, i: number) => (
                    <div key={item.browseId || i} onClick={() => onItemClick(item)} className="flex-shrink-0 w-36 snap-start cursor-pointer group">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2 shadow-md">
                            <YTImg src={bestUrl(item.thumbnails || [])} alt={item.title || ''} className="w-full h-full object-cover group-active:scale-105 transition-transform" fallbackIcon={<BiMusic size={28} className="text-gray-600" />} />
                        </div>
                        <h3 className="text-white font-medium text-xs line-clamp-2 mb-0.5">{he.decode(item.title || '')}</h3>
                        {item[labelKey || 'year'] && <p className="text-gray-500 text-[10px]">{labelPrefix} · {item[labelKey || 'year']}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}

import { forwardRef } from 'react';
const HScrollSectionDesktop = forwardRef<HTMLDivElement, {
    title: string; items: any[]; onItemClick: (item: any) => void; labelKey?: string; labelPrefix?: string;
}>(function HScrollSectionDesktop({ title, items, onItemClick, labelKey, labelPrefix }, ref) {
    // Internal ref for scrolling (forward ref used for parent access)
    const innerRef = ref as React.RefObject<HTMLDivElement>;
    const scrollSection = (dir: 'left' | 'right') => {
        innerRef?.current?.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' });
    };
    return (
        <section className="relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">{title}</h2>
                <SectionNav onLeft={() => scrollSection('left')} onRight={() => scrollSection('right')} />
            </div>
            <div ref={ref} className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
                {items.map((item: any, i: number) => (
                    <div key={item.browseId || i} onClick={() => onItemClick(item)} className="flex-shrink-0 w-48 snap-start cursor-pointer group">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-3 shadow-lg">
                            <YTImg src={bestUrl(item.thumbnails || [])} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" fallbackIcon={<BiMusic size={36} className="text-gray-600" />} />
                        </div>
                        <h3 className="text-white font-bold text-sm line-clamp-1 mb-1 group-hover:underline decoration-white/40">{he.decode(item.title || '')}</h3>
                        {item[labelKey || 'year'] && <p className="text-gray-400 text-xs">{labelPrefix} · {item[labelKey || 'year']}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
});
