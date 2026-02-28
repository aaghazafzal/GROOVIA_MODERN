import { create } from 'zustand';

interface YTCacheState {
    quickPicks: any[];
    albumsForYou: any[];
    longListening: any[];
    featuredPlaylists: any[];
    trendingCharts: any[];
    featuredArtists: any[];
    // Per-section loading flags for progressive rendering
    qpReady: boolean;
    afyReady: boolean;
    llReady: boolean;
    fpReady: boolean;
    chartsReady: boolean;
    artistsReady: boolean;
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
    featuredArtists: [],
    qpReady: false,
    afyReady: false,
    llReady: false,
    fpReady: false,
    chartsReady: false,
    artistsReady: false,
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

        // ── 5. Trending Charts — robust with fallback ────────
        const fetchCharts = async () => {
            const res = await fetchJSON(`${apiUrl}/charts?country=IN`);
            let songs = (res?.data?.songs || []).filter((t: any) => t?.videoId);

            // If backend returned empty songs, use search as fallback
            if (songs.length === 0) {
                const fallback = await fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('India Top Hindi Songs 2025')}&filter=songs&limit=20`);
                songs = (fallback?.data || []).filter((t: any) => t?.videoId);
            }

            const mapped = songs.slice(0, 20).map((t: any) => ({
                videoId: t.videoId,
                title: t.title || t.name || '',
                thumbnails: t.thumbnails || [],
                artists: t.artists || [],
                album: t.album || null,
                duration: t.duration || '',
            }));
            set({ trendingCharts: mapped, chartsReady: true });
        };


        // ── 6. Featured Artists — 3 searches, daily fresh ───
        const fetchArtists = async () => {
            const [r1, r2, r3] = await Promise.all([
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Bollywood Top Singers 2025')}&filter=artists&limit=15`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Popular Hindi Music Artists')}&filter=artists&limit=15`),
                fetchJSON(`${apiUrl}/search?query=${encodeURIComponent('Top Indian Music Artists')}&filter=artists&limit=10`),
            ]);
            const all = [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
            const unique = dedup(all.filter((a: any) => a.browseId && a.thumbnails?.length), 'browseId');
            set({ featuredArtists: unique.sort(() => 0.5 - Math.random()).slice(0, 28), artistsReady: true });
        };

        try {
            await Promise.all([
                fetchQP(),
                fetchAFY(),
                fetchLL(),
                fetchFP(),
                fetchCharts(),
                fetchArtists(),
            ]);
        } catch (error) {
            console.error('YT prefetch error:', error);
        } finally {
            set({ isPrefetching: false, hasPrefetched: true });
        }
    }
}));
