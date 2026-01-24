import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch source: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(response.body, {
            headers: {
                'Content-Type': contentType,
            },
        });
    } catch (error) {
        console.error('Proxy download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
