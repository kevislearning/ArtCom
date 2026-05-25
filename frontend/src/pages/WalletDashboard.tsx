import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle,
  FileText,
  X,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useWithdrawFundsMutation,
  useInitiateMomoDepositMutation,
  useMockConfirmMomoDepositMutation,
  useConfirmBankDepositMutation,
} from '../store/walletApi';
import { updateUser } from '../store/authSlice';

export const WalletDashboard = () => {
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // Payment inputs and states
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Payment gateway states
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank'>('momo');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQRUrl, setBankQRUrl] = useState('');
  const [refCode, setRefCode] = useState('');
  const [isProcessingBank, setIsProcessingBank] = useState(false);
  const [copiedField, setCopiedField] = useState<'account' | 'content' | null>(null);
  const [devMockData, setDevMockData] = useState<{ orderId: string; amount: number } | null>(null);

  // Queries and mutations
  const { data: balanceData } = useGetWalletBalanceQuery(undefined, {
    pollingInterval: 10000,
  });

  const { data: transactions = [], refetch } = useGetWalletTransactionsQuery();

  const [withdrawFunds, { isLoading: isWithdrawing }] = useWithdrawFundsMutation();
  const [initiateMomoDeposit, { isLoading: isInitiatingMomo }] = useInitiateMomoDepositMutation();
  const [mockConfirmMomoDeposit] = useMockConfirmMomoDepositMutation();
  const [confirmBankDeposit] = useConfirmBankDepositMutation();

  const currentBalance = balanceData?.walletBalance ?? user?.walletBalance ?? 0;

  // Handle MoMo Sandbox payment return callback from URL query parameters
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultCode = params.get('resultCode');
    const orderId = params.get('orderId');
    const amountStr = params.get('amount');

    if (resultCode === '0' && orderId && amountStr) {
      const amount = Number(amountStr);
      console.log('[MoMo Callback] Success redirect received, confirming payment...', orderId, amount);
      
      const processConfirm = async () => {
        try {
          const result = await mockConfirmMomoDeposit({ orderId, amount }).unwrap();
          
          // Update Redux state
          if (user) {
            dispatch(updateUser({ ...user, walletBalance: result.walletBalance }));
          }
          
          setSuccessMessage(`Thanh toán thành công! Đã nạp +${formatVND(amount)} vào ví thông qua MoMo.`);
          
          // Clear query parameters from address bar gracefully
          window.history.replaceState({}, document.title, window.location.pathname);
          refetch();
        } catch (err: any) {
          console.error(err);
          setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi xác nhận thanh toán MoMo!');
        }
      };

      processConfirm();
    } else if (resultCode && resultCode !== '0' && orderId && amountStr) {
      const amount = Number(amountStr);
      setDevMockData({ orderId, amount });
      const message = params.get('message') || 'Thao tác nạp tiền MoMo đã bị hủy hoặc thất bại.';
      setErrorMessage(`Lỗi thanh toán MoMo: ${message}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (resultCode && resultCode !== '0') {
      const message = params.get('message') || 'Thao tác nạp tiền MoMo đã bị hủy hoặc thất bại.';
      setErrorMessage(`Lỗi thanh toán MoMo: ${message}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [window.location.search]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!depositAmount || depositAmount < 1000) {
      setErrorMessage('Số tiền nạp tối thiểu là 1,000 VND!');
      return;
    }

    if (paymentMethod === 'momo') {
      try {
        console.log('[Deposit] Initiating MoMo Sandbox payment for:', depositAmount);
        const result = await initiateMomoDeposit(depositAmount).unwrap();
        if (result.payUrl) {
          // Redirect the user directly to the MoMo sandbox payment gateway
          window.location.href = result.payUrl;
        } else {
          setErrorMessage('Không nhận được liên kết thanh toán từ MoMo!');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi khởi tạo giao dịch MoMo!');
      }
    } else {
      // Bank Transfer (VietQR) flow
      const bankId = 'MB';
      const accountNo = '099999999999';
      const accountName = 'ART GALLERY COMMUNITY';
      const uniqueRef = `ARTPAY_${user?.username || 'user'}_${Date.now().toString().slice(-6)}`;
      
      const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${depositAmount}&addInfo=${uniqueRef}&accountName=${encodeURIComponent(accountName)}`;
      
      setBankQRUrl(qrUrl);
      setRefCode(uniqueRef);
      setShowBankModal(true);
    }
  };

  const handleConfirmBankPayment = async () => {
    setIsProcessingBank(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Simulate 2s banking scanner delay
    setTimeout(async () => {
      try {
        const amount = Number(depositAmount);
        const result = await confirmBankDeposit({ amount, referenceCode: refCode }).unwrap();

        // Update Redux state
        if (user) {
          dispatch(updateUser({ ...user, walletBalance: result.walletBalance }));
        }

        setSuccessMessage(`Đã nạp thành công +${formatVND(amount)} thông qua chuyển khoản Ngân hàng (VietQR)!`);
        setShowBankModal(false);
        setDepositAmount('');
        refetch();
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi xác nhận giao dịch chuyển khoản!');
      } finally {
        setIsProcessingBank(false);
      }
    }, 2000);
  };

  const handleDevMockSuccess = async () => {
    if (!devMockData) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const result = await mockConfirmMomoDeposit({
        orderId: devMockData.orderId,
        amount: devMockData.amount
      }).unwrap();

      // Update Redux state
      if (user) {
        dispatch(updateUser({ ...user, walletBalance: result.walletBalance }));
      }

      setSuccessMessage(`[Dev Mode] Đã giả lập thanh toán MoMo thành công! Đã nạp +${formatVND(devMockData.amount)} vào ví.`);
      setDevMockData(null);
      setDepositAmount('');
      refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi giả lập xác nhận giao dịch MoMo!');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!withdrawAmount || withdrawAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền rút hợp lệ!');
      return;
    }

    if (currentBalance < withdrawAmount) {
      setErrorMessage(t.insufficientBalance);
      return;
    }

    try {
      const result = await withdrawFunds(withdrawAmount).unwrap();
      
      // Update Redux user balance state
      if (user) {
        dispatch(updateUser({ ...user, walletBalance: result.walletBalance }));
      }

      setSuccessMessage(`Đã rút thành công ${formatVND(withdrawAmount)} từ tài khoản giả lập!`);
      setWithdrawAmount('');
      refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi rút tiền!');
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'escrow_release':
      case 'escrow_refund':
        return { color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.05)' };
      case 'withdraw':
      case 'escrow_hold':
      default:
        return { color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' };
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'escrow_release':
      case 'escrow_refund':
        return <ArrowDownLeft size={16} />;
      case 'withdraw':
      case 'escrow_hold':
      default:
        return <ArrowUpRight size={16} />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Nạp tiền (Deposit)';
      case 'withdraw':
        return 'Rút tiền (Withdraw)';
      case 'escrow_hold':
        return 'Tạm khóa (Escrow Hold)';
      case 'escrow_release':
        return 'Giải ngân (Escrow Release)';
      case 'escrow_refund':
        return 'Hoàn tiền (Escrow Refund)';
      default:
        return type;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.wallet}</h1>

      {/* Alert overlays */}
      {(errorMessage || successMessage) && (
        <div
          style={{
            backgroundColor: errorMessage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: errorMessage ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
            color: errorMessage ? 'var(--danger)' : 'var(--success)',
            padding: '16px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {/* Developer Sandbox Mock Success Override Panel */}
      {devMockData && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            border: '1px dashed var(--primary)',
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '20px',
            borderRadius: 'var(--border-radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            🔧 <strong>Chế độ nhà phát triển (Localhost Dev Mode)</strong>: Bạn vừa quay về từ MoMo Sandbox của mã đơn hàng <code>{devMockData.orderId}</code>. <br />
            Để tiếp tục chạy thử luồng nạp tiền mà không cần quét mã thật, bạn có thể click nút dưới đây để giả lập thanh toán thành công.
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDevMockSuccess}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '12px', height: '36px', borderRadius: '18px' }}
            >
              Giả lập nạp thành công {formatVND(devMockData.amount)}
            </button>
            <button
              onClick={() => setDevMockData(null)}
              className="btn btn-secondary"
              style={{ padding: '8px 20px', fontSize: '12px', height: '36px', borderRadius: '18px' }}
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Top dashboard summary and deposit panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
        className="wallet-grid"
      >
        {/* Visual Balance Card */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '40px 32px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99, 102, 241, 0.08) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-24px',
              bottom: '-24px',
              color: 'rgba(99, 102, 241, 0.05)',
            }}
          >
            <Wallet size={160} />
          </div>

          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t.walletBalance}
          </span>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', filter: 'drop-shadow(0 0 10px var(--primary-glow))' }}>
            {formatVND(currentBalance)}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
            <span>Ví giao dịch giả lập an toàn</span>
          </div>
        </div>

        {/* Deposit Panel */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '32px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownLeft size={18} style={{ color: 'var(--success)' }} />
            {t.deposit}
          </h3>

          {/* Payment Method Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('momo')}
              className="btn"
              style={{
                flex: 1,
                borderRadius: '8px',
                height: '38px',
                fontSize: '12px',
                padding: '0 8px',
                backgroundColor: paymentMethod === 'momo' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: paymentMethod === 'momo' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ví MoMo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className="btn"
              style={{
                flex: 1,
                borderRadius: '8px',
                height: '38px',
                fontSize: '12px',
                padding: '0 8px',
                backgroundColor: paymentMethod === 'bank' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: paymentMethod === 'bank' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              VietQR Bank
            </button>
          </div>

          <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="number"
              className="glass-input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder={paymentMethod === 'momo' ? 'Nhập tiền nạp MoMo (đ)...' : 'Nhập tiền chuyển khoản (đ)...'}
              min={1000}
              step={10000}
              required
            />
            <button type="submit" className="btn btn-accent" style={{ height: '40px' }} disabled={isInitiatingMomo}>
              {isInitiatingMomo ? 'Đang khởi tạo...' : paymentMethod === 'momo' ? 'Nạp qua Ví MoMo' : 'Tạo mã VietQR'}
            </button>
          </form>
        </div>

        {/* Withdrawal Panel */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '32px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpRight size={18} style={{ color: 'var(--danger)' }} />
            {t.withdraw}
          </h3>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="number"
              className="glass-input"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder={t.withdrawPlaceholder}
              min={10000}
              step={10000}
              required
            />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ height: '40px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? 'Đang thực hiện...' : 'Rút tiền ngay'}
            </button>
          </form>
        </div>
      </div>

      {/* Ledger lists section */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          padding: '32px',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--glass-border)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          {t.transactionHistory}
        </h2>

        {transactions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {t.noTransactions}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t.date}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t.transactionType}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t.transactionDetail}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const style = getTransactionTypeStyle(tx.type);
                  const icon = getTransactionTypeIcon(tx.type);

                  return (
                    <tr
                      key={tx._id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                        fontSize: '14px',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          {new Date(tx.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '12px',
                            ...style,
                          }}
                        >
                          {icon}
                          {getTransactionTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {tx.description}
                        {tx.referenceId && (
                          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Mã Commission: #{typeof tx.referenceId === 'object' && tx.referenceId && '_id' in tx.referenceId ? tx.referenceId._id : String(tx.referenceId)}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: tx.amount > 0 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {formatVND(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VietQR Bank Transfer Modal */}
      {showBankModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 11, 16, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowBankModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <ShieldCheck size={24} style={{ color: 'var(--accent)' }} />
                Chuyển khoản bằng mã VietQR
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Quét mã bằng ứng dụng ngân hàng của bạn để tự điền thông tin chuyển khoản nhanh chóng.
              </p>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                width: '260px',
                height: '260px',
              }}
            >
              <img
                src={bankQRUrl}
                alt="VietQR bank transfer code"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Bank Details list */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '20px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ngân hàng thụ hưởng</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>MBBank (Ngân hàng Quân Đội)</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số tài khoản</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>099999999999</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('099999999999');
                      setCopiedField('account');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
                  >
                    <Copy size={12} />
                    {copiedField === 'account' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tên chủ tài khoản</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>ART GALLERY COMMUNITY</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Số tiền chuyển khoản</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '15px' }}>{formatVND(Number(depositAmount))}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nội dung chuyển khoản</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '12px', fontFamily: 'monospace' }}>
                    {refCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(refCode);
                      setCopiedField('content');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
                  >
                    <Copy size={12} />
                    {copiedField === 'content' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            </div>

            {/* Note & Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '1.5' }}>
                <CheckCircle size={14} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
                <span>Số dư sẽ được cộng tự động sau khi hệ thống nhận được giao dịch chuyển khoản thành công từ phía ngân hàng liên kết.</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={isProcessingBank}
                >
                  Đóng lại
                </button>
                
                <button
                  onClick={handleConfirmBankPayment}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  disabled={isProcessingBank}
                >
                  {isProcessingBank ? (
                    <>
                      <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Đang đối soát giao dịch...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Tôi đã chuyển khoản
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
