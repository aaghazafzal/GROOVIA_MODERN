'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const AuthProvider = () => {
    const initialize = useAuthStore((state) => state.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return null; // Logic only component
};

export default AuthProvider;
