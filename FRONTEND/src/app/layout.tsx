import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import MiniPlayer from '@/components/player/MiniPlayer';
import AuthProvider from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Groovia - Modern Music Streaming',
  description: 'Listen to your favorite music in high quality.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-sidebar text-foreground overflow-hidden h-screen flex flex-col md:flex-row">
        <AuthProvider />
        {/* Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto md:ml-64 relative pb-20 md:pb-24 scroll-smooth bg-sidebar">
          <div className="relative z-10 p-4 md:p-8 min-h-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Mini Player */}
        <MiniPlayer />
      </body>
    </html>
  );
}
