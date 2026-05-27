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

// Index duy nhất để ngăn chặn một người dùng like nhiều lần trên cùng một illustration
likeSchema.index({ userId: 1, illustrationId: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);
export default Like;
