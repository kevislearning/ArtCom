import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, Clock, ChevronRight, Users } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetIllustrationsQuery, useGetTrendingTagsQuery } from '../store/illustrationApi';
import { useGetRecommendedArtistsQuery } from '../store/authApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { getImageUrl } from '../utils/url';


export const Home = () => {
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Queries
  const { data: popularArtworks = [], isLoading: loadingPopular } = useGetIllustrationsQuery({
    sort: 'popular',
  });

  const { data: newestArtworks = [], isLoading: loadingNewest } = useGetIllustrationsQuery({
    sort: 'newest',
  });

  const { data: trendingTags = [] } = useGetTrendingTagsQuery();
  const { data: recommendedArtists = [] } = useGetRecommendedArtistsQuery();

  const handleTagClick = (tagName: string) => {
    navigate(`/explore?tag=${encodeURIComponent(tagName)}`);
  };

  const trendingRecommendation = popularArtworks[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', width: '100%' }}>
      {/* 1. Hero Recommendation Section */}
      {trendingRecommendation && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'relative',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
            height: '420px',
            display: 'flex',
            alignItems: 'flex-end',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Main visual display cover */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${(import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000'}${trendingRecommendation.imageUrls[0]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.55)',
            }}
          />

          <div
            style={{
              position: 'relative',
              padding: '48px',
              color: '#ffffff',
              maxWidth: '720px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--primary)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
                boxShadow: '0 0 16px var(--primary-glow)',
              }}
            >
              <Sparkles size={14} />
              {t.recommended}
            </div>

            <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {trendingRecommendation.title}
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {trendingRecommendation.description || 'Không có mô tả chi tiết cho tác phẩm nghệ thuật này.'}
            </p>

            <button
              onClick={() => navigate(`/artwork/${trendingRecommendation._id}`)}
              className="btn btn-primary"
              style={{ padding: '12px 28px', borderRadius: '24px', fontSize: '15px' }}
            >
              Xem chi tiết tác phẩm
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Recommended Artists Section */}
      {recommendedArtists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} style={{ color: 'var(--primary)' }} />
            Họa sĩ đề cử
          </h2>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
            }}
            className="hide-scrollbar"
          >
            {recommendedArtists.map((artist) => (
              <div
                key={artist._id}
                onClick={() => navigate(`/portfolio/${artist._id}`)}
                className="glass-panel"
                style={{
                  minWidth: '220px',
                  maxWidth: '220px',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: 'var(--card-shadow)',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                }}
              >
                <img
                  src={getImageUrl(artist.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + artist.username}
                  alt={artist.nickname}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--glass-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                
                <div style={{ width: '100%' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {artist.nickname}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '4px 0 0 0' }}>
                    @{artist.username}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 700,
                  }}
                >
                  <span>{artist.totalLikes || 0} Thích</span>
                  <span style={{ color: 'var(--glass-border)' }}>|</span>
                  <span>{artist.totalViews || 0} Xem</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Tag Carousel */}
      {trendingTags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            {t.trendingTags}
          </h2>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
            }}
            className="hide-scrollbar"
          >
            {trendingTags.map((tagObj) => (
              <button
                key={tagObj._id}
                onClick={() => handleTagClick(tagObj._id)}
                className="btn btn-secondary glass-panel"
                style={{
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                #{tagObj._id}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  ({tagObj.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Popular/Ranking Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} style={{ color: 'var(--warning)' }} />
            {t.popularRankings}
          </h2>
          <button
            onClick={() => navigate('/explore?sort=popular')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Xem tất cả
            <ChevronRight size={16} />
          </button>
        </div>

        {loadingPopular ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : popularArtworks.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.noWorks}</div>
        ) : (
          <div className="masonry-grid">
            {popularArtworks.slice(0, 4).map((artwork) => (
              <ArtworkCard key={artwork._id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>

      {/* 4. Newest Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={22} style={{ color: 'var(--primary)' }} />
            {t.newestWorks}
          </h2>
          <button
            onClick={() => navigate('/explore?sort=newest')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Xem tất cả
            <ChevronRight size={16} />
          </button>
        </div>

        {loadingNewest ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : newestArtworks.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.noWorks}</div>
        ) : (
          <div className="masonry-grid">
            {newestArtworks.slice(0, 8).map((artwork) => (
              <ArtworkCard key={artwork._id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
