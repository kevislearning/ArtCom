import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Users, Compass } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetFollowedFeedQuery } from '../store/illustrationApi';
import { ArtworkCard } from '../components/ArtworkCard';

export const Following = () => {
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Lấy danh sách các bài đăng từ những người đang theo dõi (followed feed)
  const { data: artworks = [], isLoading, refetch } = useGetFollowedFeedQuery();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header của trang */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} style={{ color: 'var(--primary)' }} />
            {t.followedNewest}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Cập nhật các tác phẩm mới nhất từ những người dùng mà bạn đang quan tâm theo dõi.
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
          style={{ borderRadius: '24px', padding: '8px 20px', fontSize: '13px' }}
        >
          Làm mới
        </button>
      </div>

      {/* Lưới hiển thị kết quả */}
      {isLoading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
      ) : artworks.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'var(--glass-bg)',
            boxShadow: 'var(--card-shadow)',
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
            }}
          >
            <Users size={32} />
          </div>
          
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Chưa có tác phẩm nào hiển thị
          </h2>
          
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px', lineHeight: '1.6' }}>
            Bạn chưa nhấn theo dõi người dùng nào hoặc những người dùng bạn theo dõi hiện chưa đăng tải bài đăng công khai nào. Hãy khám phá và ủng hộ các thành viên tài năng trong cộng đồng nhé!
          </p>
          
          <button
            onClick={() => navigate('/explore')}
            className="btn btn-primary"
            style={{
              borderRadius: '24px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <Compass size={16} />
            Khám phá tác phẩm nghệ thuật
          </button>
        </div>
      ) : (
        <div className="masonry-grid animate-fade-in">
          {artworks.map((artwork) => (
            <ArtworkCard key={artwork._id} artwork={artwork} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Following;
