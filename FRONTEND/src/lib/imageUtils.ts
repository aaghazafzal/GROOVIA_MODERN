export const getImageUrl = (image: any, quality: 'low' | 'medium' | 'high' | '500x500' = 'high'): string | null => {
    if (!image) return null;
    if (quality === '500x500') quality = 'high';

    const extractUrl = (item: any): string | null => {
        if (!item) return null;
        if (typeof item === 'string') return item;
        return item.url || item.link || item.src || null;
    };

    if (typeof image === 'string') {
        if (quality === 'high') return image.replace('50x50', '500x500').replace('150x150', '500x500');
        if (quality === 'medium') return image.replace('50x50', '150x150').replace('500x500', '150x150');
        return image;
    }

    if (Array.isArray(image)) {
        if (image.length === 0) return null;

        // ── Detect YT Music format ────────────────────────────────────────────
        // mapYTSong marks all thumbnails as quality:'high' and sorts DESCENDING (largest first)
        // Saavn has quality:'50x50','150x150','500x500' sorted ASCENDING (smallest first)
        const isYTFormat = image.length > 0 && image.every((item: any) => item?.quality === 'high');

        if (isYTFormat) {
            // YT: image[0] = largest (highest quality), image[last] = smallest
            if (quality === 'low') return extractUrl(image[image.length - 1]) || extractUrl(image[0]);
            if (quality === 'medium') return extractUrl(image[Math.max(0, Math.floor(image.length / 2))]) || extractUrl(image[0]);
            return extractUrl(image[0]); // High quality — first = largest
        }

        // ── Saavn format: [50x50, 150x150, 500x500] ──────────────────────────
        if (quality === 'low') return extractUrl(image[0]) || extractUrl(image[1]) || extractUrl(image[image.length - 1]);
        if (quality === 'medium') return extractUrl(image[1]) || extractUrl(image[0]) || extractUrl(image[image.length - 1]);
        // High: try [2] (500x500 for Saavn), then last, then first
        return extractUrl(image[2]) || extractUrl(image[image.length - 1]) || extractUrl(image[1]) || extractUrl(image[0]);
    }

    if (typeof image === 'object') return extractUrl(image);
    return null;
};
