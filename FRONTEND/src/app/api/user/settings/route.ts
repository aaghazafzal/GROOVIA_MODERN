import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { uid, settings } = await req.json();

        if (!uid || !settings) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const user = await User.findOneAndUpdate(
            { uid },
            { $set: { settings } },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, settings: user.settings });

    } catch (error: any) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
