import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SearchResults {
    songs: any[];
    albums: any[];
    artists: any[];
    playlists: any[];
    videos: any[];
    topResult: any | null;
}

type FilterType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists' | 'videos';

interface SearchState {
    query: string;
    selectedFilter: FilterType;
    searchSource: 'groovia' | 'ytmusic';
    results: SearchResults;

    setQuery: (query: string) => void;
    setSelectedFilter: (filter: FilterType) => void;
    setSearchSource: (source: 'groovia' | 'ytmusic') => void;
    setResults: (results: SearchResults) => void;
    resetSearch: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set) => ({
            query: '',
            selectedFilter: 'all',
            searchSource: 'groovia',
            results: {
                songs: [],
                albums: [],
                artists: [],
                playlists: [],
                videos: [],
                topResult: null,
            },
            setQuery: (query) => set({ query }),
            setSelectedFilter: (filter) => set({ selectedFilter: filter }),
            setSearchSource: (source) => set({ searchSource: source }),
            setResults: (results) => set({ results }),
            resetSearch: () => set({
                query: '',
                selectedFilter: 'all',
                searchSource: 'groovia',
                results: { songs: [], albums: [], artists: [], playlists: [], videos: [], topResult: null }
            })
        }),
        {
            name: 'groovia-search-storage',
            storage: createJSONStorage(() => sessionStorage), // Persist until browser close
            skipHydration: true, // We will hydrate manually if needed, or rely on auto. 
            // Actually auto-hydration is fine for Next.js Client Comp.
        }
    )
);
