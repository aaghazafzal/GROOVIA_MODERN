import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { uid, song } = body;

        if (!uid || !song || !song.id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await User.findOne({ uid });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if song is already liked
        const songIndex = user.likedSongs.findIndex((s: any) => s.id === song.id);
        let isLiked = false;

        if (songIndex > -1) {
            // Remove
            user.likedSongs.splice(songIndex, 1);
            isLiked = false;
        } else {
            // Add - Ensure fields match Schema exactly
            const image = Array.isArray(song.image) ? song.image : [];
            const artists = song.artists || { primary: [] };

            user.likedSongs.unshift({
                id: String(song.id), // Ensure String
                name: song.name,
                image: image,
                artists: artists,
                duration: String(song.duration || ''),
                downloadUrl: Array.isArray(song.downloadUrl) ? song.downloadUrl : [],
                url: song.url || '',
                type: song.type || 'online'
            });
            isLiked = true;
        }

        await user.save();

        return NextResponse.json({ success: true, isLiked, likedSongs: user.likedSongs });
    } catch (error: any) {
        console.error('Error toggling like:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
