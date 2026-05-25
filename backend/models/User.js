import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    nickname: {
      type: String,
      default: function () {
        return this.username;
      },
    },
    bio: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    isArtist: {
      type: Boolean,
      default: false,
    },
    walletBalance: {
      type: Number,
      default: 0, // VND currency
    },
    socialLinks: {
      twitter: { type: String, default: '' },
      behance: { type: String, default: '' },
      artstation: { type: String, default: '' },
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    totalBookmarks: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
