import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X as XIcon,
  Upload,
  Eye,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import {
  useGetClientCommissionsQuery,
  useGetArtistCommissionsQuery,
  useAcceptCommissionMutation,
  useRejectCommissionMutation,
  useCancelCommissionMutation,
  useCompleteCommissionMutation,
} from '../store/commissionApi';
import { getImageUrl } from '../utils/url';
import { updateUser } from '../store/authSlice';
import { useUpdateRequestTermsMutation, useDeleteRequestTermsMutation } from '../store/authApi';


export const Commissions = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Trạng thái Tab: 'requested' (Góc nhìn của Client) vs 'received' (Góc nhìn của Artist)
  const [commTab, setCommTab] = useState<'requested' | 'received'>(
    user?.requestTerms?.hasTerms ? 'received' : 'requested'
  );

  // State của Modal bàn giao tác phẩm (Delivery)
  const [deliveryTargetId, setDeliveryTargetId] = useState<string | null>(null);
  const [deliveryFiles, setDeliveryFiles] = useState<FileList | null>(null);
  const [deliveryPreviews, setDeliveryPreviews] = useState<string[]>([]);
  const [deliveryError, setDeliveryError] = useState('');

  // State của Modal cấu hình điều khoản yêu cầu (Request Terms)
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsTitle, setTermsTitle] = useState(user?.requestTerms?.title || '');
  const [termsDetails, setTermsDetails] = useState(user?.requestTerms?.details || '');
  const [termsPrice, setTermsPrice] = useState(user?.requestTerms?.targetPrice || 100000);
  const [termsBgFile, setTermsBgFile] = useState<File | null>(null);
  const [termsBgPreview, setTermsBgPreview] = useState(user?.requestTerms?.backgroundUrl || '');
  const [termsError, setTermsError] = useState('');
  const [isSubmittingTerms, setIsSubmittingTerms] = useState(false);

  const [updateRequestTerms] = useUpdateRequestTermsMutation();
  const [deleteRequestTerms] = useDeleteRequestTermsMutation();

  useEffect(() => {
    if (user?.requestTerms) {
      setTermsTitle(user.requestTerms.title || '');
      setTermsDetails(user.requestTerms.details || '');
      setTermsPrice(user.requestTerms.targetPrice || 100000);
      setTermsBgPreview(user.requestTerms.backgroundUrl || '');
    }
  }, [user]);

  // Các câu truy vấn (Queries)
  const { data: requestedCommissions = [], refetch: refetchClient } = useGetClientCommissionsQuery(
    undefined,
    { skip: !user }
  );

  const { data: receivedCommissions = [], refetch: refetchArtist } = useGetArtistCommissionsQuery(
    undefined,
    { skip: !user }
  );

  // Các đột biến thay đổi dữ liệu (Mutations)
  const [acceptCommission] = useAcceptCommissionMutation();
  const [rejectCommission] = useRejectCommissionMutation();
  const [cancelCommission] = useCancelCommissionMutation();
  const [completeCommission, { isLoading: isCompleting }] = useCompleteCommissionMutation();

  const handleAccept = async (id: string) => {
    try {
      await acceptCommission(id).unwrap();
      refetchClient();
      refetchArtist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn từ chối yêu cầu vẽ này? Tiền tạm giữ sẽ được hoàn lại cho khách hàng.')) {
      try {
        await rejectCommission(id).unwrap();
        refetchClient();
        refetchArtist();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn hủy bỏ yêu cầu vẽ này? Khoản tiền tạm giữ sẽ được trả lại.')) {
      try {
        await cancelCommission(id).unwrap();
        refetchClient();
        refetchArtist();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDeliveryFiles(e.target.files);
      const urls = [];
      for (let i = 0; i < e.target.files.length; i++) {
        urls.push(URL.createObjectURL(e.target.files[i]));
      }
      setDeliveryPreviews(urls);
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryError('');

    if (!deliveryFiles || deliveryFiles.length === 0) {
      setDeliveryError('Vui lòng chọn bức tranh hoàn thành để bàn giao!');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < deliveryFiles.length; i++) {
      formData.append('images', deliveryFiles[i]);
    }

    try {
      await completeCommission({ id: deliveryTargetId!, formData }).unwrap();
      setDeliveryTargetId(null);
      setDeliveryFiles(null);
      setDeliveryPreviews([]);
      refetchClient();
      refetchArtist();
    } catch (err: any) {
      console.error(err);
      setDeliveryError(err.data?.message || 'Có lỗi xảy ra khi bàn giao sản phẩm!');
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'var(--warning)';
      case 'accepted':
      case 'in_progress':
        return 'var(--primary)';
      case 'completed':
        return 'var(--success)';
      case 'rejected':
      case 'canceled':
      default:
        return 'var(--danger)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.statusPending;
      case 'accepted':
        return t.statusAccepted;
      case 'in_progress':
        return t.statusInProgress;
      case 'completed':
        return t.statusCompleted;
      case 'rejected':
        return t.statusRejected;
      case 'canceled':
        return t.statusCanceled;
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (pStatus: string) => {
    switch (pStatus) {
      case 'unpaid':
        return t.paymentUnpaid;
      case 'escrow':
        return t.paymentEscrow;
      case 'paid_to_artist':
        return t.paymentPaid;
      case 'refunded':
        return t.paymentRefunded;
      default:
        return pStatus;
    }
  };

  const handleTermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermsError('');
    setIsSubmittingTerms(true);

    if (!termsTitle.trim()) {
      setTermsError('Vui lòng điền tiêu đề điều khoản!');
      setIsSubmittingTerms(false);
      return;
    }
    if (!termsDetails.trim()) {
      setTermsError('Vui lòng điền chi tiết điều khoản!');
      setIsSubmittingTerms(false);
      return;
    }
    if (termsPrice <= 0) {
      setTermsError('Giá đề xuất phải lớn hơn 0!');
      setIsSubmittingTerms(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', termsTitle.trim());
    formData.append('details', termsDetails.trim());
    formData.append('targetPrice', String(termsPrice));
    if (termsBgFile) {
      formData.append('background', termsBgFile);
    }

    try {
      const updatedUser = await updateRequestTerms(formData).unwrap();
      dispatch(updateUser(updatedUser));
      setShowTermsModal(false);
      alert('Đã cập nhật Điều khoản đặt vẽ thành công!');
    } catch (err: any) {
      console.error(err);
      setTermsError(err.data?.message || 'Có lỗi xảy ra khi lưu điều khoản!');
    } finally {
      setIsSubmittingTerms(false);
    }
  };

  const handleTermsDelete = async () => {
    if (window.confirm('Bạn có chắc muốn xóa Điều khoản đặt vẽ? Bạn sẽ không thể nhận yêu cầu vẽ mới từ người dùng khác.')) {
      setTermsError('');
      setIsSubmittingTerms(true);
      try {
        const updatedUser = await deleteRequestTerms().unwrap();
        dispatch(updateUser(updatedUser));
        setShowTermsModal(false);
        // Khởi động lại các file/xem trước cục bộ
        setTermsBgFile(null);
        setTermsBgPreview('');
        alert('Đã xóa Điều khoản nhận vẽ thành công!');
      } catch (err: any) {
        console.error(err);
        setTermsError(err.data?.message || 'Có lỗi xảy ra khi xóa điều khoản!');
      } finally {
        setIsSubmittingTerms(false);
      }
    }
  };

  const activeCommissions =
    commTab === 'received' ? receivedCommissions : requestedCommissions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Tiêu đề chọn Tab */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {t.commissions}
        </h1>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Nút cấu hình điều khoản yêu cầu (Request Terms) */}
            <button
              onClick={() => setShowTermsModal(true)}
              className="btn btn-secondary"
              style={{
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.05)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
            >
              <Upload size={14} />
              {user.requestTerms?.hasTerms ? 'Thay đổi điều khoản' : 'Tạo điều khoản nhận vẽ'}
            </button>

            <div
              className="glass-panel"
              style={{
                display: 'flex',
                padding: '4px',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)',
              }}
            >
              <button
                onClick={() => setCommTab('received')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: commTab === 'received' ? 'var(--primary)' : 'transparent',
                  color: commTab === 'received' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Yêu cầu nhận vẽ ({receivedCommissions.length})
              </button>
              <button
                onClick={() => setCommTab('requested')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: commTab === 'requested' ? 'var(--primary)' : 'transparent',
                  color: commTab === 'requested' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Yêu cầu đã đặt ({requestedCommissions.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách các Commission chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {commTab === 'received' && !user?.requestTerms?.hasTerms ? (
          <div
            className="glass-panel animate-fade-in"
            style={{
              padding: '48px 32px',
              textAlign: 'center',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              maxWidth: '640px',
              margin: '24px auto',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '8px'
              }}
            >
              <Upload size={32} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Bắt đầu nhận đặt vẽ tranh kiếm thu nhập!</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '480px' }}>
              Hãy thiết lập ngay Điều khoản đặt vẽ (Request Terms) của riêng bạn. Người dùng khác sẽ dễ dàng xem mức giá đề xuất, điều kiện vẽ tranh của bạn và gửi yêu cầu đặt vẽ trực tiếp từ trang cá nhân của bạn!
            </p>
            <button
              onClick={() => setShowTermsModal(true)}
              className="btn btn-primary"
              style={{ borderRadius: '24px', padding: '12px 32px', fontSize: '15px', fontWeight: 700, marginTop: '8px' }}
            >
              Thiết lập điều khoản ngay
            </button>
          </div>
        ) : activeCommissions.length === 0 ? (
          <div
            style={{
              padding: '64px',
              textAlign: 'center',
              borderRadius: 'var(--border-radius-md)',
              border: '2px dashed var(--glass-border)',
              color: 'var(--text-muted)',
              fontSize: '15px',
            }}
          >
            Không tìm thấy yêu cầu vẽ tranh nào.
          </div>
        ) : (
          activeCommissions.map((comm) => {
            const partner =
              commTab === 'received'
                ? (comm.clientId as any)
                : (comm.artistId as any);

            return (
              <div
                key={comm._id}
                className="glass-panel animate-fade-in"
                style={{
                  padding: '24px 32px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  transition: 'transform var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {/* 1. Header: Chi tiết đối tác và nhãn trạng thái (Status tags) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={getImageUrl(partner?.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + partner?.username}
                      alt={partner?.nickname}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                        {commTab === 'received' ? 'Khách hàng (Client)' : 'Họa sĩ (Artist)'}
                      </span>
                      <span
                        onClick={() => navigate(`/portfolio/${partner?._id}`)}
                        style={{ fontSize: '15px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}
                      >
                        {partner?.nickname || partner?.username}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Nhãn trạng thái (Status Pill) */}
                    <span
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${getStatusColor(comm.status)}`,
                        color: getStatusColor(comm.status),
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px',
                      }}
                    >
                      {getStatusLabel(comm.status)}
                    </span>

                    {/* Nhãn thanh toán Escrow */}
                    <span
                      style={{
                        backgroundColor: comm.paymentStatus === 'escrow' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: comm.paymentStatus === 'escrow' ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                        color: comm.paymentStatus === 'escrow' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px',
                      }}
                    >
                      {getPaymentStatusLabel(comm.paymentStatus)}
                    </span>
                  </div>
                </div>

                {/* 2. Body Details: Tiêu đề, giá cả, hạn chót và mô tả ngắn */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }} className="commission-body-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{comm.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{comm.description}</p>
                    
                    {comm.isPrivate && (
                      <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <AlertCircle size={14} />
                        Khách hàng yêu cầu giữ kín tranh vẽ
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderLeft: '1px solid var(--glass-border)',
                      paddingLeft: '24px',
                      justifyContent: 'center',
                    }}
                    className="commission-price-column"
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                        Chi phí vẽ
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                        {formatVND(comm.price)}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                        Hạn bàn giao
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        {new Date(comm.deadline).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Footer: Các hành động quy trình (Workflow actions) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '20px',
                  }}
                >
                  {/* Các hành động của Artist */}
                  {commTab === 'received' && (
                    <>
                      {comm.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReject(comm._id)}
                            className="btn btn-secondary"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '20px' }}
                          >
                            <XIcon size={16} />
                            {t.rejectBtn}
                          </button>
                          <button
                            onClick={() => handleAccept(comm._id)}
                            className="btn btn-primary"
                            style={{ borderRadius: '20px' }}
                          >
                            <Check size={16} />
                            {t.acceptBtn}
                          </button>
                        </>
                      )}

                      {(comm.status === 'accepted' || comm.status === 'in_progress') && (
                        <>
                          <button
                            onClick={() => handleCancel(comm._id)}
                            className="btn btn-secondary"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '20px' }}
                          >
                            {t.cancelBtn}
                          </button>
                          <button
                            onClick={() => setDeliveryTargetId(comm._id)}
                            className="btn btn-accent"
                            style={{ borderRadius: '20px' }}
                          >
                            <Upload size={16} />
                            {t.completeBtn}
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* Các hành động của Client */}
                  {commTab === 'requested' && (
                    <>
                      {comm.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(comm._id)}
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '20px' }}
                        >
                          {t.cancelBtn}
                        </button>
                      )}

                      {comm.status === 'completed' && comm.resultIllustrationId && (
                        <button
                          onClick={() => navigate(`/artwork/${(comm.resultIllustrationId as any)._id || comm.resultIllustrationId}`)}
                          className="btn btn-primary"
                          style={{ borderRadius: '20px' }}
                        >
                          <Eye size={16} />
                          {t.commissionResult}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Popup Modal bàn giao tác phẩm đã hoàn thành */}
      {deliveryTargetId && (
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
              padding: '32px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{t.uploadDelivery}</h2>
              <button
                onClick={() => setDeliveryTargetId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {deliveryError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--danger)',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                {deliveryError}
              </div>
            )}

            <form onSubmit={handleDeliverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '32px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  background: 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                  required
                />
                <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Tải tranh đã hoàn thiện lên</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Chấp nhận các file định dạng JPEG, PNG, WEBP tối đa 10MB
                </p>
              </div>

              {/* Xem trước (Previews) */}
              {deliveryPreviews.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {deliveryPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <img src={url} alt="delivery preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setDeliveryTargetId(null)}
                  className="btn btn-secondary"
                  disabled={isCompleting}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCompleting}>
                  <Check size={16} />
                  {isCompleting ? 'Đang bàn giao...' : 'Xác nhận bàn giao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal thiết lập điều khoản yêu cầu (Request Terms) */}
      {showTermsModal && (
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
              maxWidth: '560px',
              width: '100%',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {/* Header của Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 32px',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
                {user?.requestTerms?.hasTerms ? 'Cập nhật điều khoản nhận vẽ' : 'Tạo điều khoản nhận vẽ'}
              </h2>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Body của Modal */}
            <form onSubmit={handleTermsSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {termsError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {termsError}
                </div>
              )}

              {/* Tải lên ảnh bìa (Phong cách hình nền Pixiv) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Ảnh bìa Điều khoản (Cover Background) *</label>
                <div
                  style={{
                    height: '140px',
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-tertiary)',
                    position: 'relative',
                    backgroundImage: termsBgPreview
                      ? `url(${termsBgPreview.startsWith('blob') || termsBgPreview.startsWith('http') ? termsBgPreview : `${((import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000')}${termsBgPreview}`})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(10, 11, 16, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <label
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(10, 11, 16, 0.75)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <Upload size={14} />
                      Tải ảnh nền
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setTermsBgFile(file);
                            setTermsBgPreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Tiêu đề */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Tiêu đề Điều khoản *</label>
                <input
                  type="text"
                  className="glass-input"
                  value={termsTitle}
                  onChange={(e) => setTermsTitle(e.target.value)}
                  placeholder="Nhận vẽ tranh chân dung, phong cảnh chất lượng cao..."
                  required
                />
              </div>

              {/* Chi tiết */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Chi tiết điều khoản (Điều kiện, thời gian vẽ...) *</label>
                <textarea
                  className="glass-input"
                  rows={5}
                  value={termsDetails}
                  onChange={(e) => setTermsDetails(e.target.value)}
                  placeholder="Mô tả chi tiết những gì bạn đồng ý nhận vẽ, thời gian trung bình hoàn thành, phong cách vẽ hoặc các yêu cầu cụ thể khác..."
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              {/* Giá cả */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Giá khởi điểm mong muốn (VND ₫) *</label>
                <input
                  type="number"
                  className="glass-input"
                  value={termsPrice}
                  onChange={(e) => setTermsPrice(Number(e.target.value))}
                  min={50000}
                  step={50000}
                  required
                />
              </div>

              {/* Các nút hành động */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '20px',
                  marginTop: '12px',
                }}
              >
                {/* Nút xóa (chỉ khi đã có điều khoản sẵn) */}
                {user?.requestTerms?.hasTerms ? (
                  <button
                    type="button"
                    onClick={handleTermsDelete}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '20px' }}
                    disabled={isSubmittingTerms}
                  >
                    Xóa điều khoản
                  </button>
                ) : (
                  <div></div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(false)}
                    className="btn btn-secondary"
                    disabled={isSubmittingTerms}
                  >
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingTerms}>
                    {isSubmittingTerms ? 'Đang lưu...' : 'Lưu điều khoản'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
