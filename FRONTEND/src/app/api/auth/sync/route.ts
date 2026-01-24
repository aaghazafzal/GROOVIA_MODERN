import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Playlist from '@/models/Playlist';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { uid, email, name, photoURL } = body;

        if (!uid || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find existing user or create new one
        let user = await User.findOne({ uid }).populate('playlists');

        if (!user) {
            // Create New
            user = await User.create({
                uid,
                email,
                name,
                photoURL,
                likedSongs: [],
                playlists: []
            });
            console.log('Created new user:', email);
        } else {
            // Update explicitly if needed (e.g. photo/name changed) usually optional
            // user.name = name;
            // user.photoURL = photoURL;
            // await user.save();
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        // Handle IP Whitelist Error specifically
        if (error.name === 'MongooseServerSelectionError') {
            const msg = 'MongoDB Connection Failed. Please add your current IP to MongoDB Atlas Whitelist (Network Access -> Add IP -> Allow Access from Anywhere).';
            console.error(msg);
            return NextResponse.json({ error: msg }, { status: 500 });
        }

        console.error('Error syncing user to DB:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
