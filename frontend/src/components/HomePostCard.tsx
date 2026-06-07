import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Heart, MessageSquare, MoreHorizontal, ChevronLeft, ChevronRight, Share2, Flag, EyeOff, Bookmark } from 'lucide-react';
import type { Illustration } from '../types';
import { useToggleLikeMutation, useToggleBookmarkMutation } from '../store/illustrationApi';
import { useGetCommentsQuery } from '../store/commentApi';
import type { RootState } from '../store';
import { getImageUrl } from '../utils/url';
import { translations } from '../utils/translation';

interface HomePostCardProps {
  artwork: Illustration;
}

export const HomePostCard = ({ artwork }: HomePostCardProps) => {
  const navigate = useNavigate();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // States
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mutations
  const [toggleLike, { isLoading: isLiking }] = useToggleLikeMutation();
  const [toggleBookmark, { isLoading: isBookmarking }] = useToggleBookmarkMutation();

  // Queries (fetch comments for preview)
  const { data: comments = [] } = useGetCommentsQuery(artwork._id);

  // Dropdown reference for click-outside
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const artworkUrl = `${window.location.origin}/artwork/${artwork._id}`;
    navigator.clipboard.writeText(artworkUrl)
      .then(() => {
        triggerToast(language === 'vn' ? 'Đã sao chép liên kết vào bộ nhớ tạm!' : 'Link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
      });
    setShowMenu(false);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerToast(
      language === 'vn' 
        ? 'Cảm ơn! Báo cáo của bạn về tác phẩm này đã được ghi nhận.' 
        : 'Thank you! Your report for this artwork has been received.'
    );
    setShowMenu(false);
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNotInterested(true);
    setShowMenu(false);
  };

  const artist = typeof artwork.artistId === 'object' ? artwork.artistId : null;
  const displayCommentsCount = artwork.commentsCount || comments.length;
  const firstComment = comments[0];

  if (isNotInterested) {
    return (
      <div
        className="glass-panel animate-fade-in"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--glass-border)',
          minHeight: '70px',
          width: '100%',
        }}
      >
        <span>
          {language === 'vn' 
            ? 'Bạn đã ẩn tác phẩm này khỏi dòng thời gian.' 
            : 'You have hidden this work from your feed.'}
        </span>
        <button
          onClick={() => setIsNotInterested(false)}
          className="btn btn-secondary"
          style={{ padding: '6px 16px', borderRadius: '16px', fontSize: '12px' }}
        >
          {language === 'vn' ? 'Hoàn tác' : 'Undo'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'auto',
        borderRadius: 'var(--border-radius-md)',
        overflow: 'visible',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
        transition: 'none', /* Bỏ scale hover chuyển động dọc của card thường */
      }}
      onMouseOver={(e) => {
        // override class .glass-card transform: translateY(-4px)
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '30px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 8px 20px var(--accent-glow)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header: Artist Info & Menu */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {artist ? (
          <div
            onClick={() => navigate(`/portfolio/${artist._id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <img
              src={getImageUrl(artist.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + artist.username}
              alt={artist.nickname}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: artist.isArtist ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {artist.nickname || artist.username}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                @{artist.username}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Anonymous Artist</span>
          </div>
        )}

        {/* Dropdown Menu Trigger */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--glass-border)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <MoreHorizontal size={18} />
          </button>

          {/* Glassmorphic Dropdown List */}
          {showMenu && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '180px',
                borderRadius: 'var(--border-radius-sm)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                zIndex: 50,
                overflow: 'hidden',
                padding: '4px',
              }}
            >
              <button
                onClick={handleShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--glass-highlight)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Share2 size={15} style={{ color: 'var(--primary)' }} />
                {language === 'vn' ? 'Chia sẻ' : 'Share'}
              </button>
              <button
                onClick={handleReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--glass-highlight)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Flag size={15} style={{ color: 'var(--warning)' }} />
                {language === 'vn' ? 'Báo cáo vi phạm' : 'Report problem'}
              </button>
              <div style={{ height: '1px', backgroundColor: 'var(--glass-border)', margin: '4px 0' }} />
              <button
                onClick={handleNotInterested}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <EyeOff size={15} />
                {language === 'vn' ? 'Không quan tâm' : 'Not interested'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Body: Multi-Image Carousel */}
      <div
        style={{
          position: 'relative',
          height: '480px',
          width: '100%',
          backgroundColor: '#07080c',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Blurred backdrop image */}
        {artwork.imageUrls[currentImageIndex] && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${getImageUrl(artwork.imageUrls[currentImageIndex])})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(25px) brightness(0.35)',
              transform: 'scale(1.1)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* Crisp foreground image */}
        {artwork.imageUrls[currentImageIndex] && (
          <img
            src={getImageUrl(artwork.imageUrls[currentImageIndex])}
            alt={`${artwork.title} - ${currentImageIndex + 1}`}
            onClick={() => navigate(`/artwork/${artwork._id}`)}
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              zIndex: 2,
              cursor: 'pointer',
              transition: 'transform var(--transition-normal)',
            }}
            className="post-main-image"
          />
        )}

        {/* AI Warning Badge */}
        {artwork.isAIGenerated && (
          <span
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.9)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              zIndex: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            AI Generated
          </span>
        )}

        {/* Image index badge */}
        {artwork.imageUrls.length > 1 && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'rgba(10, 11, 16, 0.75)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              zIndex: 3,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {currentImageIndex + 1}/{artwork.imageUrls.length}
          </span>
        )}

        {/* Carousel Arrow Controls */}
        {artwork.imageUrls.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => prev - 1);
                }}
                style={{
                  position: 'absolute',
                  left: '12px',
                  zIndex: 4,
                  background: 'rgba(10, 11, 16, 0.6)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(10, 11, 16, 0.85)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(10, 11, 16, 0.6)')}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {currentImageIndex < artwork.imageUrls.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => prev + 1);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  zIndex: 4,
                  background: 'rgba(10, 11, 16, 0.6)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(10, 11, 16, 0.85)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(10, 11, 16, 0.6)')}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </>
        )}
      </div>

      {/* 3. Footer: Interaction & Comment Preview */}
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Title & Actions Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h3
              onClick={() => navigate(`/artwork/${artwork._id}`)}
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                marginBottom: '4px',
                lineHeight: '1.4',
              }}
            >
              {artwork.title}
            </h3>
            {artwork.description && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.5',
                }}
              >
                {artwork.description}
              </p>
            )}
          </div>

          {/* Likes & Bookmarks Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
            {/* Like */}
            <button
              onClick={handleLike}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: artwork.liked ? 'var(--danger)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: artwork.liked ? 'rgba(239, 68, 68, 0.15)' : 'var(--glass-border)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
              }}
            >
              <Heart size={16} fill={artwork.liked ? 'var(--danger)' : 'none'} style={{ transition: 'transform 0.2s' }} />
              <span>{artwork.likesCount || 0}</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: artwork.bookmarked ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: artwork.bookmarked ? 'rgba(20, 184, 166, 0.15)' : 'var(--glass-border)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
              }}
            >
              <Bookmark size={16} fill={artwork.bookmarked ? 'var(--accent)' : 'none'} />
              <span>{artwork.bookmarksCount || 0}</span>
            </button>
          </div>
        </div>

        {/* Tags list */}
        {artwork.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
            {artwork.tags.map((tg, i) => (
              <span
                key={i}
                onClick={() => navigate(`/explore?tag=${encodeURIComponent(tg)}`)}
                style={{
                  fontSize: '12px',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                #{tg}
              </span>
            ))}
          </div>
        )}

        {/* 4. Comment Preview Container */}
        {artwork.commentsEnabled ? (
          <div
            onClick={() => navigate(`/artwork/${artwork._id}`)}
            style={{
              marginTop: '4px',
              padding: '12px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
          >
            {/* Preview header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {language === 'vn' ? 'Bình luận' : 'Comments'} ({displayCommentsCount})
              </span>
            </div>

            {/* Comment snippet */}
            {firstComment ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <img
                  src={getImageUrl(firstComment.userId?.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + firstComment.userId?.username}
                  alt={firstComment.userId?.nickname || firstComment.userId?.username}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px' }}>
                    {firstComment.userId?.nickname || firstComment.userId?.username}:
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {firstComment.content}
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {language === 'vn' 
                  ? 'Chưa có bình luận nào. Click để viết bình luận đầu tiên!' 
                  : 'No comments yet. Click to write the first comment!'}
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              marginTop: '4px',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.08)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            {t.commentsDisabled}
          </div>
        )}
      </div>
    </div>
  );
};
