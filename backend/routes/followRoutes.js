import express from 'express';
import { toggleFollow, getFollowers, getFollowing, checkFollowStatus } from '../controllers/followController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/:id/toggle', protect, toggleFollow);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id/status', protect, checkFollowStatus);

export default router;
