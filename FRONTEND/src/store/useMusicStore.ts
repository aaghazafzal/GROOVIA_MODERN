import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

interface MusicState {
    currentSong: Song | null;
    isPlaying: boolean;
    queue: Song[];
    currentIndex: number;
    lastPlayed: Song[];

    playSong: (song: Song) => void;
    pauseSong: () => void;
    resumeSong: () => void;
    setQueue: (songs: Song[]) => void;
    playNext: (auto?: boolean) => void;
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
            isShuffle: false,
            repeatMode: 'off',
            currentTime: 0,
            duration: 0,
            seekTime: null,

            setCurrentTime: (time: number) => set({ currentTime: time }),
            setDuration: (time: number) => set({ duration: time }),
            seekTo: (time: number) => set({ seekTime: time }),

            playSong: (song) => {
                const { queue } = get();
                const audioUrl = getAudioUrl(song);
                const songWithUrl = { ...song, url: audioUrl };

                // Find song index in queue
                const index = queue.findIndex(s => s.id === song.id);

                set({
                    currentSong: songWithUrl,
                    isPlaying: true,
                    currentIndex: index >= 0 ? index : get().currentIndex,
                    seekTime: 0
                });
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

            playNext: (auto = false) => {
                const { queue, currentIndex, isShuffle, repeatMode } = get();

                if (queue.length === 0) return;

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
                        if (repeatMode === 'off' && auto) {
                            // Stop playback if requested
                            set({ isPlaying: false });
                            return;
                        }
                        // Loop back to start (Repeat All or Manual Next)
                        nextIndex = 0;
                    }
                }

                const nextSong = queue[nextIndex];
                const audioUrl = getAudioUrl(nextSong);
                const songWithUrl = { ...nextSong, url: audioUrl };

                set({
                    currentSong: songWithUrl,
                    currentIndex: nextIndex,
                    isPlaying: true,
                    seekTime: 0
                });
                get().addToLastPlayed(songWithUrl);
            },

            playPrevious: () => {
                const { queue, currentIndex, isShuffle } = get();

                if (queue.length === 0) return;

                // If shuffle is on, Previous behavior is debated, but often people expect History. 
                // We don't have play history stack yet (except lastPlayed which is for UI).
                // For simplicity, Previous in Shuffle -> Go to random or previous index?
                // Standard behavior: Previous goes to previous index in list, ignoring shuffle, OR relies on history.
                // Let's stick to simple index decrement for now, unless user asks for history.

                let prevIndex = currentIndex - 1;

                if (prevIndex < 0) {
                    prevIndex = queue.length - 1;
                }

                const prevSong = queue[prevIndex];
                const audioUrl = getAudioUrl(prevSong);
                const songWithUrl = { ...prevSong, url: audioUrl };

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
                repeatMode: state.repeatMode
            }),
        }
    )
);
