import Notification from '../models/Notification.js';
import { sendToUser } from '../config/socket.js';

export const notificationService = {
  /**
   * Tạo một notification trong cơ sở dữ liệu và push theo thời gian thực nếu người dùng online
   */
  async createNotification({
    recipientId,
    actorId = null,
    type,
    targetId = null,
    targetModel = null,
    contentPreview = '',
  }) {
    // Nếu actor đang thực hiện hành động trên chính họ (ví dụ: tự like, tự comment), bỏ qua notification
    if (actorId && actorId.toString() === recipientId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipientId,
      actorId,
      type,
      targetId,
      targetModel,
      contentPreview,
    });

    // Populate thông tin actor để front-end ánh xạ trực quan
    const populated = await Notification.findById(notification._id)
      .populate('actorId', 'username nickname avatarUrl isArtist');

    // Phát phát qua Socket.io
    sendToUser(recipientId, 'new_notification', populated);

    return populated;
  },

  /**
   * Đánh dấu tất cả notification là đã đọc cho một người dùng cụ thể
   */
  async markAllAsRead(userId) {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return { success: true };
  },

  /**
   * Đánh dấu một notification duy nhất là đã đọc
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );
    return notification;
  }
};
