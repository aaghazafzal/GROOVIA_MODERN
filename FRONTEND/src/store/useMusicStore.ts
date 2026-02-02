import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface Song {
    id: string;
    name: string;
    type: string;
    url?: string;
    image: { quality: string; url: string }[];
    downloadUrl?: { quality: string; url: string }[];
    artists: {
        primary: { name: string }[];
    };
    duration?: string;
    album?: {
        name: string;
    };
    file?: File; // For local files
    youtubeId?: string; // For YouTube Embed
}

interface MusicState {
    currentSong: Song | null;
    isPlaying: boolean;
    queue: Song[];
    currentIndex: number;
    lastPlayed: Song[];
    history: Song[];

    playSong: (song: Song) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    setQueue: (songs: Song[]) => void;
    playNext: (auto?: boolean) => Promise<void>;
    playPrevious: () => void;
    addToLastPlayed: (song: Song) => void;
    isShuffle: boolean;
    repeatMode: 'off' | 'all' | 'one';
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    currentTime: number;
    duration: number;
    seekTime: number | null;
    setCurrentTime: (time: number) => void;
    setDuration: (time: number) => void;
    seekTo: (time: number) => void;
}

// Helper function to get playable URL
const getAudioUrl = (song: Song): string => {
    // Check for local file first
    // Strictly check if it is a valid Blob/File to avoid 'Overload resolution failed'
    if (song.file && ((song.file as any) instanceof Blob || (song.file as any) instanceof File)) {
        return URL.createObjectURL(song.file);
    }

    // Priority: downloadUrl > url
    if (song.downloadUrl && song.downloadUrl.length > 0) {
        // Get Medium quality (160kbps) by default for faster loading
        const playUrl = song.downloadUrl.find(d => d.quality === '160kbps') ||
            song.downloadUrl.find(d => d.quality === '320kbps') ||
            song.downloadUrl[0];
        return playUrl.url;
    }
    return song.url || '';
};

