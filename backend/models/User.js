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
    requestTerms: {
      title: { type: String, default: '' },
      details: { type: String, default: '' },
      targetPrice: { type: Number, default: 0 },
      backgroundUrl: { type: String, default: '' },
      hasTerms: { type: Boolean, default: false }
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
    website: {
      value: { type: String, default: '' },
      isPublic: { type: Boolean, default: true },
    },
    customSocialLinks: [
      {
        platform: { type: String, default: '' },
        username: { type: String, default: '' },
        isPublic: { type: Boolean, default: true },
      }
    ],
    gender: {
      value: { type: String, default: 'other' },
      isPublic: { type: Boolean, default: true },
    },
    country: {
      value: { type: String, default: '' },
      isPublic: { type: Boolean, default: true },
    },
    birthday: {
      value: { type: Date, default: null },
      isPublic: { type: Boolean, default: true },
    },
    occupation: {
      value: { type: String, default: '' },
      isPublic: { type: Boolean, default: true },
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
