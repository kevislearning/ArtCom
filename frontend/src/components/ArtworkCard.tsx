import { useNavigate } from 'react-router-dom';
import { Heart, Bookmark, Eye } from 'lucide-react';
import type { Illustration } from '../types';
import { useToggleLikeMutation, useToggleBookmarkMutation } from '../store/illustrationApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getImageUrl } from '../utils/url';


interface ArtworkCardProps {
  artwork: Illustration;
  rank?: number;
}

export const ArtworkCard = ({ artwork, rank }: ArtworkCardProps) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [toggleLike, { isLoading: isLiking }] = useToggleLikeMutation();
  const [toggleBookmark, { isLoading: isBookmarking }] = useToggleBookmarkMutation();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (isLiking) return;
    try {
      await toggleLike(artwork._id).unwrap();
    } catch (err) {
      console.error('Like toggle failed', err);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (isBookmarking) return;
    try {
      await toggleBookmark(artwork._id).unwrap();
    } catch (err) {
      console.error('Bookmark toggle failed', err);
    }
  };

  const artist = typeof artwork.artistId === 'object' ? artwork.artistId : null;
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';
  const imageUrl = artwork.imageUrls[0]?.startsWith('http')
    ? artwork.imageUrls[0]
    : `${API_BASE_URL}${artwork.imageUrls[0]}`;

  return (
    <div
      onClick={() => navigate(`/artwork/${artwork._id}`)}
      className="glass-card animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--border-radius-md)',
        cursor: 'pointer',
        height: '360px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Hình ảnh artwork nền */}
      <img
        src={imageUrl}
        alt={artwork.title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform var(--transition-slow)',
        }}
        className="artwork-card-img"
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />

      {/* Nhãn tag floating/cờ private */}
      {artwork.visibility === 'private' && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'var(--danger)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
          }}
        >
          Riêng tư
        </span>
      )}

      {/* Huy hiệu xếp hạng nổi (Floating Rank Badge) */}
      {rank !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background:
              rank === 1
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' // Vàng (Gold)
                : rank === 2
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' // Bạc (Silver)
                : rank === 3
                ? 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' // Đồng (Bronze)
                : 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--glass-border) 100%)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          Top {rank}
        </span>
      )}

      {/* Khay thông tin chi tiết hiển thị khi hover */}
      <div
        className="artwork-overlay"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(10, 11, 16, 0.95) 100%)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '160px',
          transition: 'opacity var(--transition-normal)',
          color: '#ffffff',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 800,
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          {artwork.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Chi tiết artist */}
          {artist && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/portfolio/${artist._id}`);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}
            >
              <img
                src={getImageUrl(artist.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + artist.username}
                alt={artist.nickname}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                {artist.nickname}
              </span>
            </div>
          )}

          {/* Thống kê & Hành động */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              <Eye size={14} />
              {artwork.viewsCount || 0}
            </span>

            <button
              onClick={handleLike}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: artwork.liked ? 'var(--danger)' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                padding: 0,
                transition: 'transform var(--transition-fast)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Heart size={16} fill={artwork.liked ? 'var(--danger)' : 'none'} />
              <span>{artwork.likesCount || 0}</span>
            </button>

            <button
              onClick={handleBookmark}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: artwork.bookmarked ? 'var(--accent)' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                padding: 0,
                transition: 'transform var(--transition-fast)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Bookmark size={16} fill={artwork.bookmarked ? 'var(--accent)' : 'none'} />
              <span>{artwork.bookmarksCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
