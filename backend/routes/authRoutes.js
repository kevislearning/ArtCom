import express from 'express';
import { register, login, logout, getMe, getPublicProfile, updateProfile, getRecommendedArtists, changePassword, updateRequestTerms, deleteRequestTerms, googleLogin, searchUsers } from '../controllers/authController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/search', optionalProtect, searchUsers);
router.get('/profile/:id', optionalProtect, getPublicProfile);
router.get('/artists/recommended', getRecommendedArtists);

router.put(
  '/update',
  protect,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  updateProfile
);

router.put('/change-password', protect, changePassword);

router.put('/request-terms', protect, upload.single('background'), updateRequestTerms);
router.delete('/request-terms', protect, deleteRequestTerms);

export default router;
