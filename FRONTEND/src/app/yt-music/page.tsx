'use client';

import QuickPicks from '@/components/yt-music/QuickPicks';
import AlbumsForYou from '@/components/yt-music/AlbumsForYou';
import LongListening from '@/components/yt-music/LongListening';
import FeaturedPlaylists from '@/components/yt-music/FeaturedPlaylists';
import TrendingCharts from '@/components/yt-music/TrendingCharts';
import PopularArtists from '@/components/yt-music/PopularArtists';

export default function YTMusicPage() {
    return (
        <div className="min-h-screen pb-32">
            <QuickPicks />
            <AlbumsForYou />
            <LongListening />
            <FeaturedPlaylists />
            <TrendingCharts />
            <PopularArtists />
        </div>
    );
}
