import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Playlist from '@/models/Playlist';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { uid, playlistId, song } = body;

        console.log('Adding to playlist:', { uid, playlistId, songName: song?.name });

        if (!uid || !playlistId || !song) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify User
        const user = await User.findOne({ uid });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify Playlist ownership
        const playlist = await Playlist.findOne({ _id: playlistId, owner: user._id });
        if (!playlist) {
            return NextResponse.json({ error: 'Playlist not found or access denied' }, { status: 404 });
        }

        // Check for duplicates
        if (playlist.songs.some((s: any) => s.id === song.id)) {
            return NextResponse.json({ error: 'Song already in playlist' }, { status: 400 });
        }

        // Format Song for Schema
        const newSong = {
            id: String(song.id),
            name: song.name,
            image: Array.isArray(song.image) ? song.image : [],
            artists: song.artists || { primary: [] },
            duration: String(song.duration || ''),
            downloadUrl: Array.isArray(song.downloadUrl) ? song.downloadUrl : [],
            url: song.url || '',
            type: song.type || 'online'
        };

        // Add Song
        playlist.songs.push(newSong);
        await playlist.save();

        console.log('Song added successfully to playlist:', playlist.name);

        return NextResponse.json({ success: true, playlist });
    } catch (error: any) {
        console.error('Error adding song to playlist:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
