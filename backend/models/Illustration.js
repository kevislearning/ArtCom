import mongoose from 'mongoose';

const illustrationSchema = new mongoose.Schema(
  {
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    imageUrls: {
      type: [String],
      required: true,
      validate: [
        (val) => val.length > 0,
        'At least one image URL is required',
      ],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    visibility: {
      type: String,
      enum: ['everyone', 'private', 'logged_in'],
      default: 'everyone',
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    bookmarksCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for sorting search/feeds by date
illustrationSchema.index({ createdAt: -1 });
illustrationSchema.index({ tags: 1, createdAt: -1 });

const Illustration = mongoose.model('Illustration', illustrationSchema);
export default Illustration;
