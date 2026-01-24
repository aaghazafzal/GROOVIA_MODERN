import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
        }

        const playlist = await Playlist.findById(id).populate('songs');

        if (!playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, playlist });
    } catch (error: any) {
        console.error('Error fetching local playlist:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
