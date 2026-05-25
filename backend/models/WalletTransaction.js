import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'escrow_hold', 'escrow_release', 'escrow_refund'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commission',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
