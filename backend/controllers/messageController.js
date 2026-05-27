import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendToUser } from '../config/socket.js';

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
    });

    const populated = await Message.findById(message._id)
      .populate('senderId', 'username nickname avatarUrl isArtist')
      .populate('receiverId', 'username nickname avatarUrl isArtist');

    // Chuyển phát qua Socket.io
    const chatRoomName = [senderId, receiverId].sort().join('-');
    // Emit đến room chat đang hoạt động
    sendToUser(receiverId, 'new_message', populated);

    res.status(201).json(populated);
  } catch (error) {
    console.error('[Send Message Error]', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const userId = req.user.id;

    // Lấy danh sách tin nhắn giữa hai người dùng này
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username nickname avatarUrl isArtist')
      .populate('receiverId', 'username nickname avatarUrl isArtist');

    // Đánh dấu các tin nhắn này là đã đọc nếu người nhận là người dùng hiện tại
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('[Get Messages Error]', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};

/**
 * Trả về danh sách cuộc hội thoại với bố cục trực quan hai cột cao cấp
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Tìm tất cả tin nhắn liên quan đến người dùng hiện tại
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username nickname avatarUrl isArtist')
      .populate('receiverId', 'username nickname avatarUrl isArtist');

    const conversationMap = new Map();

    for (const msg of messages) {
      if (!msg.senderId || !msg.receiverId) continue;

      const senderIdStr = msg.senderId._id ? msg.senderId._id.toString() : msg.senderId.toString();
      const isSenderMe = senderIdStr === userId;
      const otherUser = isSenderMe ? msg.receiverId : msg.senderId;
      const otherUserIdStr = otherUser._id ? otherUser._id.toString() : otherUser.toString();

      if (!conversationMap.has(otherUserIdStr)) {
        conversationMap.set(otherUserIdStr, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
    }

    // Tính số lượng tin nhắn chưa đọc
    for (const [otherUserIdStr, convo] of conversationMap.entries()) {
      const unreadCount = await Message.countDocuments({
        senderId: otherUserIdStr,
        receiverId: userId,
        isRead: false,
      });
      convo.unreadCount = unreadCount;
    }

    res.status(200).json(Array.from(conversationMap.values()));
  } catch (error) {
    console.error('[Get Conversations Error]', error);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
};
