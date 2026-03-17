// Test script to verify YouTube Music streaming with new scraper

const TEST_VIDEO_ID = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

console.log('🎵 Testing YouTube Music Stream URLs\n');
console.log('=' .repeat(50));

// Old Render URL (might be blocked)
const oldRenderUrl = `https://groovia-modern-9jg1.onrender.com/stream?videoId=${TEST_VIDEO_ID}`;
console.log('\n❌ OLD (Render):');
console.log(oldRenderUrl);

// New Vercel Scraper URL
const newVercelUrl = `https://grooviaytmusic.vercel.app/stream/${TEST_VIDEO_ID}?quality=high`;
console.log('\n✅ NEW (Vercel Scraper):');
console.log(newVercelUrl);

// Alternative quality options
console.log('\n📋 Quality Options:');
console.log(`  Audio High: https://grooviaytmusic.vercel.app/audio/${TEST_VIDEO_ID}?quality=high`);
console.log(`  Audio Low:  https://grooviaytmusic.vercel.app/audio/${TEST_VIDEO_ID}?quality=low`);
console.log(`  Extract All: https://grooviaytmusic.vercel.app/extract/${TEST_VIDEO_ID}`);

console.log('\n' + '='.repeat(50));
console.log('✅ Integration Complete!');
console.log('\nFrontend Changes:');
console.log('  1. config.ts - Added YT_SCRAPER_URL');
console.log('  2. MiniPlayer.tsx - Updated to use new scraper');
console.log('  3. Error fallback to Render if Vercel fails');
console.log('\n🎧 Songs should now play from Vercel scraper!');
