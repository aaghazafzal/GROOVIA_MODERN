import { create } from 'zustand';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { api } from '@/lib/api';

interface AuthState {
    user: FirebaseUser | null;
    userData: any | null; // MongoDB user data
    loading: boolean;
    initialize: () => void;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    syncUser: (user: FirebaseUser) => Promise<void>;
    toggleLike: (song: any) => Promise<void>;
    addPlaylist: (playlist: any) => void;
    removePlaylists: (playlistIds: string[]) => void;
    updateSettings: (settings: { streamQuality: string; downloadQuality: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    userData: null,
    loading: true,

    initialize: () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                set({ user, loading: true });
                await get().syncUser(user);
            } else {
                set({ user: null, userData: null, loading: false });
            }
        });
    },

    signInWithGoogle: async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Error signing in with Google', error);
            throw error;
        }
    },

    signInWithEmail: async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Error signing in with email', error);
            throw error;
        }
    },

    signUpWithEmail: async (email, password, name) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                // Force sync update with new name
                await get().syncUser({ ...userCredential.user, displayName: name });
            }
        } catch (error) {
            console.error('Error signing up', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            set({ user: null, userData: null });
        } catch (error) {
            console.error('Error signing out', error);
        }
    },

    syncUser: async (user: FirebaseUser) => {
        try {
            // Call our API to sync Mongo
            // We use POST to create or get
            const response = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL
                }),
            });

            if (response.ok) {
                const data = await response.json();
                set({ userData: data.user, loading: false });
            } else {
                const errorText = await response.text();
                console.error(`Failed to sync user data: ${response.status} ${response.statusText}`, errorText);
                set({ loading: false });
            }
        } catch (error) {
            console.error('Error syncing user:', error);
            set({ loading: false });
        }
    },

    toggleLike: async (song: any) => {
        const currentUser = get().user;
        const currentUserData = get().userData;

        if (!currentUser || !currentUserData) return;

        // Optimistic Update
        const isLiked = currentUserData.likedSongs.some((s: any) => s.id === song.id);
        const updatedLikedSongs = isLiked
            ? currentUserData.likedSongs.filter((s: any) => s.id !== song.id)
            : [song, ...currentUserData.likedSongs];

        set({ userData: { ...currentUserData, likedSongs: updatedLikedSongs } });

        try {
            const response = await fetch('/api/user/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid, song })
            });

            if (!response.ok) {
                // Revert on failure
                set({ userData: currentUserData });
                const errorText = await response.text();
                console.error(`Failed to toggle like: ${response.status} ${response.statusText}`, errorText);
            } else {
                // Determine if we need to update state from server response (for consistency)
                const data = await response.json();
                if (data.success && data.likedSongs) {
                    set({ userData: { ...currentUserData, likedSongs: data.likedSongs } });
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            set({ userData: currentUserData });
        }
    },

    addPlaylist: (playlist: any) => {
        const currentUserData = get().userData;
        if (!currentUserData) return;

        // Optimistic update
        const updatedPlaylists = currentUserData.playlists ? [...currentUserData.playlists, playlist] : [playlist];
        set({ userData: { ...currentUserData, playlists: updatedPlaylists } });
    },

    removePlaylists: (playlistIds: string[]) => {
        const currentUserData = get().userData;
        if (!currentUserData || !currentUserData.playlists) return;

        const updatedPlaylists = currentUserData.playlists.filter((p: any) =>
            !playlistIds.includes(p._id) && !playlistIds.includes(p.id)
        );
        set({ userData: { ...currentUserData, playlists: updatedPlaylists } });
    },

    updateSettings: async (settings: { streamQuality: string; downloadQuality: string }) => {
        const currentUserData = get().userData;
        const currentUser = get().user;
        if (!currentUserData || !currentUser) return;

        // Optimistic
        set({ userData: { ...currentUserData, settings } });

        try {
            await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid, settings })
            });
        } catch (e) {
            console.error('Error updating settings:', e);
        }
    }
}));
