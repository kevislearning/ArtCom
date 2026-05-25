import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    illustrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Illustration',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent duplicate bookmarks
bookmarkSchema.index({ userId: 1, illustrationId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
