import express from 'express';
import { 
  depositFunds, 
  withdrawFunds, 
  getTransactions, 
  getBalance,
  initiateMomoPayment,
  mockConfirmMomoPayment,
  confirmBankDeposit,
  momoIPN
} from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/balance', protect, getBalance);
router.get('/transactions', protect, getTransactions);
router.post('/deposit', protect, depositFunds);
router.post('/withdraw', protect, withdrawFunds);

// Payment Gateway routes
router.post('/deposit/momo', protect, initiateMomoPayment);
router.post('/deposit/momo/mock-confirm', protect, mockConfirmMomoPayment);
router.post('/deposit/bank/confirm', protect, confirmBankDeposit);
router.post('/momo-ipn', momoIPN); 

export default router;
