import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'escrow', 'paid_to_artist', 'refunded'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'canceled', 'rejected'],
      default: 'pending',
    },
    resultIllustrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Illustration',
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Commission = mongoose.model('Commission', commissionSchema);
export default Commission;
