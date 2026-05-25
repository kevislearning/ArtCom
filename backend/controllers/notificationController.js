import Notification from '../models/Notification.js';
import { notificationService } from '../services/notificationService.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
      .populate('actorId', 'username nickname avatarUrl isArtist')
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('[Get Notifications Error]', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    console.error('[Mark All Read Error]', error);
    res.status(500).json({ message: 'Server error marking notifications as read' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('[Mark As Read Error]', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};
