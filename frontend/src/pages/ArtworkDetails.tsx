import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Heart, Bookmark, Eye, Calendar, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
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

  // Carousel slide index
  const [currentSlide, setCurrentSlide] = useState(0);

  // Queries
  const { data: artwork, isLoading, error } = useGetIllustrationByIdQuery(id || '');
  const { data: comments = [] } = useGetCommentsQuery(id || '', { skip: !id });

  const artistId = typeof artwork?.artistId === 'object' ? artwork.artistId._id : '';
  
  // Follow query
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
      {/* Back button */}
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

      {/* Main double column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
        className="artwork-details-grid"
      >
        {/* Left Column: Image Viewer / Carousel */}
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
            {/* Carousel navigation controls */}
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

            {/* Displaying Image slide */}
            {(() => {
              const currentImg = artwork.imageUrls.at(currentSlide) || '';
              return (
                <img
                  src={currentImg.startsWith('http') ? currentImg : `${API_BASE_URL}${currentImg}`}
                  alt={artwork.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              );
            })()}

            {/* Pagination indicator */}
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

          {/* Comment Tree Segment */}
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

        {/* Right Column: Interaction details tray */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Glass details card */}
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
            {/* Title & owner controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{artwork.title}</h1>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  <Calendar size={12} />
                  Đăng ngày {new Date(artwork.createdAt).toLocaleDateString('vi-VN')}
                </span>
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

            {/* Artist Creator segment */}
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

            {/* Description */}
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

            {/* Tags */}
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

            {/* Metrics and Actions Bar */}
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
    </div>
  );
};
