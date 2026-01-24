import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { uid, playlistId, songIds } = body;

        if (!uid || !playlistId || !songIds || !Array.isArray(songIds)) {
            return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
        }

        const user = await User.findOne({ uid });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Remove songs from the playlist owned by the user
        const result = await Playlist.updateOne(
            { _id: playlistId, owner: user._id },
            { $pull: { songs: { id: { $in: songIds } } } }
        );

        if (result.modifiedCount === 0) {
            // Might be unauthorized or playlist not found or no songs changed
            // We can check if playlist exists
            const exists = await Playlist.findOne({ _id: playlistId, owner: user._id });
            if (!exists) {
                return NextResponse.json({ error: 'Playlist not found or access denied' }, { status: 403 });
            }
        }

        // Return updated playlist to help frontend sync? Or just success
        // Fetching updated might be nice
        const updatedPlaylist = await Playlist.findById(playlistId);

        return NextResponse.json({ success: true, playlist: updatedPlaylist });

    } catch (error: any) {
        console.error('Error removing songs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
