import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    illustrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Illustration',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Thêm index để sắp xếp nhanh các luồng bình luận theo thời gian
commentSchema.index({ illustrationId: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
