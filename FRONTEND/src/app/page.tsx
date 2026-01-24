import SpeedDial from '@/components/home/SpeedDial';
import HeroBanner from '@/components/home/HeroBanner';
import LastPlayed from '@/components/home/LastPlayed';
import NewSongs from '@/components/home/NewSongs';
import TrendingOnSocials from '@/components/home/TrendingOnSocials';
import CommunityPlaylists from '@/components/home/CommunityPlaylists';
import TopArtists from '@/components/home/TopArtists';
import GoldenEraClassics from '@/components/home/GoldenEraClassics';
import ForEveryMood from '@/components/home/ForEveryMood';
import TopPlaylists from '@/components/home/TopPlaylists';
import LoveSongsHindi from '@/components/home/LoveSongsHindi';
import TopAlbums from '@/components/home/TopAlbums';
import Greeting from '@/components/home/Greeting';

export default function Home() {
  return (
    <div className="space-y-4 md:space-y-8 pb-24">
      {/* Greeting Section */}
      <Greeting />

      {/* First Section: Speed Dial (Mobile) / Hero Banner (Desktop) */}
      <SpeedDial />
      <HeroBanner />

      {/* Last Played Section - Shows only if user has played songs */}
      <LastPlayed />

      {/* New Songs Section */}
      <NewSongs />

      {/* Trending On Socials Section */}
      <TrendingOnSocials />

      {/* From the Community Section */}
      <CommunityPlaylists />

      {/* Top Artists Section */}
      <TopArtists />

      {/* Golden Era Classics Section */}
      <GoldenEraClassics />

      {/* For Every Mood Section */}
      <ForEveryMood />

      {/* Top Playlists Section */}
      <TopPlaylists />

      {/* Most Streamed Love Songs - Hindi Section */}
      <LoveSongsHindi />


      {/* Top Albums Section */}
      <TopAlbums />
    </div>
  );
}
