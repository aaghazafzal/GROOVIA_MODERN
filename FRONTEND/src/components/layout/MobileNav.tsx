'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BiHomeAlt, BiSearch, BiLibrary, BiCompass, BiUser } from 'react-icons/bi';
import { SiYoutubemusic } from 'react-icons/si';
// import { HiOutlineHeart } from 'react-icons/hi';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';


const MobileNav = () => {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const navItems = [
        { name: 'Home', href: '/', icon: BiHomeAlt },
        { name: 'Discover', href: '/discover', icon: BiCompass },
        { name: 'Search', href: '/search', icon: BiSearch },
        { name: 'Library', href: '/library', icon: BiLibrary },
        { name: 'YT Music', href: '/yt-music', icon: SiYoutubemusic },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 p-2 md:hidden z-50 flex justify-around items-center h-[4.5rem] pb-safe">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={clsx(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform",
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <div className={clsx("p-1 rounded-full transition-colors", isActive && "bg-primary/20")}>
                            <Icon size={24} className={isActive ? "text-primary" : "text-current"} />
                        </div>
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                )
            })}
        </nav>
    );
};

export default MobileNav;
