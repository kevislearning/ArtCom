import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, ChevronRight } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetIllustrationsQuery, useGetTrendingTagsQuery } from '../store/illustrationApi';
import { HomePostCard } from '../components/HomePostCard';
import { getImageUrl } from '../utils/url';
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

  // Các trạng thái cuộn vô hạn (Infinite scroll states)
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<Illustration[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Các truy vấn (Queries)
  const { data: popularArtworks = [] } = useGetIllustrationsQuery({
    sort: 'popular',
  });

  const { data: trendingTags = [] } = useGetTrendingTagsQuery();

  const { data: paginatedPosts, isFetching, isLoading: loadingNewest } = useGetIllustrationsQuery({
    sort: 'newest',
    page,
    limit: 6,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Thêm các bài viết mới vào trạng thái (state)
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

  // Bộ kích hoạt Observer cho cuộn vô hạn (Observer trigger for infinite scroll)
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

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (popularArtworks.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(5, popularArtworks.length));
    }, 5000);
    return () => clearInterval(interval);
  }, [popularArtworks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', width: '100%' }}>
      {/* 1. Phần đề xuất nổi bật (Top 5 Bảng xếp hạng Carousel) */}
      {popularArtworks.length > 0 && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'relative',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
            height: '420px',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {popularArtworks.slice(0, 5).map((artwork, idx) => {
            const isActive = idx === currentSlide;
            return (
              <div
                key={artwork._id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                  transition: 'opacity 0.8s ease-in-out',
                  display: 'flex',
                  alignItems: 'flex-end',
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
                    backgroundImage: `url(${getImageUrl(artwork.imageUrls[0])})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.5)',
                  }}
                />

                {/* Phủ gradient tối dưới chữ để dễ đọc */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '70%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />

                {/* Các nút mũi tên điều hướng Banner Carousel */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + Math.min(5, popularArtworks.length)) % Math.min(5, popularArtworks.length));
                  }}
                  className="carousel-nav-btn prev"
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 12,
                    opacity: 0,
                    transition: 'opacity 0.3s ease, background 0.3s ease',
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % Math.min(5, popularArtworks.length));
                  }}
                  className="carousel-nav-btn next"
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 12,
                    opacity: 0,
                    transition: 'opacity 0.3s ease, background 0.3s ease',
                  }}
                >
                  ›
                </button>

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
                      backgroundColor: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : 'var(--primary)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '16px',
                      boxShadow: '0 0 16px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <Trophy size={14} style={{ color: idx === 0 ? '#ffd700' : '#ffffff' }} />
                    {language === 'vn' ? `Hạng #${idx + 1}` : `Rank #${idx + 1}`}
                  </div>

                  <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {artwork.title}
                  </h1>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {artwork.description || 'Không có mô tả chi tiết cho tác phẩm nghệ thuật này.'}
                  </p>

                  <button
                    onClick={() => navigate(`/artwork/${artwork._id}`)}
                    className="btn btn-primary"
                    style={{ padding: '12px 28px', borderRadius: '24px', fontSize: '15px' }}
                  >
                    {language === 'vn' ? 'Xem chi tiết tác phẩm' : 'View artwork details'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dots hiển thị vị trí slide ở dưới cùng */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              zIndex: 15,
            }}
          >
            {popularArtworks.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: idx === currentSlide ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentSlide ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <style>{`
            .glass-panel:hover .carousel-nav-btn {
              opacity: 0.8 !important;
            }
            .carousel-nav-btn:hover {
              background: rgba(255, 255, 255, 0.25) !important;
              opacity: 1 !important;
            }
          `}</style>
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

      {/* 4. Dòng thời gian hiển thị các tác phẩm mới nhất dưới dạng social post feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        <style>{`
          @keyframes skeleton-pulse {
            0% { opacity: 0.35; }
            50% { opacity: 0.7; }
            100% { opacity: 0.35; }
          }
        `}</style>

        {posts.map((artwork) => (
          <HomePostCard key={artwork._id} artwork={artwork} />
        ))}

        {/* Bộ chỉ báo tải dữ liệu/ khung xương */}
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

        {/* Phần tử Sentinel để kích hoạt tải dữ liệu khi cuộn */}
        {hasMore && !loadingNewest && !isFetching && (
          <div ref={sentinelRef} style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        )}

        {/* Cảnh báo không còn nội dung */}
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
            {language === 'vn' ? '🎉 Bạn đã xem hết các bài đăng gợi ý!' : "🎉 You've reached the end of the newest works feed!"}
          </div>
        )}

        {/* Hiển thị khi danh sách trống */}
        {!loadingNewest && posts.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t.noWorks}
          </div>
        )}
      </div>
    </div>
  );
};
