import { create } from 'zustand';

export interface LocalSong {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    file: File;
    artwork?: string;
    folderPath?: string;
}

export interface FolderInfo {
    path: string;
    songCount: number;
}

interface LibraryState {
    songs: LocalSong[];
    folders: FolderInfo[];
    isLoaded: boolean;

    setSongs: (songs: LocalSong[]) => void;
    addSongs: (newSongs: LocalSong[]) => void;
    setFolders: (folders: FolderInfo[]) => void;
    setIsLoaded: (loaded: boolean) => void;
    resetLibrary: () => void;
    removeFolder: (folderPath: string) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
    songs: [],
    folders: [],
    isLoaded: false,

    setSongs: (songs) => set({ songs, isLoaded: true }),

    addSongs: (newSongs) => set((state) => ({
        songs: [...state.songs, ...newSongs],
        isLoaded: true
    })),

    setFolders: (folders) => set({ folders }),

    setIsLoaded: (loaded) => set({ isLoaded: loaded }),

    resetLibrary: () => set({ songs: [], folders: [], isLoaded: false }),

    removeFolder: (folderPath) => set((state) => ({
        folders: state.folders.filter(f => f.path !== folderPath),
        songs: state.songs.filter(s => s.folderPath !== folderPath)
    }))
}));
