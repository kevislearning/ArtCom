import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
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

// Unique index to prevent multiple likes by the same user on the same illustration
likeSchema.index({ userId: 1, illustrationId: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);
export default Like;
