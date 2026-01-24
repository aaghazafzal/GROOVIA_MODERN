'use client';

import { useAuthStore } from '@/store/useAuthStore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BiUser, BiLogOut, BiPlus, BiHeart, BiMusic, BiPencil, BiTrash, BiX, BiCheck, BiCog } from 'react-icons/bi';
import { useState, useEffect } from 'react';
import SettingsModal from '@/components/library/SettingsModal';

export default function LibraryPage() {
    const { user, logout, userData, syncUser, removePlaylists } = useAuthStore();
    const router = useRouter();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [playlists, setPlaylists] = useState<any[]>([]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

    // Fetch user playlists on mount or user change
    useEffect(() => {
        if (user && userData?.playlists) {
            if (Array.isArray(userData.playlists) && userData.playlists.length > 0) {
                if (typeof userData.playlists[0] === 'string') {
                    // IDs only
                } else {
                    setPlaylists(userData.playlists);
                }
            } else {
                setPlaylists([]);
            }
        }
    }, [user, userData]);

    const handleCreatePlaylist = () => {
        setNewPlaylistName('');
        setShowCreateModal(true);
    };

    const toggleSelection = (id: string) => {
        if (selectedPlaylists.includes(id)) {
            setSelectedPlaylists(prev => prev.filter(pid => pid !== id));
        } else {
            setSelectedPlaylists(prev => [...prev, id]);
        }
    };

    const promptDelete = () => {
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        try {
            const response = await fetch('/api/playlists/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user?.uid,
                    playlistIds: selectedPlaylists
                })
            });

            if (response.ok) {
                // Update Global Store immediately (Ui follows)
                removePlaylists(selectedPlaylists);

                // Update local state (redundant but safe if useEffect lags)
                const updated = playlists.filter(p => !selectedPlaylists.includes(p._id));
                setPlaylists(updated);

                setIsEditMode(false);
                setSelectedPlaylists([]);
                setShowDeleteConfirm(false);
            } else {
                alert('Failed to delete');
                setShowDeleteConfirm(false);
            }
        } catch (error) {
            console.error('Error deleting:', error);
            setShowDeleteConfirm(false);
        }
    };

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        setShowLogoutConfirm(false);
    };

    const submitCreatePlaylist = async () => {
        if (!newPlaylistName.trim() || !user) return;

        try {
            const response = await fetch('/api/playlists/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    name: newPlaylistName,
                    description: `Created by ${user.displayName}`
                })
            });

            if (response.ok) {
                const data = await response.json();
                setPlaylists(prev => [...prev, data.playlist]);
                setShowCreateModal(false);
            } else {
                alert('Failed to create playlist');
            }
        } catch (error) {
            console.error('Error creating playlist', error);
        }
    };

    return (
        <div className="min-h-screen pb-24 relative">
            {/* Settings Icon - Top Right */}
            <button
                onClick={() => {
                    if (!user) {
                        alert("Please login to access settings.");
                        router.push('/login');
                    } else {
                        setShowSettings(true);
                    }
                }}
                className="absolute top-6 right-6 z-20 p-3 bg-zinc-900/80 backdrop-blur-md rounded-full text-gray-300 hover:text-white hover:bg-zinc-800 border border-white/10 transition-all shadow-lg"
            >
                <BiCog size={24} />
            </button>

            {/* Header / Top Section */}
            <div className="flex flex-col items-center justify-center pt-10 pb-10">
                {/* Auth Card */}
                <div className="w-full max-w-sm bg-gradient-to-b from-white/10 to-transparent p-1 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                    <div className="bg-[#121212] rounded-[1.4rem] p-6 flex flex-col items-center text-center">

                        {user ? (
                            // Logged In State
                            <>
                                <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-4 border-purple-600 shadow-lg">
                                    {user.photoURL ? (
                                        <Image
                                            src={user.photoURL}
                                            alt={user.displayName || 'User'}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                                            {(user.displayName || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-1">
                                    {user.displayName || 'Groovia Listener'}
                                </h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    {user.email}
                                </p>

                                <button
                                    onClick={handleLogoutClick}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-full text-sm font-medium transition-colors"
                                >
                                    <BiLogOut size={18} />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            // Logged Out State
                            <>
                                <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 text-purple-400">
                                    <BiUser size={40} />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-2">Login to Groovia</h1>
                                <p className="text-gray-400 text-sm mb-8 max-w-[200px]">
                                    Save your favorite songs, create playlists, and more.
                                </p>
                                <button
                                    onClick={() => router.push('/login')}
                                    className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg active:scale-[0.98]"
                                >
                                    Login / Sign Up
                                </button>
                            </>
                        )}

                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="border-t border-white/10 pt-8">
                    {!user ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <BiUser size={40} className="mb-2" />
                            <p>Log in to view your library and playlists.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Your Library</h2>
                                <div className="flex items-center gap-3">
                                    {isEditMode ? (
                                        <>
                                            <button
                                                onClick={() => { setIsEditMode(false); setSelectedPlaylists([]); }}
                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-full transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            {selectedPlaylists.length > 0 && (
                                                <button
                                                    onClick={promptDelete}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full transition-colors animate-fadeIn"
                                                >
                                                    <BiTrash size={18} />
                                                    Delete ({selectedPlaylists.length})
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setIsEditMode(true)}
                                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                                                title="Edit Playlists"
                                            >
                                                <BiPencil size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleCreatePlaylist()}
                                                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors"
                                            >
                                                <BiPlus size={20} />
                                                Create Playlist
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {/* Liked Songs Card - Not Selectable */}
                                <div
                                    onClick={() => !isEditMode && router.push('/playlist/liked')}
                                    className={`group relative aspect-square bg-gradient-to-br from-purple-800 to-blue-800 rounded-lg p-4 flex flex-col justify-end overflow-hidden ${isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'} transition-all`}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-40 transition-opacity">
                                        <BiHeart size={80} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white relative z-10">Liked Songs</h3>
                                    <p className="text-white/70 text-sm relative z-10">{userData?.likedSongs?.length || 0} songs</p>
                                </div>

                                {/* User Playlists */}
                                {playlists.map((playlist: any) => {
                                    // Determing cover image
                                    const coverImage = playlist.image ||
                                        (playlist.songs?.length > 0
                                            ? (playlist.songs[0].image?.[1]?.url || playlist.songs[0].image?.[0]?.url)
                                            : null);

                                    const isSelected = selectedPlaylists.includes(playlist._id);

                                    return (
                                        <div
                                            key={playlist._id}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    toggleSelection(playlist._id);
                                                } else {
                                                    router.push(`/playlist/${playlist._id}`);
                                                }
                                            }}
                                            className={`group relative p-4 bg-[#181818] rounded-lg transition-all cursor-pointer ${isEditMode ? 'hover:bg-[#222]' : 'hover:bg-[#282828]'}`}
                                        >
                                            <div className="relative aspect-square w-full mb-4 bg-zinc-800 rounded-md shadow-lg overflow-hidden flex items-center justify-center">
                                                {coverImage ? (
                                                    <Image src={coverImage} alt={playlist.name} fill className="object-cover" />
                                                ) : (
                                                    <BiMusic size={40} className="text-gray-500" />
                                                )}

                                                {/* Edit Mode Overlay */}
                                                {isEditMode && (
                                                    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-all`}>
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-white/50 hover:scale-110'}`}>
                                                            {isSelected && <BiCheck size={20} className="text-white" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-white font-bold truncate mb-1">{playlist.name}</h3>
                                            <p className="text-gray-400 text-sm truncate">By {user.displayName}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Playlist Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-4">Create Playlist</h2>
                        <input
                            type="text"
                            placeholder="Playlist Name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitCreatePlaylist}
                                disabled={!newPlaylistName.trim()}
                                className="px-6 py-2 bg-white text-black font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-zinc-900 w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-2">Delete Playlists?</h2>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete {selectedPlaylists.length} playlist{selectedPlaylists.length > 1 ? 's' : ''}?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirm Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-zinc-900 w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-2">Sign Out?</h2>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to sign out of Groovia?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}
