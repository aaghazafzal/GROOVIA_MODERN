'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';

export default function Greeting() {
    const { user, userData } = useAuthStore();
    const [greeting, setGreeting] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) setGreeting('Good Morning');
            else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
            else if (hour >= 17 && hour < 22) setGreeting('Good Evening');
            else setGreeting('Good Night');
        };
        updateGreeting();
    }, []);

    if (!mounted) return <div className="h-20" />; // Placeholder to prevent jump

    // Get First Name if possible
    const displayName = userData?.name || user?.displayName || 'User';
    // User might like full name or first name. "Aakash" implies first name in example.
    const firstName = displayName.split(' ')[0];

    return (
        <div className="px-4 md:px-8 pt-8 pb-2 animate-fadeIn">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                {greeting}
                <span className="block md:inline md:ml-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm">
                    {firstName}
                </span>
            </h1>
        </div>
    );
}
