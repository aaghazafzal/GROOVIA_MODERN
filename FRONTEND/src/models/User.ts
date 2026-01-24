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
}, { _id: false }); // No _id for subdocuments if not needed, or keep it.

const UserSchema = new Schema({
    uid: { type: String, required: true, unique: true }, // Firebase UID
    email: { type: String, required: true, unique: true },
    name: { type: String },
    photoURL: { type: String },
    likedSongs: [SongSchema],
    playlists: [{
        type: Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    settings: {
        streamQuality: { type: String, default: '160kbps' }, // 320kbps, 160kbps, 96kbps
        downloadQuality: { type: String, default: '320kbps' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = models.User || model('User', UserSchema);

export default User;
