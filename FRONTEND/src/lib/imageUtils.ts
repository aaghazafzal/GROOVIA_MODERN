// ── Upgrade YouTube thumbnail to highest available quality ────────────────────
export const upgradeYTThumb = (url: string): string => {
    if (!url) return url;

    // 1) i.ytimg.com pattern: https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg
    if (url.includes('i.ytimg.com/vi/')) {
        // Try maxresdefault (1280x720) first — best quality
        return url.replace(/\/(default|mqdefault|hqdefault|sddefault|maxresdefault)(\.[^?]*)/, '/maxresdefault$2');
    }

    // 2) lh3.googleusercontent.com pattern: ...=w60-h60-l90-rj
    // The API often returns very small dimensions here. Upscale to 1080x1080
    if (url.includes('lh3.googleusercontent.com') && url.includes('=')) {
        return url.replace(/=w\d+-h\d+/, '=w1080-h1080'); // Upgrade to high resolution
    }

    return url;
};

export const getImageUrl = (image: any, quality: 'low' | 'medium' | 'high' | '500x500' = 'high'): string | null => {
    if (!image) return null;
    if (quality === '500x500') quality = 'high';

    const extractUrl = (item: any): string | null => {
        if (!item) return null;
        if (typeof item === 'string') return item;
        return item.url || item.link || item.src || null;
    };

    const eu = (item: any) => upgradeYTThumb(extractUrl(item) || '') || null;

    if (typeof image === 'string') {
        if (quality === 'high') return upgradeYTThumb(image.replace('50x50', '500x500').replace('150x150', '500x500'));
        if (quality === 'medium') return upgradeYTThumb(image.replace('50x50', '150x150').replace('500x500', '150x150'));
        return upgradeYTThumb(image);
    }

    if (Array.isArray(image)) {
        if (image.length === 0) return null;

        // ── Detect YT Music format ────────────────────────────────────────────
        // mapYTSong marks all thumbnails as quality:'high' and sorts DESCENDING (largest first)
        // Saavn has quality:'50x50','150x150','500x500' sorted ASCENDING (smallest first)
        const isYTFormat = image.length > 0 && image.every((item: any) => item?.quality === 'high');

        if (isYTFormat) {
            if (quality === 'low') return eu(image[image.length - 1]);
            if (quality === 'medium') return eu(image[Math.max(0, Math.floor(image.length / 2))]);
            return eu(image[0]); // High quality — first = largest (maxresdefault after upgrade)
        }

        // ── Saavn format: [50x50, 150x150, 500x500] ──────────────────────────
        if (quality === 'low') return eu(image[0]) || eu(image[image.length - 1]);
        if (quality === 'medium') return eu(image[1]) || eu(image[0]) || eu(image[image.length - 1]);
        return eu(image[2]) || eu(image[image.length - 1]) || eu(image[1]) || eu(image[0]);
    }

    if (typeof image === 'object') return eu(image);
    return null;
};
