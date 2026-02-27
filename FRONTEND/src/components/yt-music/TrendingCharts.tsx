'use client';

import { useRef } from 'react';
import { BiPlay, BiDotsVerticalRounded, BiMusic } from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi2';
import he from 'he';

import { useMusicStore } from '@/store/useMusicStore';
import { useYTCacheStore } from '@/store/useYTCacheStore';

// Rank glow colors — top 3 premium, rest subtle
const RANK_COLORS = [
    { ring: '#a855f7', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]', text: 'from-purple-400 to-pink-400', badge: 'bg-purple-500' },
    { ring: '#818cf8', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.35)]', text: 'from-indigo-400 to-purple-400', badge: 'bg-indigo-500' },
    { ring: '#6366f1', glow: 'shadow-[0_0_14px_rgba(99,102,241,0.3)]', text: 'from-violet-400 to-indigo-400', badge: 'bg-violet-600' },
];

const TrendingCharts = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const songs = useYTCacheStore((state) => state.trendingCharts);
    const chartsReady = useYTCacheStore((state) => state.chartsReady);
    const loading = !chartsReady;

    const playSong = useMusicStore((state) => state.playSong);
    const setQueue = useMusicStore((state) => state.setQueue);

    const handlePlay = (song: any) => {
        const songObj = {
            id: song.videoId,
            name: song.title,
            type: 'youtube',
            youtubeId: song.videoId,
            url: '',
            image: song.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [],
            artists: { primary: song.artists?.map((a: any) => ({ name: a.name })) || [] },
            duration: song.duration,
            album: { name: song.album?.name || 'YouTube Music' },
        };
        setQueue(songs.map((s: any) => ({
            id: s.videoId, name: s.title, type: 'youtube', youtubeId: s.videoId, url: '',
            image: s.thumbnails?.map((t: any) => ({ quality: 'high', url: t.url })) || [],
            downloadUrl: [], artists: { primary: s.artists?.map((a: any) => ({ name: a.name })) || [] },
            duration: s.duration, album: { name: s.album?.name || 'YouTube Music' },
        })));
        playSong(songObj);
    };

    const handleImageError = (e: any) => {
        const img = e.target;
        const parent = img.parentElement;
        if (parent) {
            const fallback = parent.querySelector('.fallback-icon') as HTMLElement;
            if (fallback) { img.style.display = 'none'; fallback.style.display = 'flex'; }
        }
    };

    if (loading) return <SkeletonLoader />;
    if (songs.length === 0) return null;

    const topThree = songs.slice(0, 3);
    const restSongs = songs.slice(3);

    return (
        <div className="relative py-6 md:py-10 md:px-8 overflow-hidden">

            {/* Background ambient glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-3xl" />
            </div>

            {/* ─── Header ─── */}
            <div className="flex items-end justify-between mb-6 md:mb-8 relative">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <HiSparkles className="text-purple-400" size={14} />
                        <span className="text-purple-400 text-xs uppercase tracking-widest font-bold">India · Daily Top Charts</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                        Trending Pulse
                    </h2>
                </div>
                {/* Live pulse indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                    </span>
                    <span className="text-purple-300 text-xs font-semibold">LIVE</span>
                </div>
            </div>

            {/* ─── DESKTOP: Podium Top 3 + List ─── */}
            <div className="hidden md:block">

                {/* Top 3 — Podium Hero Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {topThree.map((song, idx) => {
                        const color = RANK_COLORS[idx];
                        const thumb = song.thumbnails?.[song.thumbnails.length - 1]?.url || song.thumbnails?.[0]?.url;
                        return (
                            <div
                                key={song.videoId}
                                onClick={() => handlePlay(song)}
                                className={`relative group cursor-pointer rounded-2xl overflow-hidden bg-zinc-900/80 border border-white/5 transition-all duration-300 hover:scale-[1.02] ${color.glow}`}
                                style={{ borderColor: `${color.ring}30` }}
                            >
                                {/* Thumbnail */}
                                <div className="relative w-full aspect-square">
                                    {thumb ? (
                                        <img src={thumb} alt={song.title} className="w-full h-full object-cover" onError={handleImageError} />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <BiMusic className="text-gray-600" size={48} />
                                        </div>
                                    )}
                                    {/* Dark gradient overlay for bottom text */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                    {/* HUGE Rank number in bg */}
                                    <div
                                        className={`absolute top-2 left-3 font-black text-[80px] leading-none bg-gradient-to-b ${color.text} bg-clip-text text-transparent opacity-80 select-none`}
                                        style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)' }}
                                    >
                                        {idx + 1}
                                    </div>

                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                            <BiPlay className="text-white ml-1" size={32} />
                                        </div>
                                    </div>
                                </div>

                                {/* Song Info */}
                                <div className="p-4">
                                    <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-purple-300 transition-colors">
                                        {he.decode(song.title || '')}
                                    </h3>
                                    <p className="text-gray-400 text-sm truncate mt-0.5">
                                        {song.artists?.map((a: any) => a.name).join(', ') || '—'}
                                    </p>
                                    {/* Rank badge */}
                                    <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white ${color.badge}`}>
                                        <span>#{idx + 1}</span>
                                        <span className="opacity-70">India Charts</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Ranks 4–20 — Compact list */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {restSongs.map((song, idx) => {
                        const rank = idx + 4;
                        const thumb = song.thumbnails?.[0]?.url;
                        return (
                            <div
                                key={song.videoId}
                                onClick={() => handlePlay(song)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group overflow-hidden"
                            >
                                {/* Rank number */}
                                <span className="text-gray-600 font-black text-lg w-7 text-center flex-shrink-0 tabular-nums group-hover:text-purple-400 transition-colors">
                                    {rank}
                                </span>

                                {/* Thumbnail */}
                                <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                    {thumb ? (
                                        <img src={thumb} alt={song.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={handleImageError} />
                                    ) : (
                                        <div className="fallback-icon w-full h-full flex items-center justify-center">
                                            <BiMusic className="text-gray-600" size={18} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <BiPlay className="text-white" size={20} />
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-300 transition-colors">
                                        {he.decode(song.title || '')}
                                    </h3>
                                    <p className="text-gray-500 text-xs truncate">
                                        {song.artists?.map((a: any) => a.name).join(', ') || '—'}
                                    </p>
                                </div>

                                <button
                                    className="text-gray-600 hover:text-white p-1. opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <BiDotsVerticalRounded size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── MOBILE: Numbered list with rank bar ─── */}
            <div className="md:hidden">
                <div className="space-y-0">
                    {songs.map((song, idx) => {
                        const rank = idx + 1;
                        const isTop3 = rank <= 3;
                        const color = isTop3 ? RANK_COLORS[idx] : null;
                        const thumb = song.thumbnails?.[0]?.url;

                        return (
                            <div
                                key={song.videoId}
                                onClick={() => handlePlay(song)}
                                className="flex items-center gap-3 px-1 py-2.5 rounded-xl active:bg-white/5 transition-all cursor-pointer group overflow-hidden"
                            >
                                {/* Rank */}
                                <div className="w-8 flex-shrink-0 text-center">
                                    {isTop3 ? (
                                        <span
                                            className={`font-black text-xl bg-gradient-to-b ${color!.text} bg-clip-text text-transparent`}
                                        >
                                            {rank}
                                        </span>
                                    ) : (
                                        <span className="font-bold text-base text-gray-600 tabular-nums">
                                            {rank}
                                        </span>
                                    )}
                                </div>

                                {/* Thumbnail with glow for top 3 */}
                                <div
                                    className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 ${isTop3 ? color!.glow : ''}`}
                                    style={isTop3 ? { boxShadow: `0 0 16px ${color!.ring}50` } : {}}
                                >
                                    {thumb ? (
                                        <img src={thumb} alt={song.title} className="w-full h-full object-cover" onError={handleImageError} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BiMusic className="text-gray-600" size={22} />
                                        </div>
                                    )}
                                    {/* Top 3 crown border */}
                                    {isTop3 && (
                                        <div
                                            className="absolute inset-0 rounded-xl"
                                            style={{ boxShadow: `inset 0 0 0 1.5px ${color!.ring}80` }}
                                        />
                                    )}
                                </div>

                                {/* Meta */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <h3 className={`font-semibold text-sm truncate ${isTop3 ? 'text-white' : 'text-gray-200'}`}>
                                        {he.decode(song.title || '')}
                                    </h3>
                                    <p className="text-gray-500 text-xs truncate mt-0.5">
                                        {song.artists?.map((a: any) => a.name).join(', ') || '—'}
                                    </p>
                                </div>

                                <button
                                    className="text-gray-600 flex-shrink-0 p-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <BiDotsVerticalRounded size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ─── Skeleton ─── */
const SkeletonLoader = () => (
    <div className="py-6 md:py-10 md:px-8">
        {/* Header skeleton */}
        <div className="h-4 w-40 bg-white/5 rounded mb-2 animate-pulse" />
        <div className="h-8 md:h-10 w-56 bg-white/10 rounded mb-6 md:mb-8 animate-pulse" />

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-2">
                    <div className="w-8 h-6 bg-white/5 rounded animate-pulse" />
                    <div className="w-14 h-14 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop skeleton */}
        <div className="hidden md:block">
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-zinc-900 animate-pulse">
                        <div className="aspect-square bg-white/5" />
                        <div className="p-4 space-y-2">
                            <div className="h-5 bg-white/5 rounded w-3/4" />
                            <div className="h-4 bg-white/5 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5">
                        <div className="w-7 h-5 bg-white/5 rounded animate-pulse" />
                        <div className="w-11 h-11 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default TrendingCharts;
