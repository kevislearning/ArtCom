import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Commission from '../models/Commission.js';

export const walletService = {
  /**
   * Nạp tiền VND mô phỏng vào ví của người dùng
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
   * Rút tiền VND mô phỏng từ ví của người dùng
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
   * Giữ tiền trong escrow khi bắt đầu một yêu cầu commission
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

    // Khấu trừ từ số dư của client
    client.walletBalance -= commission.price;
    await client.save();

    // Cập nhật trạng thái thanh toán commission
    commission.paymentStatus = 'escrow';
    await commission.save();

    // Tạo giao dịch giữ tiền escrow (escrow hold)
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
   * Giải phóng tiền trong escrow cho artist sau khi hoàn thành commission
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

    // Cộng tiền cho artist với số tiền thực nhận (sau khi trừ 10% phí nền tảng)
    const feeAmount = Math.round(commission.price * 0.1);
    const netAmount = commission.price - feeAmount;

    artist.walletBalance += netAmount;
    await artist.save();

    // Cập nhật trạng thái commission
    commission.paymentStatus = 'paid_to_artist';
    commission.status = 'completed';
    await commission.save();

    // Tạo giao dịch giải phóng tiền escrow (escrow release) cho artist với số tiền thực nhận và mô tả chi tiết
    const transaction = await WalletTransaction.create({
      userId: commission.artistId,
      amount: netAmount,
      type: 'escrow_release',
      referenceId: commissionId,
      description: `Nhận tiền đặt vẽ tranh (Đã khấu trừ 10% phí nền tảng: -${feeAmount.toLocaleString('vi-VN')} VND) cho commission: ${commission.title}`,
    });

    return { artist, commission, transaction };
  },

  /**
   * Hoàn lại tiền trong escrow cho client nếu commission bị từ chối, bị hủy hoặc hết hạn
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

    // Hoàn tiền cho client
    client.walletBalance += commission.price;
    await client.save();

    // Cập nhật trạng thái commission
    commission.paymentStatus = 'refunded';
    await commission.save();

    // Tạo giao dịch hoàn tiền escrow (escrow refund)
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
