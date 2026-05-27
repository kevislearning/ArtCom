import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Upload, X, Calendar, Sparkles, Users, Clock, Flame, Heart, Bookmark, UserPlus, UserCheck, Search } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetIllustrationsQuery, useCreateIllustrationMutation, useSearchTagsQuery } from '../store/illustrationApi';
import { useGetRecommendedArtistsQuery, useSearchUsersQuery } from '../store/authApi';
import { useToggleFollowMutation } from '../store/followApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { getImageUrl } from '../utils/url';


export const Explore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // Trạng thái (State)
  const [sort, setSort] = useState('newest');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'artwork' | 'user'>('artwork');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Trạng thái biểu mẫu (Form State)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'everyone' | 'private' | 'logged_in'>('everyone');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Đồng bộ hóa state với URL queries
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sSort = params.get('sort');
    const sTag = params.get('tag');
    const sSearch = params.get('search');
    const sUpload = params.get('upload');
    const sType = params.get('type');

    if (sSort) setSort(sSort);
    else setSort('newest');

    if (sTag) setTag(sTag);
    else setTag('');

    if (sSearch) setSearch(sSearch);
    else setSearch('');

    if (sType === 'user' || sType === 'artwork') {
      setType(sType as 'artwork' | 'user');
    } else {
      setType('artwork');
    }

    if (sUpload === 'true') {
      setShowUploadModal(true);
      // Dọn dẹp upload query param
      navigate('/explore', { replace: true });
    }
  }, [location.search]);

  // Các câu truy vấn (Queries) & Đột biến (Mutations)
  const { data: artworks = [], isLoading: isArtworksLoading, refetch } = useGetIllustrationsQuery({
    sort,
    tag: tag || undefined,
    search: search || undefined,
  }, {
    skip: type !== 'artwork'
  });

  const { data: tagResults = [] } = useSearchTagsQuery(search, {
    skip: type !== 'artwork' || !search
  });

  const { data: userResults = [], isLoading: isUsersLoading } = useSearchUsersQuery(search, {
    skip: type !== 'user'
  });

  const { data: recommendedArtists = [] } = useGetRecommendedArtistsQuery(undefined, {
    skip: sort !== 'recommended',
  });

  const [createIllustration, { isLoading: isUploading }] = useCreateIllustrationMutation();
  const [toggleFollow] = useToggleFollowMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
      const previewUrls: string[] = [];
      Array.from(e.target.files).forEach((file) => {
        previewUrls.push(URL.createObjectURL(file));
      });
      setPreviews(previewUrls);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Vui lòng điền tiêu đề tác phẩm!');
      return;
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      setFormError('Vui lòng chọn ít nhất một tệp ảnh để tải lên!');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('visibility', visibility);
    formData.append('commentsEnabled', String(commentsEnabled));
    formData.append('isAIGenerated', String(isAIGenerated));

    const tagsArr = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    formData.append('tags', JSON.stringify(tagsArr));

    Array.from(selectedFiles).forEach((file) => {
      formData.append('images', file);
    });

    try {
      await createIllustration(formData).unwrap();
      setShowUploadModal(false);
      // Khởi động lại biểu mẫu (Reset form)
      setTitle('');
      setDescription('');
      setTagsInput('');
      setIsAIGenerated(false);
      setSelectedFiles(null);
      setPreviews([]);
      refetch();
    } catch (err: any) {
      console.error(err);
      setFormError(err.data?.message || 'Có lỗi xảy ra khi tải lên tác phẩm!');
    }
  };

  const clearFilters = () => {
    navigate('/explore?type=' + type);
  };

  const handleFollowToggle = async (artistId: string) => {
    try {
      await toggleFollow(artistId).unwrap();
    } catch (err) {
      console.error('Follow failed', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header trang Explore với các bộ lọc & Nút tải lên */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {type === 'user' ? (
              search ? `Kết quả tìm kiếm người dùng cho: "${search}"` : 'Tìm kiếm Người dùng'
            ) : (
              tag ? `Tag: #${tag}` : search ? `Kết quả cho: "${search}"` : t.explore
            )}
          </h1>
          {(tag || search) && (
            <button
              onClick={clearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '4px',
                padding: 0,
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Các nút sắp xếp các tác phẩm */}
          {type === 'artwork' && (
            <div
              className="glass-panel"
              style={{
                display: 'flex',
                padding: '4px',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)',
                gap: '2px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { value: 'newest', label: 'Mới nhất', icon: <Clock size={14} /> },
                { value: 'oldest', label: 'Cũ nhất', icon: <Calendar size={14} /> },
                { value: 'popularity', label: 'Phổ biến', icon: <Flame size={14} /> },
                { value: 'likes', label: 'Lượt thích', icon: <Heart size={14} /> },
                { value: 'bookmarks', label: 'Bookmark', icon: <Bookmark size={14} /> },
                { value: 'recommended', label: 'Đề xuất', icon: <Sparkles size={14} /> },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => navigate(`/explore?sort=${item.value}${tag ? `&tag=${tag}` : ''}${search ? `&search=${search}` : ''}${type ? `&type=${type}` : ''}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: sort === item.value ? 'var(--primary)' : 'transparent',
                    color: sort === item.value ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseOver={(e) => {
                    if (sort !== item.value) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseOut={(e) => {
                    if (sort !== item.value) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Bộ kích hoạt tải lên bài đăng mới (Create Post) */}
          {user && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary animate-fade-in"
              style={{ borderRadius: '24px', height: '42px', padding: '0 24px' }}
            >
              <Plus size={18} />
              Đăng tác phẩm
            </button>
          )}
        </div>
      </div>

      {/* Bong bóng gợi ý kết quả tìm kiếm theo tag bên trong tìm kiếm tác phẩm */}
      {type === 'artwork' && search && tagResults.length > 0 && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            padding: '16px 24px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} />
            Thẻ tag liên quan
          </span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {tagResults.map((tagObj) => (
              <button
                key={tagObj._id}
                onClick={() => navigate(`/explore?tag=${encodeURIComponent(tagObj._id)}&type=artwork`)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                #{tagObj._id}
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({tagObj.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bảng Artist được đề xuất bên trong Bộ lọc đề xuất */}
      {type === 'artwork' && sort === 'recommended' && recommendedArtists.length > 0 && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '24px 32px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--glass-border)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            Người dùng đề xuất cho bạn
          </h2>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '8px' }} className="hide-scrollbar">
            {recommendedArtists.map((artist) => (
              <div
                key={artist._id}
                onClick={() => navigate(`/portfolio/${artist._id}`)}
                style={{
                  minWidth: '180px',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
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
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }}
                />
                <div style={{ width: '100%' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {artist.nickname}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0 0' }}>
                    @{artist.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lưới hiển thị kết quả */}
      {type === 'user' ? (
        isUsersLoading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : !search ? (
          <div
            style={{
              padding: '64px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              borderRadius: 'var(--border-radius-md)',
              border: '2px dashed var(--glass-border)',
              fontSize: '15px',
            }}
          >
            Nhập từ khóa tìm kiếm để tìm người dùng.
          </div>
        ) : userResults.length === 0 ? (
          <div
            style={{
              padding: '64px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              borderRadius: 'var(--border-radius-md)',
              border: '2px dashed var(--glass-border)',
              fontSize: '15px',
            }}
          >
            Không tìm thấy người dùng phù hợp.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {userResults.map((artist) => (
              <div 
                key={artist._id}
                className="glass-panel animate-fade-in"
                style={{
                  display: 'flex',
                  padding: '24px',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  gap: '24px',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                {/* Phía bên trái: Thông tin và Nút theo dõi */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: '1', minWidth: '280px' }}>
                  <img
                    src={getImageUrl(artist.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + artist.username}
                    alt={artist.nickname}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--glass-border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/portfolio/${artist._id}`)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <h3 
                      style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/portfolio/${artist._id}`)}
                    >
                      {artist.nickname}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{artist.username}</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {artist.bio || (language === 'vn' ? 'Chưa có tiểu sử.' : 'No biography yet.')}
                    </p>
                    
                    {/* Nút theo dõi (Follow Button) */}
                    {user && user._id !== artist._id && (
                      <button
                        onClick={() => handleFollowToggle(artist._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                          marginTop: '8px',
                          width: 'fit-content',
                          backgroundColor: artist.followed ? 'rgba(255, 255, 255, 0.05)' : 'var(--primary)',
                          color: artist.followed ? 'var(--text-primary)' : '#ffffff',
                          border: artist.followed ? '1px solid var(--glass-border)' : 'none',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {artist.followed ? <UserCheck size={14} /> : <UserPlus size={14} />}
                        {artist.followed ? (language === 'vn' ? 'Đang Theo Dõi' : 'Following') : (language === 'vn' ? 'Theo Dõi' : 'Follow')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Phía bên phải: 3 ảnh thu nhỏ tác phẩm mới nhất */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {artist.artworks && artist.artworks.length > 0 ? (
                    artist.artworks.map((art: any) => (
                      <div
                        key={art._id}
                        onClick={() => navigate(`/artwork/${art._id}`)}
                        style={{
                          width: '90px',
                          height: '90px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          transition: 'transform var(--transition-fast)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <img
                          src={getImageUrl(art.imageUrls?.[0]) || '/placeholder.png'}
                          alt={art.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {language === 'vn' ? 'Chưa đăng tác phẩm nào' : 'No artworks uploaded yet'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        isArtworksLoading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : artworks.length === 0 ? (
          <div
            style={{
              padding: '64px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              borderRadius: 'var(--border-radius-md)',
              border: '2px dashed var(--glass-border)',
              fontSize: '15px',
            }}
          >
            {t.noWorks}
          </div>
        ) : (
          <div className="masonry-grid">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork._id} artwork={artwork} />
            ))}
          </div>
        )
      )}

      {/* Popup Modal tải lên tác phẩm minh họa (Upload Illustration) */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 11, 16, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              maxWidth: '640px',
              width: '100%',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {/* Header của Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 32px',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Tải lên tác phẩm mới</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body của Modal */}
            <form onSubmit={handleUploadSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {formError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Tiêu đề */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Tiêu đề tác phẩm *</label>
                <input
                  type="text"
                  className="glass-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên bức tranh..."
                  required
                />
              </div>

              {/* Mô tả */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Mô tả chi tiết</label>
                <textarea
                  className="glass-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Viết cảm hứng sáng tác của bạn..."
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Các trường nhập tag */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Các thẻ tag (Cách nhau bằng dấu phẩy)</label>
                <input
                  type="text"
                  className="glass-input"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="anime, sketch, watercolor, landscape"
                />
              </div>

              {/* Bộ chọn file tải lên & Xem trước */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Tải ảnh tác phẩm lên *</label>
                
                <div
                  style={{
                    border: '2px dashed var(--glass-border)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    background: 'rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Chọn tệp tin ảnh hoặc kéo thả vào đây
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Chấp nhận JPG, PNG, WEBP, GIF tối đa 10MB/ảnh
                  </p>
                </div>

                {/* Danh sách xem trước file */}
                {previews.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {previews.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--glass-border)',
                        }}
                      >
                        <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút gạt khai báo sử dụng AI */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  backgroundColor: 'rgba(255, 165, 0, 0.05)', 
                  border: '1px solid rgba(255, 165, 0, 0.15)',
                  padding: '16px',
                  borderRadius: 'var(--border-radius-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="isAIGenerated"
                    checked={isAIGenerated}
                    onChange={(e) => setIsAIGenerated(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isAIGenerated" style={{ fontSize: '14px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                    IsAIGenerated (Tác phẩm vẽ bằng AI)
                  </label>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '28px', lineHeight: '1.4' }}>
                  Nếu tắt, tác phẩm của bạn sẽ bị gán nhãn cảnh báo nếu công cụ chúng tôi đưa ra tỉ lệ sử dụng AI từ 65%.
                </span>
              </div>

              {/* Cần gạt cài đặt hiển thị (Visibility) và bình luận */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Trạng thái hiển thị</label>
                  <select
                    className="glass-input"
                    value={visibility}
                    onChange={(e: any) => setVisibility(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <option value="everyone">Công khai cho tất cả mọi người</option>
                    <option value="logged_in">Chỉ thành viên đăng nhập</option>
                    <option value="private">Riêng tư (Chỉ mình tôi)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'flex-end', height: '44px' }}>
                  <input
                    type="checkbox"
                    id="commentsEnabled"
                    checked={commentsEnabled}
                    onChange={(e) => setCommentsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="commentsEnabled" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    Cho phép bình luận
                  </label>
                </div>
              </div>

              {/* Chân trang các hành động (Actions Footer) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                  disabled={isUploading}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  <Upload size={16} />
                  {isUploading ? 'Đang tải lên...' : 'Hoàn tất đăng tải'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
