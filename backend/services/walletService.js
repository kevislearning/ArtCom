import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Commission from '../models/Commission.js';

export const walletService = {
  /**
   * Deposit simulated VND to a user's wallet
   */
  async deposit(userId, amount, description = 'Simulated Deposit') {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than zero');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.walletBalance += amount;
    await user.save();

    const transaction = await WalletTransaction.create({
      userId,
      amount,
      type: 'deposit',
      description,
    });

    return { user, transaction };
  },

  /**
   * Withdraw simulated VND from a user's wallet
   */
  async withdraw(userId, amount, description = 'Simulated Withdrawal') {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    user.walletBalance -= amount;
    await user.save();

    const transaction = await WalletTransaction.create({
      userId,
      amount: -amount,
      type: 'withdraw',
      description,
    });

    return { user, transaction };
  },

  /**
   * Hold funds in escrow upon starting a commission request
   */
  async holdInEscrow(commissionId) {
    const commission = await Commission.findById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.paymentStatus !== 'unpaid') {
      throw new Error('Commission payment is already processed or escrowed');
    }

    const client = await User.findById(commission.clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    if (client.walletBalance < commission.price) {
      throw new Error('Insufficient wallet balance to start this commission');
    }

    // Deduct from client's balance
    client.walletBalance -= commission.price;
    await client.save();

    // Update commission payment status
    commission.paymentStatus = 'escrow';
    await commission.save();

    // Create escrow hold transaction
    const transaction = await WalletTransaction.create({
      userId: commission.clientId,
      amount: -commission.price,
      type: 'escrow_hold',
      referenceId: commissionId,
      description: `Escrow hold for commission: ${commission.title}`,
    });

    return { client, commission, transaction };
  },

  /**
   * Release escrowed funds to the artist upon completion of the commission
   */
  async releaseEscrow(commissionId) {
    const commission = await Commission.findById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.paymentStatus !== 'escrow') {
      throw new Error('Commission is not currently held in escrow');
    }

    const artist = await User.findById(commission.artistId);
    if (!artist) {
      throw new Error('Artist not found');
    }

    // Credit the artist
    artist.walletBalance += commission.price;
    await artist.save();

    // Update commission status
    commission.paymentStatus = 'paid_to_artist';
    commission.status = 'completed';
    await commission.save();

    // Create escrow release transaction for artist
    const transaction = await WalletTransaction.create({
      userId: commission.artistId,
      amount: commission.price,
      type: 'escrow_release',
      referenceId: commissionId,
      description: `Escrow payout released for commission: ${commission.title}`,
    });

    return { artist, commission, transaction };
  },

  /**
   * Refund escrowed funds back to the client if commission is rejected, canceled, or expired
   */
  async refundEscrow(commissionId) {
    const commission = await Commission.findById(commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.paymentStatus !== 'escrow') {
      throw new Error('Commission is not currently held in escrow');
    }

    const client = await User.findById(commission.clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Refund the client
    client.walletBalance += commission.price;
    await client.save();

    // Update commission status
    commission.paymentStatus = 'refunded';
    await commission.save();

    // Create escrow refund transaction
    const transaction = await WalletTransaction.create({
      userId: commission.clientId,
      amount: commission.price,
      type: 'escrow_refund',
      referenceId: commissionId,
      description: `Escrow refund returned for commission: ${commission.title}`,
    });

    return { client, commission, transaction };
  }
};
