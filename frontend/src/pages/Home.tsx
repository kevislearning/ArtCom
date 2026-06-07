import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, Clock, ChevronRight } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetIllustrationsQuery, useGetTrendingTagsQuery } from '../store/illustrationApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { HomePostCard } from '../components/HomePostCard';
import type { Illustration } from '../types';


const PostCardSkeleton = () => (
  <div
    className="glass-panel"
    style={{
      borderRadius: 'var(--border-radius-md)',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      width: '100%',
      animation: 'skeleton-pulse 1.8s infinite ease-in-out',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--card-shadow)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ width: '120px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <div style={{ width: '70px', height: '10px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.02)' }} />
      </div>
    </div>
    <div style={{ height: '400px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'rgba(255,255,255,0.02)' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ width: '45%', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
      <div style={{ width: '80%', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.02)' }} />
    </div>
  </div>
);

export const Home = () => {
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Infinite scroll states
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<Illustration[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Queries
  const { data: popularArtworks = [], isLoading: loadingPopular } = useGetIllustrationsQuery({
    sort: 'popular',
  });

  const { data: trendingTags = [] } = useGetTrendingTagsQuery();

  const { data: paginatedPosts, isFetching, isLoading: loadingNewest } = useGetIllustrationsQuery({
    sort: 'newest',
    page,
    limit: 6,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Append new posts to state
  useEffect(() => {
    if (paginatedPosts) {
      if (paginatedPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));
          const newItems = paginatedPosts.filter((p) => !existingIds.has(p._id));
          if (paginatedPosts.length < 6) {
            setHasMore(false);
          }
          return [...prev, ...newItems];
        });
      }
    }
  }, [paginatedPosts]);

  // Observer trigger for infinite scroll
  useEffect(() => {
    if (loadingNewest || isFetching || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadingNewest, isFetching, hasMore]);

  const handleTagClick = (tagName: string) => {
    navigate(`/explore?tag=${encodeURIComponent(tagName)}`);
  };

  const trendingRecommendation = popularArtworks[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', width: '100%' }}>
      {/* 1. Phần đề xuất nổi bật (Hero Recommendation) */}
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
          {/* Ảnh bìa hiển thị trực quan chính */}
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



      {/* 2. Băng chuyền hiển thị thẻ (Tag Carousel) */}
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

      {/* 3. Lưới hiển thị tác phẩm phổ biến/xếp hạng */}
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

      {/* 4. Dòng thời gian hiển thị các tác phẩm mới nhất dưới dạng social post feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        <style>{`
          @keyframes skeleton-pulse {
            0% { opacity: 0.35; }
            50% { opacity: 0.7; }
            100% { opacity: 0.35; }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={22} style={{ color: 'var(--primary)' }} />
            {t.newestWorks}
          </h2>
        </div>

        {posts.map((artwork) => (
          <HomePostCard key={artwork._id} artwork={artwork} />
        ))}

        {/* loading indicator/ skeletons */}
        {loadingNewest && page === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        )}

        {isFetching && page > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', marginTop: '12px' }}>
            <PostCardSkeleton />
          </div>
        )}

        {/* Sentinel element to trigger scroll loading */}
        {hasMore && !loadingNewest && !isFetching && (
          <div ref={sentinelRef} style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        )}

        {/* No more content alert */}
        {!hasMore && posts.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              borderTop: '1px dashed var(--glass-border)',
              marginTop: '12px',
            }}
          >
            {language === 'vn' ? '🎉 Bạn đã xem hết tất cả các tác phẩm mới nhất!' : "🎉 You've reached the end of the newest works feed!"}
          </div>
        )}

        {/* Empty list representation */}
        {!loadingNewest && posts.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t.noWorks}
          </div>
        )}
      </div>
    </div>
  );
};
