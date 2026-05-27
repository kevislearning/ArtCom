import express from 'express';
import {
  createIllustration,
  getIllustrationById,
  deleteIllustration,
  toggleLike,
  toggleBookmark,
  getIllustrations,
  getFollowedFeed,
  getTrendingTags,
  getBookmarkedIllustrations,
  updateIllustration,
  searchTags,
} from '../controllers/illustrationController.js';
import { protect, optionalProtect, artistOnly } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Các feeds công khai/tùy chọn
router.get('/', optionalProtect, getIllustrations);
router.get('/trending-tags', getTrendingTags);
router.get('/tags/search', searchTags);
router.get('/followed', protect, getFollowedFeed);
router.get('/feed/bookmarks', protect, getBookmarkedIllustrations);
router.get('/:id', optionalProtect, getIllustrationById);

// Các hành động được bảo vệ (yêu cầu đăng nhập)
router.post('/', protect, artistOnly, upload.array('images', 10), createIllustration);
router.delete('/:id', protect, deleteIllustration);
router.put('/:id', protect, updateIllustration);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/bookmark', protect, toggleBookmark);

export default router;
