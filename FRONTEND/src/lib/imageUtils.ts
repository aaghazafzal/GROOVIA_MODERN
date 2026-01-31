export const getImageUrl = (image: any, quality: 'low' | 'medium' | 'high' = 'high'): string | null => {
    if (!image) return null;

    // Handle string case (legacy data or simple URLs)
    if (typeof image === 'string') return image;

    // Handle array case (standard API response)
    if (Array.isArray(image)) {
        if (image.length === 0) return null;

        // Saavn usually provides sorted sizes: 50x50, 150x150, 500x500

        if (quality === 'low') {
            // Use lowest quality (50x50), adequate for very small icons
            // Fallback to others if 0 is missing
            return image[0]?.url || image[1]?.url || image[image.length - 1]?.url || null;
        }

        if (quality === 'medium') {
            // Use medium quality (150x150), perfect for list items and cards
            // Fallback to 0 or High if 1 is missing. never return null if ANY url exists.
            return image[1]?.url || image[0]?.url || image[image.length - 1]?.url || null;
        }

        // High quality (default)
        // Aim for index 2 (500x500) or highest available
        return image[image.length - 1]?.url || image[2]?.url || image[1]?.url || image[0]?.url || null;
    }

    // Handle single object case
    if (typeof image === 'object' && image.url) return image.url;

    return null;
};
