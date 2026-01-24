import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { uid, playlistIds } = body;

        if (!uid || !playlistIds || !Array.isArray(playlistIds)) {
            return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
        }

        const user = await User.findOne({ uid });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Delete playlists from Playlist Collection
        // Ensure user owns them
        await Playlist.deleteMany({
            _id: { $in: playlistIds },
            owner: user._id
        });

        // Remove from User's playlists array
        user.playlists = user.playlists.filter((p: any) => !playlistIds.includes(p.toString()) && !playlistIds.includes(p._id?.toString()));
        await user.save();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting playlists:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
