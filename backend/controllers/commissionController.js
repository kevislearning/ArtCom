import Commission from '../models/Commission.js';
import Illustration from '../models/Illustration.js';
import User from '../models/User.js';
import { walletService } from '../services/walletService.js';
import { notificationService } from '../services/notificationService.js';
import { uploadMultipleToCloudinary } from '../utils/cloudinary.js';

export const createCommission = async (req, res) => {
  try {
    const { artistId, title, description, price, deadline, isPrivate } = req.body;
    const clientId = req.user.id;

    if (!artistId || !title || !description || !price || !deadline) {
      return res.status(400).json({ message: 'All commission fields are required' });
    }

    const artist = await User.findById(artistId);
    if (!artist || (!artist.isArtist && (!artist.requestTerms || !artist.requestTerms.hasTerms))) {
      return res.status(400).json({ message: 'Selected user is not open for commission' });
    }

    if (artistId.toString() === clientId.toString()) {
      return res.status(400).json({ message: 'You cannot commission yourself' });
    }

    // Kiểm tra số dư của client trước
    if (req.user.walletBalance < price) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // 1. Tạo bản ghi commission
    const commission = await Commission.create({
      clientId,
      artistId,
      title,
      description,
      price,
      deadline: new Date(deadline),
      isPrivate: isPrivate === 'true' || isPrivate === true,
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    // 2. Khóa tiền của client trong escrow ngay lập tức
    await walletService.holdInEscrow(commission._id);

    // 3. Gửi notification cho artist
    await notificationService.createNotification({
      recipientId: artistId,
      actorId: clientId,
      type: 'commission_update',
      targetId: commission._id,
      targetModel: 'Commission',
      contentPreview: `New commission request from ${req.user.nickname || req.user.username}: "${title}"`,
    });

    res.status(201).json(commission);
  } catch (error) {
    console.error('[Create Commission Error]', error);
    res.status(500).json({ message: error.message || 'Server error creating commission' });
  }
};

export const acceptCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requested artist can accept this commission' });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({ message: 'Commission cannot be accepted at this stage' });
    }

    commission.status = 'accepted';
    await commission.save();

    await notificationService.createNotification({
      recipientId: commission.clientId,
      actorId: req.user.id,
      type: 'commission_update',
      targetId: commission._id,
      targetModel: 'Commission',
      contentPreview: `Artist accepted your commission: "${commission.title}"`,
    });

    res.status(200).json(commission);
  } catch (error) {
    console.error('[Accept Commission Error]', error);
    res.status(500).json({ message: 'Server error accepting commission' });
  }
};

export const rejectCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requested artist can reject this commission' });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({ message: 'Commission cannot be rejected at this stage' });
    }

    // Từ chối và hoàn tiền cho client
    commission.status = 'rejected';
    await commission.save();

    await walletService.refundEscrow(commission._id);

    await notificationService.createNotification({
      recipientId: commission.clientId,
      actorId: req.user.id,
      type: 'commission_update',
      targetId: commission._id,
      targetModel: 'Commission',
      contentPreview: `Artist rejected your commission request: "${commission.title}". Funds refunded.`,
    });

    res.status(200).json(commission);
  } catch (error) {
    console.error('[Reject Commission Error]', error);
    res.status(500).json({ message: error.message || 'Server error rejecting commission' });
  }
};

export const cancelCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    const isClient = commission.clientId.toString() === req.user.id;
    const isArtist = commission.artistId.toString() === req.user.id;

    if (!isClient && !isArtist) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Client chỉ có thể hủy khi trạng thái là 'pending' (trước khi được chấp nhận)
    if (isClient && commission.status !== 'pending') {
      return res.status(400).json({ message: 'You cannot cancel a commission after the artist accepts it' });
    }

    // Artist có thể hủy ở bất kỳ giai đoạn nào ngoại trừ completed/canceled/rejected
    if (isArtist && ['completed', 'canceled', 'rejected'].includes(commission.status)) {
      return res.status(400).json({ message: 'Commission is already finished' });
    }

    commission.status = 'canceled';
    await commission.save();

    await walletService.refundEscrow(commission._id);

    const recipientId = isClient ? commission.artistId : commission.clientId;
    const actorId = req.user.id;

    await notificationService.createNotification({
      recipientId,
      actorId,
      type: 'commission_update',
      targetId: commission._id,
      targetModel: 'Commission',
      contentPreview: `Commission "${commission.title}" has been canceled. Funds refunded.`,
    });

    res.status(200).json(commission);
  } catch (error) {
    console.error('[Cancel Commission Error]', error);
    res.status(500).json({ message: error.message || 'Server error canceling commission' });
  }
};

export const completeCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.artistId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the commissioned artist can deliver and complete this task' });
    }

    if (!['accepted', 'in_progress'].includes(commission.status)) {
      commission.status = 'accepted'; // fallback đề phòng trường hợp lỗi
    }

    // Yêu cầu tải lên hình ảnh artwork để hoàn thành
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload the completed artwork files' });
    }

    const imageUrls = await uploadMultipleToCloudinary(req.files);

    // Tạo một illustration cho tác phẩm commission đã hoàn thành
    const resultIllustration = await Illustration.create({
      artistId: req.user.id,
      title: `[Commission Result] ${commission.title}`,
      description: `Delivery for commission. Original prompt: ${commission.description}`,
      imageUrls,
      tags: ['commission', 'delivery'],
      visibility: commission.isPrivate ? 'private' : 'everyone',
      commentsEnabled: true,
    });

    commission.resultIllustrationId = resultIllustration._id;
    await commission.save();

    // Giải phóng tiền từ escrow cho artist
    await walletService.releaseEscrow(commission._id);

    // Gửi notification cho Client
    await notificationService.createNotification({
      recipientId: commission.clientId,
      actorId: req.user.id,
      type: 'commission_update',
      targetId: commission._id,
      targetModel: 'Commission',
      contentPreview: `Artist completed your commission: "${commission.title}". Artwork delivered!`,
    });

    res.status(200).json(commission);
  } catch (error) {
    console.error('[Complete Commission Error]', error);
    res.status(500).json({ message: error.message || 'Server error completing commission' });
  }
};

export const getClientCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find({ clientId: req.user.id })
      .populate('artistId', 'username nickname avatarUrl isArtist')
      .populate('resultIllustrationId')
      .sort({ createdAt: -1 });
    res.status(200).json(commissions);
  } catch (error) {
    console.error('[Get Client Commissions Error]', error);
    res.status(500).json({ message: 'Server error fetching commissions' });
  }
};

export const getArtistCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find({ artistId: req.user.id })
      .populate('clientId', 'username nickname avatarUrl isArtist')
      .populate('resultIllustrationId')
      .sort({ createdAt: -1 });
    res.status(200).json(commissions);
  } catch (error) {
    console.error('[Get Artist Commissions Error]', error);
    res.status(500).json({ message: 'Server error fetching commissions' });
  }
};

export const getCommissionById = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('clientId', 'username nickname avatarUrl isArtist')
      .populate('artistId', 'username nickname avatarUrl isArtist')
      .populate('resultIllustrationId');

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.clientId._id.toString() !== req.user.id && commission.artistId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this commission detail' });
    }

    res.status(200).json(commission);
  } catch (error) {
    console.error('[Get Commission By Id Error]', error);
    res.status(500).json({ message: 'Server error fetching commission details' });
  }
};
