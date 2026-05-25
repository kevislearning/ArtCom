import express from 'express';
import { getNotifications, markAllAsRead, markAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/mark-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

export default router;
