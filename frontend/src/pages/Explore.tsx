import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Upload, X, Trophy, Calendar, Sparkles, Users } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetIllustrationsQuery, useCreateIllustrationMutation } from '../store/illustrationApi';
import { useGetRecommendedArtistsQuery } from '../store/authApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { getImageUrl } from '../utils/url';


export const Explore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // State
  const [sort, setSort] = useState('newest');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'everyone' | 'private' | 'logged_in'>('everyone');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Sync state with URL queries
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sSort = params.get('sort');
    const sTag = params.get('tag');
    const sSearch = params.get('search');
    const sUpload = params.get('upload');

    if (sSort) setSort(sSort);
    else setSort('newest');

    if (sTag) setTag(sTag);
    else setTag('');

    if (sSearch) setSearch(sSearch);
    else setSearch('');

    if (sUpload === 'true') {
      setShowUploadModal(true);
      // Clean up upload query param
      navigate('/explore', { replace: true });
    }
  }, [location.search]);

  // Query
  const { data: artworks = [], isLoading, refetch } = useGetIllustrationsQuery({
    sort,
    tag: tag || undefined,
    search: search || undefined,
  });

  const { data: recommendedArtists = [] } = useGetRecommendedArtistsQuery(undefined, {
    skip: sort !== 'recommended',
  });

  const [createIllustration, { isLoading: isUploading }] = useCreateIllustrationMutation();

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
      // Reset form
      setTitle('');
      setDescription('');
      setTagsInput('');
      setSelectedFiles(null);
      setPreviews([]);
      refetch();
    } catch (err: any) {
      console.error(err);
      setFormError(err.data?.message || 'Có lỗi xảy ra khi tải lên tác phẩm!');
    }
  };

  const clearFilters = () => {
    navigate('/explore');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Explore Header with Filters & Upload */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {tag ? `Tag: #${tag}` : search ? `Kết quả cho: "${search}"` : t.explore}
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
          {/* Sorting Buttons */}
          <div
            className="glass-panel"
            style={{
              display: 'flex',
              padding: '4px',
              borderRadius: '24px',
              border: '1px solid var(--glass-border)',
            }}
          >
            <button
              onClick={() => navigate(`/explore?sort=newest${tag ? `&tag=${tag}` : ''}${search ? `&search=${search}` : ''}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: sort === 'newest' ? 'var(--primary)' : 'transparent',
                color: sort === 'newest' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Calendar size={14} />
              Mới nhất
            </button>
            <button
              onClick={() => navigate(`/explore?sort=popular${tag ? `&tag=${tag}` : ''}${search ? `&search=${search}` : ''}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: sort === 'popular' ? 'var(--primary)' : 'transparent',
                color: sort === 'popular' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Trophy size={14} />
              Phổ biến nhất
            </button>
            <button
              onClick={() => navigate(`/explore?sort=recommended${tag ? `&tag=${tag}` : ''}${search ? `&search=${search}` : ''}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: sort === 'recommended' ? 'var(--primary)' : 'transparent',
                color: sort === 'recommended' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Sparkles size={14} />
              Đề xuất
            </button>
          </div>

          {/* Create Post Upload Trigger */}
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

      {/* Recommended Artists Panel inside Recommended Filter */}
      {sort === 'recommended' && recommendedArtists.length > 0 && (
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
            Họa sĩ đề xuất cho bạn
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

      {/* Grid of Results */}
      {isLoading ? (
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
      )}

      {/* Upload Illustration Modal Popup */}
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
            {/* Modal Header */}
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

            {/* Modal Body */}
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

              {/* Title */}
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

              {/* Description */}
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

              {/* Tag fields */}
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

              {/* File Upload Selector & Preview */}
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

                {/* File previews list */}
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

              {/* Visibility and Comments Switch */}
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

              {/* Actions Footer */}
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