export const useMusicStore = create<MusicState>()(
    persist(
        (set, get) => ({
            currentSong: null,
            isPlaying: false,
            queue: [],
            currentIndex: -1,
            lastPlayed: [],
            history: [],
            isShuffle: false,
            repeatMode: 'off',
            currentTime: 0,
            duration: 0,
            seekTime: null,

            setCurrentTime: (time: number) => set({ currentTime: time }),
            setDuration: (time: number) => set({ duration: time }),
            seekTo: (time: number) => set({ seekTime: time }),

            playSong: (song) => {
                const { queue, currentSong, history } = get();
                const audioUrl = getAudioUrl(song);
                const songWithUrl = { ...song, url: audioUrl };

                // Add current song to history if checking against new song
                let newHistory = history;
                if (currentSong && currentSong.id !== song.id) {
                    newHistory = [...history, currentSong];
                }

                // Find song index in queue
                const index = queue.findIndex(s => s.id === song.id);

                if (index === -1) {
                    // Song not in queue (e.g., clicked from Search/Top Songs)
                    // Reset queue to this song to enable proper "Next" logic via Autoplay
                    set({
                        currentSong: songWithUrl,
                        isPlaying: true,
                        queue: [songWithUrl],
                        currentIndex: 0,
                        seekTime: 0,
                        history: newHistory
                    });
                } else {
                    set({
                        currentSong: songWithUrl,
                        isPlaying: true,
                        currentIndex: index,
                        seekTime: 0,
                        history: newHistory
                    });
                }
                get().addToLastPlayed(songWithUrl);
            },

            pauseSong: () => set({ isPlaying: false }),
            resumeSong: () => set({ isPlaying: true }),

            setQueue: (songs) => {
                const { currentSong } = get();
                let newIndex = -1;

                // If there's a current song, find its position in new queue
                if (currentSong) {
                    newIndex = songs.findIndex(s => s.id === currentSong.id);
                }

                set({
                    queue: songs,
                    currentIndex: newIndex
                });
            },

            addToLastPlayed: (song) => {
                // Don't add local songs to last played
                if (song.type === 'local' || song.file) {
                    return;
                }
                const { lastPlayed } = get();
                const filtered = lastPlayed.filter((s) => s.id !== song.id);
                set({ lastPlayed: [song, ...filtered].slice(0, 24) });
            },

            playNext: async (auto = false) => {
                const { queue, currentIndex, isShuffle, repeatMode, currentSong, history } = get();

                if (queue.length === 0 && !currentSong) return;

                let nextIndex = currentIndex + 1;

                // Handle Auto-Advance (Song Ended) logic for Repeat One
                if (auto && repeatMode === 'one') {
                    nextIndex = currentIndex;
                }
                // Handle Shuffle
                else if (isShuffle) {
                    // Avoid playing same song if possible
                    if (queue.length > 1) {
                        let rand;
                        do {
                            rand = Math.floor(Math.random() * queue.length);
                        } while (rand === currentIndex);
                        nextIndex = rand;
                    } else {
                        nextIndex = 0;
                    }
                }
                // Handle Normal Sequential
                else {
                    if (nextIndex >= queue.length) {
                        // End of queue
                        if (repeatMode === 'off') {
                            // Suggestion / Infinite Scroll Logic
                            if (currentSong) {
                                try {
                                    let suggestions: any[] = [];
                                    if (currentSong.youtubeId) {
                                        try {
                                            const res = await fetch(`${process.env.NEXT_PUBLIC_YT_API_URL || 'http://localhost:8000'}/watch?videoId=${currentSong.youtubeId}`);
                                            const data = await res.json();
                                            const tracks = data.data?.tracks || [];
                                            suggestions = tracks.map((t: any) => ({
                                                id: t.videoId,
                                                name: t.title,
                                                type: 'youtube',
                                                artists: { primary: t.artists ? t.artists.map((a: any) => ({ name: a.name })) : [{ name: 'Unknown' }] },
                                                image: t.thumbnail ? t.thumbnail.map((thumb: any) => ({ quality: 'high', url: thumb.url })) : [],
                                                youtubeId: t.videoId
                                            }));
                                        } catch (e) {
                                            console.error("YT Autoplay error", e);
                                        }
                                    } else {
                                        const res = await api.get(`/songs/${currentSong.id}/suggestions`);
                                        suggestions = res.data?.data || [];
                                    }

                                    if (suggestions.length > 0) {
                                        // 1. Filter out songs that are already in history (last 20) or in the upcoming queue
                                        const { history } = get();
                                        const recentHistoryIds = new Set(history.slice(-20).map(s => s.id));
                                        const queueIds = new Set(queue.map(s => s.id));
                                        // Also add current song to avoid immediate loop
                                        if (currentSong) recentHistoryIds.add(currentSong.id);

                                        let candidates = suggestions.filter((s: any) => !recentHistoryIds.has(s.id) && !queueIds.has(s.id));

                                        // 2. Fallback: If strict filtering leaves no candidates, loosen it (allow history, just avoid queue)
                                        if (candidates.length === 0) {
                                            candidates = suggestions.filter((s: any) => !queueIds.has(s.id));
                                        }

                                        // 3. Final Fallback: Just take from suggestions
                                        if (candidates.length === 0) {
                                            candidates = suggestions;
                                        }

                                        // 4. Selection Strategy: Prefer 2nd item to add variety/break "Best Match" loops
                                        // but only if it's a strong match (available in candidates)
                                        let nextRelated;
                                        if (candidates.length >= 2) {
                                            // Taking 2nd item (index 1) often breaks A<->B similarity loops
                                            nextRelated = candidates[1];
                                        } else {
                                            nextRelated = candidates[0];
                                        }

                                        const newQueue = [...queue, nextRelated];
                                        set({ queue: newQueue });

                                        // Now we can play the next index
                                        const nextSong = newQueue[nextIndex];
                                        if (nextSong) {
                                            const audioUrl = getAudioUrl(nextSong);
                                            const songWithUrl = { ...nextSong, url: audioUrl };

                                            const newHistory = currentSong ? [...history, currentSong] : history;

                                            set({
                                                currentSong: songWithUrl,
                                                currentIndex: nextIndex,
                                                isPlaying: true,
                                                seekTime: 0,
                                                history: newHistory
                                            });
                                            get().addToLastPlayed(songWithUrl);
                                            return;
                                        }
                                    }
                                } catch (e) {
                                    console.error("Failed to auto-fetch suggestions", e);
                                }
                            }

                            // If auto and no suggestions, stop
                            if (auto) {
                                set({ isPlaying: false });
                                return;
                            }
                            // Loop back to start if manual next and no suggestions found
                            nextIndex = 0;
                        } else {
                            // Repeat All
                            nextIndex = 0;
                        }
                    }
                }

                if (queue.length > 0) {
                    const nextSong = queue[nextIndex];
                    const audioUrl = getAudioUrl(nextSong);
                    const songWithUrl = { ...nextSong, url: audioUrl };

                    const newHistory = currentSong ? [...history, currentSong] : history;

                    set({
                        currentSong: songWithUrl,
                        currentIndex: nextIndex,
                        isPlaying: true,
                        seekTime: 0,
                        history: newHistory
                    });
                    get().addToLastPlayed(songWithUrl);
                }
            },

            playPrevious: () => {
                const { queue, currentIndex, isShuffle, history } = get();

                // 1. Priority: History (The "Back" button behavior)
                if (history.length > 0) {
                    const prevSong = history[history.length - 1]; // Get last
                    const newHistory = history.slice(0, -1); // Remove last

                    const audioUrl = getAudioUrl(prevSong);
                    const songWithUrl = { ...prevSong, url: audioUrl };

                    // Sync Index if in current queue
                    const idx = queue.findIndex(s => s.id === prevSong.id);

                    set({
                        currentSong: songWithUrl,
                        currentIndex: idx !== -1 ? idx : -1, // -1 means orphaned song
                        isPlaying: true,
                        seekTime: 0,
                        history: newHistory
                    });
                    get().addToLastPlayed(songWithUrl);
                    return;
                }

                if (queue.length === 0) return;

                // 2. Fallback: Queue Navigation
                let prevIndex = currentIndex - 1;

                if (prevIndex < 0) {
                    prevIndex = queue.length - 1;
                }

                const prevSong = queue[prevIndex];
                const audioUrl = getAudioUrl(prevSong);
                const songWithUrl = { ...prevSong, url: audioUrl };

                // Note: We don't push current to history on Prev (it's a Back action)

                set({
                    currentSong: songWithUrl,
                    currentIndex: prevIndex,
                    isPlaying: true,
                    seekTime: 0
                });
                get().addToLastPlayed(songWithUrl);
            },

            toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

            toggleRepeat: () => set((state) => {
                const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
                const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
                return { repeatMode: modes[nextIndex] };
            }),
        }),
        {
            name: 'groovia-music-storage',
            partialize: (state) => ({
                lastPlayed: state.lastPlayed.filter(s => s.type !== 'local' && !s.file),
                isShuffle: state.isShuffle,
                repeatMode: state.repeatMode,
                history: state.history.slice(-50), // Persist last 50 songs of history
            }),
        }
    )
);
