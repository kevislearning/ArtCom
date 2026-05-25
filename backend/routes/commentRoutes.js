import express from 'express';
import { createComment, getCommentsByIllustration, deleteComment } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/illustration/:illustrationId', getCommentsByIllustration);
router.post('/', protect, createComment);
router.delete('/:id', protect, deleteComment);

export default router;
