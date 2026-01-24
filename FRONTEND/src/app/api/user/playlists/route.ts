import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Playlist from '@/models/Playlist'; // Ensure Playlist model is registered

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        const user = await User.findOne({ uid }).populate('playlists');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, playlists: user.playlists || [] });
    } catch (error: any) {
        console.error('Error fetching playlists:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
