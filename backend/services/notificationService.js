import Notification from '../models/Notification.js';
import { sendToUser } from '../config/socket.js';

export const notificationService = {
  /**
   * Create a notification in the database and push it in real-time if the user is online
   */
  async createNotification({
    recipientId,
    actorId = null,
    type,
    targetId = null,
    targetModel = null,
    contentPreview = '',
  }) {
    // If actor is performing action on themselves (e.g. self-liking, self-commenting), skip notification
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

    // Populate actor info for front-end visual mapping
    const populated = await Notification.findById(notification._id)
      .populate('actorId', 'username nickname avatarUrl isArtist');

    // Emit via Socket.io
    sendToUser(recipientId, 'new_notification', populated);

    return populated;
  },

  /**
   * Mark all notifications as read for a specific user
   */
  async markAllAsRead(userId) {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    return { success: true };
  },

  /**
   * Mark a single notification as read
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
