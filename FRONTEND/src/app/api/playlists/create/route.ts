import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { uid, name, image, description } = body;

        if (!uid || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await User.findOne({ uid });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const newPlaylist = await Playlist.create({
            name,
            description: description || '',
            image,
            owner: user._id,
            songs: []
        });

        // Add to user's playlists
        user.playlists.push(newPlaylist._id);
        await user.save();

        return NextResponse.json({ success: true, playlist: newPlaylist });
    } catch (error: any) {
        console.error('Error creating playlist:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
