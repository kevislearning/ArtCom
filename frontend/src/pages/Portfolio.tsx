import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Mail,
  UserPlus,
  Briefcase,
  Award,
  X,
} from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetPublicProfileQuery } from '../store/authApi';
import { useGetIllustrationsQuery } from '../store/illustrationApi';
import { useToggleFollowMutation, useCheckFollowStatusQuery } from '../store/followApi';
import { useCreateCommissionMutation } from '../store/commissionApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { getImageUrl } from '../utils/url';


export const Portfolio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Tab State
  const [activeTab, setActiveTab] = useState<'works' | 'likes' | 'bookmarks'>('works');
  
  // Commission Modal State
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [commTitle, setCommTitle] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commPrice, setCommPrice] = useState(100000); // 100k VND base
  const [commDeadline, setCommDeadline] = useState('');
  const [commPrivate, setCommPrivate] = useState(false);
  const [commError, setCommError] = useState('');

  // Queries
  const { data: profileUser, isLoading: loadingProfile } = useGetPublicProfileQuery(id || '');

  const { data: artworks = [], isLoading: loadingArtworks } = useGetIllustrationsQuery({
    artistId: id,
  });

  const { data: followData = { followed: false } } = useCheckFollowStatusQuery(id || '', {
    skip: !id || !user || id === user._id,
  });

  const [toggleFollow] = useToggleFollowMutation();
  const [createCommission, { isLoading: isSubmittingCommission }] = useCreateCommissionMutation();

  const handleFollowToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await toggleFollow(id!).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/messenger?userId=${id}`);
  };

  const handleCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommError('');

    if (!commTitle.trim()) {
      setCommError('Vui lòng điền tiêu đề yêu cầu!');
      return;
    }
    if (!commDesc.trim()) {
      setCommError('Vui lòng mô tả yêu cầu vẽ (Brief)!');
      return;
    }
    if (commPrice <= 0) {
      setCommError('Số tiền đề xuất phải lớn hơn 0!');
      return;
    }
    if (!commDeadline) {
      setCommError('Vui lòng chọn hạn chót hoàn thành!');
      return;
    }

    try {
      await createCommission({
        artistId: id!,
        title: commTitle.trim(),
        description: commDesc.trim(),
        price: commPrice,
        deadline: commDeadline,
        isPrivate: commPrivate,
      }).unwrap();
      
      setShowCommissionModal(false);
      // Reset
      setCommTitle('');
      setCommDesc('');
      setCommPrice(100000);
      setCommDeadline('');
      setCommPrivate(false);
      alert('Đã gửi yêu cầu vẽ tranh và tạm giữ tiền thành công!');
      navigate('/commissions');
    } catch (err: any) {
      console.error(err);
      setCommError(err.data?.message || 'Không đủ số dư ví hoặc có lỗi xảy ra!');
    }
  };

  if (loadingProfile) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>;
  }

  if (!profileUser) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--danger)' }}>
        Không tìm thấy hồ sơ người dùng.
      </div>
    );
  }

  const isMe = user && user._id === profileUser._id;
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

  const displayedWorks = artworks.filter(() => {
    if (activeTab === 'works') {
      return true;
    }
    // For simplicity, likes/bookmarks tabs can be shown if denormalized or populated,
    // let's just show artist's created works in this grid for academic simplicity,
    // or let's display a message if tab is empty.
    return false;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* 1. Cover Banner & Avatar Header */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          position: 'relative',
        }}
      >
        {/* Banner Cover */}
        <div
          style={{
            height: '240px',
            backgroundColor: 'var(--bg-tertiary)',
            backgroundImage: profileUser.bannerUrl
              ? `url(${profileUser.bannerUrl.startsWith('http') ? profileUser.bannerUrl : `${API_BASE_URL}${profileUser.bannerUrl}`})`
              : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Profile Details Overlay Section */}
        <div
          style={{
            padding: '32px',
            marginTop: '-64px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            position: 'relative',
            zIndex: 10,
          }}
          className="portfolio-details-header"
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar Frame */}
            <img
              src={getImageUrl(profileUser.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profileUser.username}
              alt={profileUser.nickname}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--bg-secondary)',
                boxShadow: 'var(--card-shadow)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            />

            <div style={{ paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{profileUser.nickname}</h2>
                {profileUser.requestTerms?.hasTerms && (
                  <span
                    style={{
                      backgroundColor: 'var(--success)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Award size={12} />
                    {language === 'en' ? 'Open for Commission' : 'Nhận đặt vẽ'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>@{profileUser.username}</p>
            </div>
          </div>

          {/* Action triggers */}
          <div style={{ display: 'flex', gap: '12px', paddingBottom: '8px' }}>
            {!isMe && (
              <>
                <button
                  onClick={handleFollowToggle}
                  className={`btn ${followData.followed ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                >
                  <UserPlus size={16} />
                  {followData.followed ? t.unfollow : t.follow}
                </button>
                <button
                  onClick={handleCreateChat}
                  className="btn btn-secondary"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                >
                  <Mail size={16} />
                  Nhắn tin
                </button>
                {profileUser.requestTerms?.hasTerms && (
                  <button
                    onClick={() => {
                      if (!user) navigate('/login');
                      else setShowTermsPopup(true);
                    }}
                    className="btn btn-accent"
                    style={{ borderRadius: '20px', padding: '10px 24px' }}
                  >
                    <Briefcase size={16} />
                    {language === 'en' ? 'View Request Terms' : 'Xem ĐK nhận vẽ'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* User Bio and Stats details */}
        <div
          style={{
            padding: '0 32px 32px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '32px',
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '24px',
          }}
          className="portfolio-bio-grid"
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>{t.bio}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {profileUser.bio || 'Người dùng này chưa viết lời giới thiệu trang cá nhân.'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                {artworks.length}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Tác phẩm
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                {profileUser.totalLikes || 0}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Yêu thích
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Portfolio Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <button
            onClick={() => setActiveTab('works')}
            style={{
              background: 'none',
              border: 'none',
              padding: '16px 24px',
              cursor: 'pointer',
              color: activeTab === 'works' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '15px',
              borderBottom: activeTab === 'works' ? '2px solid var(--primary)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t.portfolio} ({artworks.length})
          </button>
        </div>

        {/* Tab display Grid */}
        {loadingArtworks ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : activeTab === 'works' && displayedWorks.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.noWorks}</div>
        ) : activeTab === 'works' ? (
          <div className="masonry-grid">
            {displayedWorks.map((artwork) => (
              <ArtworkCard key={artwork._id} artwork={artwork} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>Chức năng đang được tích hợp thêm.</div>
        )}
      </div>

      {/* Commission Request Popup Modal */}
      {showCommissionModal && (
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
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 32px',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{t.newRequest}</h2>
              <button
                onClick={() => setShowCommissionModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCommissionSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {commError && (
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
                  {commError}
                </div>
              )}

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestTitle} *</label>
                <input
                  type="text"
                  className="glass-input"
                  value={commTitle}
                  onChange={(e) => setCommTitle(e.target.value)}
                  placeholder="Vẽ chân dung anime cho tôi..."
                  required
                />
              </div>

              {/* Description (Brief) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestDesc} *</label>
                <textarea
                  className="glass-input"
                  rows={4}
                  value={commDesc}
                  onChange={(e) => setCommDesc(e.target.value)}
                  placeholder="Mô tả chi tiết kiểu dáng, màu sắc, bối cảnh nhân vật..."
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              {/* Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestPrice} *</label>
                <input
                  type="number"
                  className="glass-input"
                  value={commPrice}
                  onChange={(e) => setCommPrice(Number(e.target.value))}
                  min={50000}
                  step={50000}
                  required
                />
              </div>

              {/* Deadline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestDeadline} *</label>
                <input
                  type="date"
                  className="glass-input"
                  value={commDeadline}
                  onChange={(e) => setCommDeadline(e.target.value)}
                  required
                />
              </div>

              {/* Private Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="commPrivate"
                  checked={commPrivate}
                  onChange={(e) => setCommPrivate(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="commPrivate" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  {t.isPrivateRequest}
                </label>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '20px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingCommission}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCommission}>
                  <Briefcase size={16} />
                  {isSubmittingCommission ? 'Đang thực hiện...' : t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pixiv-inspired Request Terms View Popup Modal */}
      {showTermsPopup && profileUser?.requestTerms?.hasTerms && (
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
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 1. Cover Header Section */}
            <div
              style={{
                height: '180px',
                backgroundColor: 'var(--bg-tertiary)',
                backgroundImage: profileUser.requestTerms.backgroundUrl
                  ? `url(${profileUser.requestTerms.backgroundUrl.startsWith('http') ? profileUser.requestTerms.backgroundUrl : `${API_BASE_URL}${profileUser.requestTerms.backgroundUrl}`})`
                  : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(10, 11, 16, 0.6)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              {/* Avatar Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-32px',
                  left: '32px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '12px'
                }}
              >
                <img
                  src={getImageUrl(profileUser.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profileUser.username}
                  alt={profileUser.nickname}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--bg-secondary)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>
            </div>

            {/* 2. Details Content Section */}
            <div
              style={{
                padding: '48px 32px 32px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--primary)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Điều khoản đặt vẽ tranh
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profileUser.requestTerms.title}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  bởi @{profileUser.username}
                </span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '16px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {profileUser.requestTerms.details}
              </div>

              {/* Target price display banner */}
              <div
                style={{
                  backgroundColor: 'rgba(20, 184, 166, 0.05)',
                  border: '1px solid rgba(20, 184, 166, 0.1)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Giá khởi điểm tối thiểu đề xuất:
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(profileUser.requestTerms.targetPrice)}
                </span>
              </div>
            </div>

            {/* 3. Action Footer Section */}
            <div
              style={{
                padding: '20px 32px',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <button
                onClick={() => setShowTermsPopup(false)}
                className="btn btn-secondary"
                style={{ borderRadius: '20px' }}
              >
                Đóng lại
              </button>
              <button
                onClick={() => {
                  setShowTermsPopup(false);
                  setShowCommissionModal(true);
                }}
                className="btn btn-accent"
                style={{ borderRadius: '20px', padding: '10px 28px' }}
              >
                <Briefcase size={16} />
                Đặt vẽ tranh ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
