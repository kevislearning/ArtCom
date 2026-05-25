import { Bookmark, Compass } from 'lucide-react';
import { useGetBookmarkedIllustrationsQuery } from '../store/illustrationApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import { translations } from '../utils/translation';

export const Bookmarks = () => {
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // Fetch bookmarked illustrations
  const { data: artworks = [], isLoading, refetch } = useGetBookmarkedIllustrationsQuery();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bookmark size={28} style={{ color: 'var(--accent)' }} />
            {language === 'vn' ? 'Bộ sưu tập của tôi' : 'My Saved Bookmarks'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {language === 'vn'
              ? 'Lưu trữ và xem lại các bức tranh nghệ thuật ấn tượng nhất mà bạn đã đánh dấu lưu.'
              : 'Save and review the most impressive artworks you have bookmarked in the community.'}
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

      {/* Grid of Results */}
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
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Bookmark size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {language === 'vn' ? 'Bộ sưu tập trống' : 'Empty collection'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.6' }}>
            {language === 'vn'
              ? 'Bạn chưa đánh dấu lưu bất kỳ bức tranh nào. Hãy đi khám phá những tác phẩm yêu thích của cộng đồng nghệ sĩ nhé!'
              : 'You have not bookmarked any artworks yet. Explore and save your favorite artist creations!'}
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
