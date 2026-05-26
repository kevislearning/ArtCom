import crypto from 'crypto';
import https from 'https';
import { walletService } from '../services/walletService.js';
import WalletTransaction from '../models/WalletTransaction.js';
import User from '../models/User.js';

const generateMomoSignature = (data, secretKey) => {
  const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
};

const postRequest = (url, body) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
};

export const depositFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100000) {
      return res.status(400).json({ message: 'Số tiền nạp tối thiểu là 100,000 VND!' });
    }

    const { user, transaction } = await walletService.deposit(req.user.id, amount, 'Simulated Deposit (Nạp tiền giả lập)');
    res.status(200).json({ walletBalance: user.walletBalance, transaction });
  } catch (error) {
    console.error('[Deposit Error]', error);
    res.status(500).json({ message: error.message || 'Server error depositing funds' });
  }
};

export const withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 50000) {
      return res.status(400).json({ message: 'Số tiền rút tối thiểu là 50,000 VND!' });
    }

    const { user, transaction } = await walletService.withdraw(req.user.id, amount, 'Simulated Withdrawal (Rút tiền giả lập)');
    res.status(200).json({ walletBalance: user.walletBalance, transaction });
  } catch (error) {
    console.error('[Withdrawal Error]', error);
    res.status(500).json({ message: error.message || 'Server error withdrawing funds' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('referenceId', 'title price status');

    res.status(200).json(transactions);
  } catch (error) {
    console.error('[Get Transactions Error]', error);
    res.status(500).json({ message: 'Server error fetching wallet transactions' });
  }
};

export const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ walletBalance: user.walletBalance });
  } catch (error) {
    console.error('[Get Balance Error]', error);
    res.status(500).json({ message: 'Server error fetching balance' });
  }
};

export const initiateMomoPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100000) {
      return res.status(400).json({ message: 'Số tiền nạp tối thiểu là 100,000 VND!' });
    }

    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529';
    const accessKey = process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j';
    const secretKey = process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';
    const momoUrl = process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';

    const orderId = `ARTPAY_${req.user.id}_${Date.now()}`;
    const requestId = orderId;
    const orderInfo = `Nap tien vi gia lap ArtGallery - user @${req.user.username}`;
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet`;
    const ipnUrl = `${req.protocol}://${req.get('host')}/api/wallet/momo-ipn`;
    const extraData = '';
    const requestType = 'captureWallet';

    const rawData = {
      partnerCode,
      accessKey,
      requestId,
      amount: Number(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType
    };

    const signature = generateMomoSignature(rawData, secretKey);

    const requestBody = {
      ...rawData,
      partnerName: 'Art Gallery',
      storeId: 'ArtGalleryStore',
      lang: 'vi',
      signature
    };

    console.log('[MoMo] Requesting payment link for amount:', amount);
    const momoResponse = await postRequest(momoUrl, requestBody);

    if (momoResponse && momoResponse.resultCode === 0) {
      console.log('[MoMo] Payment link created successfully:', momoResponse.payUrl);
      res.status(200).json({ payUrl: momoResponse.payUrl, orderId });
    } else {
      console.error('[MoMo API Error]', momoResponse);
      res.status(400).json({ 
        message: momoResponse.message || 'Failed to initiate MoMo payment',
        details: momoResponse 
      });
    }
  } catch (error) {
    console.error('[Initiate MoMo Error]', error);
    res.status(500).json({ message: 'Server error initiating MoMo payment' });
  }
};

export const mockConfirmMomoPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) {
      return res.status(400).json({ message: 'OrderId and amount are required' });
    }

    const existingTx = await WalletTransaction.findOne({ description: new RegExp(orderId) });
    if (existingTx) {
      const user = await User.findById(req.user.id).select('walletBalance');
      return res.status(200).json({ walletBalance: user.walletBalance, alreadyProcessed: true });
    }

    console.log('[MoMo Mock Confirm] Depositing amount for order:', amount, orderId);
    
    const { user, transaction } = await walletService.deposit(
      req.user.id,
      Number(amount),
      `Nap tien qua Vi dien tu MoMo (Ma giao dich: ${orderId})`
    );

    res.status(200).json({ walletBalance: user.walletBalance, transaction });
  } catch (error) {
    console.error('[Mock Confirm MoMo Error]', error);
    res.status(500).json({ message: 'Server error processing mock payment confirmation' });
  }
};

export const confirmBankDeposit = async (req, res) => {
  try {
    const { amount, referenceCode } = req.body;
    if (!amount || amount < 100000 || !referenceCode) {
      return res.status(400).json({ message: 'Số tiền nạp tối thiểu là 100,000 VND và mã tham chiếu là bắt buộc!' });
    }

    const existingTx = await WalletTransaction.findOne({ description: new RegExp(referenceCode) });
    if (existingTx) {
      const user = await User.findById(req.user.id).select('walletBalance');
      return res.status(200).json({ walletBalance: user.walletBalance, alreadyProcessed: true });
    }

    console.log('[Bank Deposit Confirm] Depositing amount:', amount, referenceCode);

    const { user, transaction } = await walletService.deposit(
      req.user.id,
      Number(amount),
      `Nap tien qua Chuyen khoan Ngan hang (Ma VietQR: ${referenceCode})`
    );

    res.status(200).json({ walletBalance: user.walletBalance, transaction });
  } catch (error) {
    console.error('[Confirm Bank Deposit Error]', error);
    res.status(500).json({ message: 'Server error confirming bank deposit' });
  }
};

export const momoIPN = async (req, res) => {
  try {
    const data = req.body;
    console.log('[MoMo Webhook IPN Received]', data);

    const secretKey = process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';

    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j'}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;
    
    const computedSignature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    if (computedSignature !== data.signature) {
      console.error('[MoMo Webhook Signature Mismatch]');
      return res.status(400).json({ message: 'Signature mismatch' });
    }

    if (data.resultCode === 0) {
      const parts = data.orderId.split('_');
      if (parts[1]) {
        const userId = parts[1];
        
        const existingTx = await WalletTransaction.findOne({ description: new RegExp(data.orderId) });
        if (!existingTx) {
          await walletService.deposit(
            userId,
            Number(data.amount),
            `Nap tien qua Vi dien tu MoMo (Giao dich that: ${data.orderId})`
          );
          console.log('[MoMo IPN] Successfully credited user:', userId);
        }
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error('[MoMo IPN Error]', error);
    res.status(500).send();
  }
};
