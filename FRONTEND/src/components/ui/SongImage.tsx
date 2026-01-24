'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BiMusic } from 'react-icons/bi';

interface SongImageProps {
    src?: string | null;
    alt: string;
    fill?: boolean;
    className?: string; // Should include rounded classes
    width?: number;
    height?: number;
    sizes?: string;
    priority?: boolean;
    fallbackSize?: number;
}

export default function SongImage({
    src,
    alt,
    fill,
    className = '',
    width,
    height,
    sizes,
    priority,
    fallbackSize = 40
}: SongImageProps) {
    const [error, setError] = useState(false);
    // Reset error when src changes
    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        return (
            <div
                className={`bg-zinc-800 flex items-center justify-center text-gray-500 ${className}`}
                style={(!fill && width && height) ? { width, height } : { width: '100%', height: '100%' }}
            >
                <BiMusic size={fallbackSize} />
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill={fill}
            width={width}
            height={height}
            className={className}
            sizes={sizes}
            priority={priority}
            onError={() => setError(true)}
        />
    );
}
