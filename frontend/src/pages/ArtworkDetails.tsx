import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Heart, Bookmark, Eye, Calendar, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Plus, Minus, RotateCcw, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import {
  useGetIllustrationByIdQuery,
  useDeleteIllustrationMutation,
  useToggleLikeMutation,
  useToggleBookmarkMutation,
} from '../store/illustrationApi';
import { useGetCommentsQuery } from '../store/commentApi';
import { useToggleFollowMutation, useCheckFollowStatusQuery } from '../store/followApi';
import { CommentSection } from '../components/CommentSection';
import { getImageUrl } from '../utils/url';


export const ArtworkDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // Chỉ số slide của Carousel
  const [currentSlide, setCurrentSlide] = useState(0);

  // State của Modal xem toàn màn hình (Fullscreen Viewer)
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Lắng nghe phím Escape để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFullscreen(false);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    if (showFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFullscreen]);

  // Vô hiệu hóa body scroll khi modal đang mở
  useEffect(() => {
    if (showFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFullscreen]);

  // Các bộ xử lý kéo/di chuyển (Pan handlers)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (zoom === 1) return; // Chỉ cho phép kéo/di chuyển khi đã phóng to
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Bộ xử lý phóng to bằng con lăn chuột (Wheel zoom handler)
  const handleWheel = (e: React.WheelEvent) => {
    const zoomStep = 0.15;
    let newZoom = zoom + (e.deltaY < 0 ? zoomStep : -zoomStep);
    newZoom = Math.max(1, Math.min(5, newZoom)); // Giới hạn phạm vi phóng to
    setZoom(newZoom);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 }); // Khôi phục lại vị trí kéo nếu thu nhỏ về 1x
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const nextZoom = Math.max(1, prev - 0.25);
      if (nextZoom === 1) setPosition({ x: 0, y: 0 });
      return nextZoom;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };


  // Các câu truy vấn (Queries)
  const { data: artwork, isLoading, error } = useGetIllustrationByIdQuery(id || '');
  const { data: comments = [] } = useGetCommentsQuery(id || '', { skip: !id });

  const artistId = typeof artwork?.artistId === 'object' ? artwork.artistId._id : '';
  
  // Câu truy vấn theo dõi (Follow query)
  const { data: followData = { followed: false } } = useCheckFollowStatusQuery(artistId, {
    skip: !artistId || !user,
  });

  const [toggleFollow] = useToggleFollowMutation();
  const [toggleLike, { isLoading: isLiking }] = useToggleLikeMutation();
  const [toggleBookmark, { isLoading: isBookmarking }] = useToggleBookmarkMutation();
  const [deleteIllustration, { isLoading: isDeleting }] = useDeleteIllustrationMutation();

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isLiking || !artwork) return;
    try {
      await toggleLike(artwork._id).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isBookmarking || !artwork) return;
    try {
      await toggleBookmark(artwork._id).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await toggleFollow(artistId).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tác phẩm này vĩnh viễn?')) {
      try {
        await deleteIllustration(artwork!._id).unwrap();
        navigate('/');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>;
  }

  if (error || !artwork) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--danger)' }}>
        {t.artworkNotFound}
      </div>
    );
  }

  const artist = typeof artwork.artistId === 'object' ? artwork.artistId : null;
  const isOwner = user && artist && artist._id === user._id;

  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

  const nextSlide = () => {
    if (artwork.imageUrls.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % artwork.imageUrls.length);
    }
  };

  const prevSlide = () => {
    if (artwork.imageUrls.length > 1) {
      setCurrentSlide((prev) => (prev - 1 + artwork.imageUrls.length) % artwork.imageUrls.length);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Nút quay lại */}
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
      </div>

      {/* Bố cục hai cột chính */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
        className="artwork-details-grid"
      >
        {/* Cột trái: Trình xem ảnh / Carousel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="glass-panel"
            style={{
              position: 'relative',
              borderRadius: 'var(--border-radius-md)',
              overflow: 'hidden',
              backgroundColor: '#000000',
              height: '560px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--glass-border)',
            }}
          >
            {/* Các nút điều hướng Carousel */}
            {artwork.imageUrls.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    backgroundColor: 'rgba(10, 11, 16, 0.6)',
                    border: '1px solid var(--glass-border)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20,
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextSlide}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    backgroundColor: 'rgba(10, 11, 16, 0.6)',
                    border: '1px solid var(--glass-border)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20,
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Đang hiển thị slide hình ảnh */}
            {(() => {
              const currentImg = artwork.imageUrls.at(currentSlide) || '';
              return (
                <div
                  onClick={() => setShowFullscreen(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'zoom-in',
                    position: 'relative',
                  }}
                  className="artwork-image-container"
                >
                  <style>{`
                    .artwork-image-container:hover .zoom-hover-btn {
                      opacity: 1 !important;
                      transform: scale(1) !important;
                    }
                    .artwork-image-container:hover img {
                      filter: brightness(1.05);
                      transition: filter var(--transition-fast);
                    }
                  `}</style>
                  <img
                    src={currentImg.startsWith('http') ? currentImg : `${API_BASE_URL}${currentImg}`}
                    alt={artwork.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                  {/* Nút phóng to tinh tế, đẹp mắt khi hover */}
                  <div
                    className="zoom-hover-btn"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: 'rgba(18, 19, 26, 0.75)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 25,
                      opacity: 0,
                      transform: 'scale(0.9)',
                      transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Maximize2 size={18} />
                  </div>
                </div>
              );
            })()}

            {/* Chỉ báo phân trang (Pagination indicator) */}
            {artwork.imageUrls.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  backgroundColor: 'rgba(10, 11, 16, 0.6)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {currentSlide + 1} / {artwork.imageUrls.length}
              </div>
            )}
          </div>

          {/* Phân khúc nhánh bình luận (Comment Tree) */}
          {artwork.commentsEnabled ? (
            <div
              className="glass-panel"
              style={{
                padding: '32px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <CommentSection
                illustrationId={artwork._id}
                artistId={artistId}
                comments={comments}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px dashed var(--glass-border)',
              }}
            >
              {t.commentsDisabled}
            </div>
          )}
        </div>

        {/* Cột phải: Khay chi tiết tương tác */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Thẻ chi tiết hiệu ứng kính mờ (Glass details) */}
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {/* Tiêu đề & Các quyền điều khiển của chủ sở hữu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{artwork.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Calendar size={12} />
                    Đăng ngày {new Date(artwork.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  {(artwork.isAIGenerated || artwork.aiDetectionResult?.isAIDetected) && (
                    <div 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                        border: '1px solid rgba(245, 158, 11, 0.25)', 
                        color: '#f59e0b', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 700
                      }}
                    >
                      <span>Có thể sử dụng AI</span>
                      <span 
                        style={{ 
                          cursor: 'help', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          backgroundColor: 'rgba(245, 158, 11, 0.2)', 
                          borderRadius: '50%', 
                          width: '14px', 
                          height: '14px', 
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#f59e0b'
                        }}
                        title={
                          artwork.isAIGenerated 
                            ? "Tác phẩm này được tác giả khai báo có sử dụng công cụ AI."
                            : `Công cụ hệ thống chúng tôi ghi nhận khả năng tranh có sử dụng AI là ${(artwork.aiDetectionResult ? artwork.aiDetectionResult.aiProbability * 100 : 65).toFixed(0)}%`
                        }
                      >
                        i
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    padding: '8px 12px',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Phân khúc thông tin Artist Creator */}
            {artist && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div
                  onClick={() => navigate(`/portfolio/${artist._id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                  <img
                    src={getImageUrl(artist.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + artist.username}
                    alt={artist.nickname}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{artist.nickname}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{artist.username}</p>
                  </div>
                </div>

                {!isOwner && (
                  <button
                    onClick={handleFollowToggle}
                    className={`btn ${followData.followed ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '18px' }}
                  >
                    {followData.followed ? t.unfollow : t.follow}
                  </button>
                )}
              </div>
            )}

            {/* Mô tả */}
            {artwork.description && (
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {artwork.description}
              </p>
            )}

            {/* Các nhãn (Tags) */}
            {artwork.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {artwork.tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => navigate(`/explore?tag=${encodeURIComponent(tag)}`)}
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Thanh hiển thị các chỉ số và hành động (Metrics and Actions) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--glass-border)',
                paddingTop: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Eye size={16} />
                  {artwork.viewsCount} {t.views}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleLike}
                  className="btn btn-secondary"
                  style={{
                    color: artwork.liked ? 'var(--danger)' : 'var(--text-primary)',
                    borderColor: artwork.liked ? 'rgba(239,68,68,0.2)' : 'var(--glass-border)',
                    backgroundColor: artwork.liked ? 'rgba(239,68,68,0.05)' : 'transparent',
                    borderRadius: '24px',
                    padding: '8px 18px',
                    fontSize: '13px',
                  }}
                >
                  <Heart size={16} fill={artwork.liked ? 'var(--danger)' : 'none'} />
                  {artwork.likesCount}
                </button>

                <button
                  onClick={handleBookmark}
                  className="btn btn-secondary"
                  style={{
                    color: artwork.bookmarked ? 'var(--accent)' : 'var(--text-primary)',
                    borderColor: artwork.bookmarked ? 'rgba(20,184,166,0.2)' : 'var(--glass-border)',
                    backgroundColor: artwork.bookmarked ? 'rgba(20,184,166,0.05)' : 'transparent',
                    borderRadius: '24px',
                    padding: '8px 18px',
                    fontSize: '13px',
                  }}
                >
                  <Bookmark size={16} fill={artwork.bookmarked ? 'var(--accent)' : 'none'} />
                  {artwork.bookmarksCount}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xem toàn màn hình tương tác (Fullscreen Interactive Viewer) */}
      {showFullscreen && (() => {
        const currentImg = artwork.imageUrls.at(currentSlide) || '';
        const imgUrl = currentImg.startsWith('http') ? currentImg : `${API_BASE_URL}${currentImg}`;
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 11, 16, 0.95)',
              backdropFilter: 'blur(20px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              userSelect: 'none',
            }}
            onWheel={handleWheel}
          >
            {/* Nút đóng (Góc trên bên phải) */}
            <button
              onClick={() => {
                setShowFullscreen(false);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                zIndex: 100,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={24} />
            </button>

            {/* Khung chứa kéo/di chuyển (Panning Container) */}
            <div
              style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Phần tử hình ảnh có hiệu ứng chuyển động */}
              <img
                src={imgUrl}
                alt={artwork.title}
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  objectFit: 'contain',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  pointerEvents: 'none', // Ngăn chặn hành động kéo ảnh mặc định của trình duyệt
                }}
              />
            </div>

            {/* Bảng điều khiển thu phóng nổi (Floating Zoom Control) */}
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(18, 19, 26, 0.85)',
                border: '1px solid var(--glass-border)',
                borderRadius: '30px',
                padding: '8px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                zIndex: 100,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                style={{
                  background: 'none',
                  border: 'none',
                  color: zoom <= 1 ? 'var(--text-muted)' : '#ffffff',
                  cursor: zoom <= 1 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                title="Thu nhỏ"
              >
                <Minus size={20} />
              </button>

              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', minWidth: '48px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                style={{
                  background: 'none',
                  border: 'none',
                  color: zoom >= 5 ? 'var(--text-muted)' : '#ffffff',
                  cursor: zoom >= 5 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                title="Phóng to"
              >
                <Plus size={20} />
              </button>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--glass-border)' }}></div>

              <button
                onClick={handleResetZoom}
                disabled={zoom === 1 && position.x === 0 && position.y === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: (zoom === 1 && position.x === 0 && position.y === 0) ? 'var(--text-muted)' : '#ffffff',
                  cursor: (zoom === 1 && position.x === 0 && position.y === 0) ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                title="Đặt lại kích thước"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Tooltip hướng dẫn trên top bar */}
            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '8px 16px',
                borderRadius: '20px',
              }}
            >
              <span>🖱️ Cuộn chuột để Phóng to / Thu nhỏ</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>🖐️ Kéo giữ chuột để Di chuyển</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
