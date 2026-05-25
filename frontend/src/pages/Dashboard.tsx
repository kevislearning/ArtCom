import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Eye,
  Heart,
  Bookmark,
  Image as ImageIcon,
  Trash2,
  Calendar,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import type { RootState } from '../store';
import { useGetPublicProfileQuery } from '../store/authApi';
import {
  useGetIllustrationsQuery,
  useDeleteIllustrationMutation,
  useUpdateIllustrationMutation,
} from '../store/illustrationApi';
import { translations } from '../utils/translation';

export const Dashboard = () => {
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Queries
  const { data: profile } = useGetPublicProfileQuery(user?._id || '', {
    skip: !user?._id,
  });

  const { data: artworks = [], isLoading, refetch } = useGetIllustrationsQuery(
    { artistId: user?._id },
    { skip: !user?._id }
  );

  const [deleteIllustration, { isLoading: isDeleting }] = useDeleteIllustrationMutation();
  const [updateIllustration] = useUpdateIllustrationMutation();

  const currentProfile = profile || user;

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tác phẩm "${title}" vĩnh viễn?`)) {
      setErrorMessage('');
      setSuccessMessage('');
      try {
        await deleteIllustration(id).unwrap();
        setSuccessMessage(`Đã xóa tác phẩm "${title}" thành công.`);
        refetch();
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi xóa tác phẩm.');
      }
    }
  };

  const handleVisibilityChange = async (id: string, newVisibility: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      setEditingId(id);
      await updateIllustration({ id, visibility: newVisibility }).unwrap();
      setSuccessMessage('Đã cập nhật trạng thái hiển thị của tác phẩm thành công.');
      refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái hiển thị.');
    } finally {
      setEditingId(null);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return <Lock size={14} style={{ color: 'var(--danger)' }} />;
      case 'logged_in':
        return <Users size={14} style={{ color: 'var(--accent)' }} />;
      case 'everyone':
      default:
        return <Globe size={14} style={{ color: 'var(--success)' }} />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return language === 'vn' ? 'Riêng tư' : 'Private';
      case 'logged_in':
        return language === 'vn' ? 'Chỉ thành viên' : 'Members Only';
      case 'everyone':
      default:
        return language === 'vn' ? 'Công khai' : 'Everyone';
    }
  };

  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutDashboard size={28} style={{ color: 'var(--primary)' }} />
          {language === 'vn' ? 'Trang quản trị & Thống kê' : 'User Analytics Dashboard'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {language === 'vn'
            ? 'Theo dõi hiệu suất tương tác các tác phẩm và quản lý bài đăng sáng tác cá nhân.'
            : 'Track the performance of your artworks and manage your personal publications.'}
        </p>
      </div>

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

      {/* Statistics Analytics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
        }}
        className="wallet-grid"
      >
        {/* Card 1: Total Works */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '24px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <ImageIcon size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {language === 'vn' ? 'Tổng tác phẩm' : 'Total Artworks'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {artworks.length}
            </h3>
          </div>
        </div>

        {/* Card 2: Total Views */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '24px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Eye size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {language === 'vn' ? 'Tổng lượt xem' : 'Total Views'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currentProfile?.totalViews || 0}
            </h3>
          </div>
        </div>

        {/* Card 3: Total Likes */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '24px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
            }}
          >
            <Heart size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {language === 'vn' ? 'Tổng lượt thích' : 'Total Likes'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currentProfile?.totalLikes || 0}
            </h3>
          </div>
        </div>

        {/* Card 4: Total Bookmarks */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '24px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)',
            }}
          >
            <Bookmark size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {language === 'vn' ? 'Tổng lượt lưu' : 'Total Bookmarks'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currentProfile?.totalBookmarks || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Artworks Management List */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          padding: '32px',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--glass-border)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={18} style={{ color: 'var(--primary)' }} />
          {language === 'vn' ? 'Quản lý danh sách tác phẩm' : 'Manage Personal Artworks'}
        </h2>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : artworks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {language === 'vn' ? 'Bạn chưa tải lên tác phẩm nào.' : 'You have not uploaded any artworks yet.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{language === 'vn' ? 'Tác phẩm' : 'Artwork'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{language === 'vn' ? 'Ngày đăng' : 'Publish Date'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{language === 'vn' ? 'Trạng thái hiển thị' : 'Visibility'}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}><Eye size={15} /></th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}><Heart size={15} /></th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}><Bookmark size={15} /></th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{language === 'vn' ? 'Hành động' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {artworks.map((art) => (
                  <tr
                    key={art._id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      fontSize: '14px',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Thumbnail & Title */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', backgroundColor: '#000000', flexShrink: 0 }}>
                          <img
                            src={art.imageUrls[0]?.startsWith('http') ? art.imageUrls[0] : `${API_BASE_URL}${art.imageUrls[0]}`}
                            alt={art.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {art.title}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} />
                        {new Date(art.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    {/* Visibility Dropdown edit */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getVisibilityIcon(art.visibility)}
                        <select
                          className="glass-input"
                          value={art.visibility}
                          onChange={(e) => handleVisibilityChange(art._id, e.target.value)}
                          disabled={editingId === art._id}
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="everyone">{getVisibilityLabel('everyone')}</option>
                          <option value="logged_in">{getVisibilityLabel('logged_in')}</option>
                          <option value="private">{getVisibilityLabel('private')}</option>
                        </select>
                      </div>
                    </td>

                    {/* Individual interactions */}
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>{art.viewsCount || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--danger)' }}>{art.likesCount || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--warning)' }}>{art.bookmarksCount || 0}</td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(art._id, art.title)}
                        className="btn"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          padding: '6px 12px',
                          borderRadius: '12px',
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
