import express from 'express';
import { sendMessage, getMessages, getConversations } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);
router.post('/', protect, sendMessage);

export default router;
