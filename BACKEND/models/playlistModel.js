import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    songs: [{
        songId: String,
        title: String,
        artist: String,
        image: String,
        duration: String,
        url: String, // Store preview or stream URL if needed
        addedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

const Playlist = mongoose.model('Playlist', playlistSchema);
export default Playlist;
