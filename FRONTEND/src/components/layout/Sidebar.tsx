'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BiHomeAlt, BiSearch, BiLibrary, BiCompass } from 'react-icons/bi';
import { HiOutlineHeart } from 'react-icons/hi';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';
import Image from 'next/image';

const Sidebar = () => {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();

    const navItems = [
        { name: 'Home', href: '/', icon: BiHomeAlt },
        { name: 'Discover', href: '/discover', icon: BiCompass },
        { name: 'Search', href: '/search', icon: BiSearch },
        { name: 'Your Library', href: '/library', icon: BiLibrary },
    ];

    return (
        <aside className="w-64 bg-sidebar h-screen fixed left-0 top-0 hidden md:flex flex-col p-6 border-r border-white/10 z-20">
            <div className="mb-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    {/* Logo Icon Placeholder */}
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    Groovia
                </h1>
            </div>

            <nav className="flex-1">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                        isActive ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_var(--primary)]" />
                                    )}
                                    <Icon size={22} className={clsx("transition-transform group-hover:scale-110", isActive && "text-primary")} />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Groovia AI Badge */}
            <div className="pb-6">
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all duration-500"></div>
                    <p className="text-xs text-gray-400 mb-1 relative z-10">Groovia AI</p>
                    <p className="text-sm font-semibold text-white relative z-10">Smart Playlist Generator</p>
                </div>
            </div>

            {/* User Profile / Login */}
            <div className="border-t border-white/10 pt-6 mt-auto">
                {user ? (
                    <div className="flex items-center gap-3 px-2">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                            {user.photoURL ? (
                                <Image
                                    src={user.photoURL}
                                    alt={user.displayName || 'User'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold bg-purple-600">
                                    {(user.displayName || 'U')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</p>
                            <button onClick={() => logout()} className="text-xs text-red-400 hover:text-red-300">
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Login
                    </Link>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
