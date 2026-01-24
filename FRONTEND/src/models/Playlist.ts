import mongoose, { Schema, model, models } from 'mongoose';

const SongSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    image: [{
        quality: String,
        url: String
    }],
    artists: {
        primary: [{ name: String }]
    },
    duration: String,
    downloadUrl: [{ quality: String, url: String }],
    url: String,
    type: String
}, { _id: false });

const PlaylistSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String }, // Optional cover image URL
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [SongSchema],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Force recompilation of model in dev to pick up schema changes
if (process.env.NODE_ENV === 'development' && models.Playlist) {
    delete models.Playlist;
}

const Playlist = models.Playlist || model('Playlist', PlaylistSchema);

export default Playlist;
