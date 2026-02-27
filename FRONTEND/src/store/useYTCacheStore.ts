import { create } from 'zustand';

interface YTCacheState {
    quickPicks: any[];
    albumsForYou: any[];
    longListening: any[];
    featuredPlaylists: any[];
    trendingCharts: any[];
    // Per-section loading flags for progressive rendering
    qpReady: boolean;
    afyReady: boolean;
    llReady: boolean;
    fpReady: boolean;
    chartsReady: boolean;
    isPrefetching: boolean;
    hasPrefetched: boolean;
    prefetchAll: () => Promise<void>;
}

export const useYTCacheStore = create<YTCacheState>((set, get) => ({
    quickPicks: [],
    albumsForYou: [],
    longListening: [],
    featuredPlaylists: [],
    trendingCharts: [],
    qpReady: false,
    afyReady: false,
    llReady: false,
    fpReady: false,
    chartsReady: false,
    isPrefetching: false,
    hasPrefetched: false,

    prefetchAll: async () => {
        const state = get();
        if (state.hasPrefetched || state.isPrefetching) return;

        set({ isPrefetching: true });

        const apiUrl = process.env.NEXT_PUBLIC_YT_API_URL || 'http://localhost:8000';

        const fetchJSON = (url: string) =>
            fetch(url).then(res => res.json()).catch(() => ({ data: [] }));

        // ── Helper: dedup by key ──────────────────────────────
        const dedup = (arr: any[], key: string) =>
            Array.from(new Map(arr.map((i: any) => [i[key], i])).values());

        // ── 1. Quick Picks — 2 searches (was 5) ─────────────
        const fetchQP = async () => {
            const [r1, r2] = await Promise.all([
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Bollywood Top Songs 2025')}&filter=songs&limit=20`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Trending Hindi Songs')}&filter=songs&limit=20`),
            ]);
            const all = [...(r1.data || []), ...(r2.data || [])];
            const unique = dedup(all.filter((s: any) => s.videoId), 'videoId');
            const picks = unique.sort(() => 0.5 - Math.random()).slice(0, 16);
            set({ quickPicks: picks, qpReady: true });
        };

        // ── 2. Albums For You — 2 searches (was 5) ───────────
        const fetchAFY = async () => {
            const [r1, r2] = await Promise.all([
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Bollywood Latest Albums 2025')}&filter=albums&limit=20`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Popular Hindi Albums')}&filter=albums&limit=20`),
            ]);
            const all = [...(r1.data || []), ...(r2.data || [])];
            const unique = dedup(all.filter((a: any) => a.browseId), 'browseId');
            set({ albumsForYou: unique.sort(() => 0.5 - Math.random()).slice(0, 15), afyReady: true });
        };

        // ── 3. Long Listening — 2 searches (was 4) ───────────
        const fetchLL = async () => {
            const [r1, r2] = await Promise.all([
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Bollywood Nonstop Jukebox 2025')}&filter=videos&limit=20`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Hindi Mashup Lofi Long')}&filter=videos&limit=20`),
            ]);
            const all = [...(r1.data || []), ...(r2.data || [])];
            const unique = dedup(all.filter((v: any) => v.videoId), 'videoId');
            // Filter longer than 3 min
            const long = unique.filter((item: any) => {
                if (!item.duration) return false;
                const parts = item.duration.split(':').map(Number);
                const secs = parts.length === 3
                    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                    : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
                return secs > 180;
            });
            set({ longListening: long.sort(() => 0.5 - Math.random()).slice(0, 16), llReady: true });
        };

        // ── 4. Featured Playlists — 1 broader search (was 7) ─
        const fetchFP = async () => {
            const [r1, r2] = await Promise.all([
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Top Hindi Music Playlists')}&filter=playlists&limit=20`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Bollywood Party Workout Playlist')}&filter=playlists&limit=20`),
            ]);
            const all = [...(r1.data || []), ...(r2.data || [])];
            const unique = dedup(all.filter((p: any) => p.browseId), 'browseId');
            set({ featuredPlaylists: unique.sort(() => 0.5 - Math.random()).slice(0, 10), fpReady: true });
        };

        // ── 5. Trending Charts — 1 call ──────────────────────
        const fetchCharts = async () => {
            const res = await fetchJSON(`${apiUrl}/charts?country=IN`);
            const songs = (res?.data?.songs || []).slice(0, 20).map((t: any) => ({
                videoId: t.videoId,
                title: t.title,
                thumbnails: t.thumbnails || [],
                artists: t.artists || [],
                album: t.album || null,
                duration: t.duration || '',
            }));
            set({ trendingCharts: songs, chartsReady: true });
        };

        try {
            // All 5 sections fire completely in parallel
            // Each updates store independently as it resolves → progressive rendering
            await Promise.all([
                fetchQP(),
                fetchAFY(),
                fetchLL(),
                fetchFP(),
                fetchCharts(),
            ]);
        } catch (error) {
            console.error('YT prefetch error:', error);
        } finally {
            set({ isPrefetching: false, hasPrefetched: true });
        }
    }
}));
