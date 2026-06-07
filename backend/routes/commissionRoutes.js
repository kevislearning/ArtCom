import express from 'express';
import {
  createCommission,
  acceptCommission,
  rejectCommission,
  cancelCommission,
  completeCommission,
  getClientCommissions,
  getArtistCommissions,
  getCommissionById,
} from '../controllers/commissionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/client', protect, getClientCommissions);
router.get('/artist', protect, getArtistCommissions);
router.get('/:id', protect, getCommissionById);

router.post('/', protect, upload.array('referenceImages', 5), createCommission);
router.post('/:id/accept', protect, acceptCommission);
router.post('/:id/reject', protect, rejectCommission);
router.post('/:id/cancel', protect, cancelCommission);
router.post('/:id/complete', protect, upload.array('images', 10), completeCommission);

export default router;
