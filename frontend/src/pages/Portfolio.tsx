import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Mail,
  UserPlus,
  Briefcase,
  Award,
  X,
  Settings,
  Edit,
  Plus,
  Trash2,
  Globe,
  Calendar,
  MapPin,
  User,
  Lock,
  Camera,
  Save,
  Upload,
  MessageSquare,
  Heart,
  Link2,
} from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { useGetPublicProfileQuery, useUpdateProfileMutation } from '../store/authApi';
import { updateUser } from '../store/authSlice';
import { useGetIllustrationsQuery } from '../store/illustrationApi';
import { useToggleFollowMutation, useCheckFollowStatusQuery } from '../store/followApi';
import { useCreateCommissionMutation } from '../store/commissionApi';
import { ArtworkCard } from '../components/ArtworkCard';
import { getImageUrl } from '../utils/url';


const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return Camera;
    case 'discord': return MessageSquare;
    case 'patreon': return Heart;
    case 'deviantart': return Award;
    case 'facebook':
    case 'youtube':
    case 'twitter':
    case 'twitter/x':
    default: return Link2;
  }
};

export const Portfolio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  // Trạng thái Tab (Tab State)
  const [activeTab, setActiveTab] = useState<'works' | 'likes' | 'bookmarks'>('works');
  
  // Trạng thái Modal yêu cầu Commission
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [commTitle, setCommTitle] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commPrice, setCommPrice] = useState(100000); // Mức cơ bản 100k VND
  const [commDeadline, setCommDeadline] = useState('');
  const [commPrivate, setCommPrivate] = useState(false);
  const [commError, setCommError] = useState('');
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refImagePreviews, setRefImagePreviews] = useState<string[]>([]);

  const handleRefImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalFiles = [...refFiles, ...filesArray].slice(0, 5);
      setRefFiles(totalFiles);
      
      const previewsArray = totalFiles.map(file => URL.createObjectURL(file));
      setRefImagePreviews(previewsArray);
    }
  };

  const handleRemoveRefImage = (index: number) => {
    const updatedFiles = refFiles.filter((_, idx) => idx !== index);
    setRefFiles(updatedFiles);
    const updatedPreviews = refImagePreviews.filter((_, idx) => idx !== index);
    setRefImagePreviews(updatedPreviews);
  };

  // Trạng thái Modal chỉnh sửa hồ sơ (Edit Profile)
  const [showEditModal, setShowEditModal] = useState(false);
  const [nicknameVal, setNicknameVal] = useState('');
  const [bioVal, setBioVal] = useState('');
  const [websiteVal, setWebsiteVal] = useState('');
  const [websitePublic, setWebsitePublic] = useState(true);
  const [genderVal, setGenderVal] = useState('other');
  const [genderPublic, setGenderPublic] = useState(true);
  const [countryVal, setCountryVal] = useState('');
  const [countryPublic, setCountryPublic] = useState(true);
  const [birthdayVal, setBirthdayVal] = useState('');
  const [birthdayPublic, setBirthdayPublic] = useState(true);
  const [occupationVal, setOccupationVal] = useState('');
  const [occupationPublic, setOccupationPublic] = useState(true);
  const [customSocialLinks, setCustomSocialLinks] = useState<any[]>([]);

  // Các trạng thái chỉnh sửa Avatar & Banner
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');

  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  const handleOpenEditModal = () => {
    if (!profileUser) return;
    setNicknameVal(profileUser.nickname || '');
    setBioVal(profileUser.bio || '');
    setWebsiteVal(profileUser.website?.value || '');
    setWebsitePublic(profileUser.website?.isPublic ?? true);
    setGenderVal(profileUser.gender?.value || 'other');
    setGenderPublic(profileUser.gender?.isPublic ?? true);
    setCountryVal(profileUser.country?.value || '');
    setCountryPublic(profileUser.country?.isPublic ?? true);
    setBirthdayVal(profileUser.birthday?.value ? new Date(profileUser.birthday.value).toISOString().split('T')[0] : '');
    setBirthdayPublic(profileUser.birthday?.isPublic ?? true);
    setOccupationVal(profileUser.occupation?.value || '');
    setOccupationPublic(profileUser.occupation?.isPublic ?? true);
    setCustomSocialLinks(profileUser.customSocialLinks || []);
    setAvatarPreview(profileUser.avatarUrl || '');
    setBannerPreview(profileUser.bannerUrl || '');
    setAvatarFile(null);
    setBannerFile(null);
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleAddSocialLink = () => {
    setCustomSocialLinks([...customSocialLinks, { platform: 'Facebook', username: '', isPublic: true }]);
  };

  const handleSocialLinkChange = (index: number, field: string, val: any) => {
    const updated = [...customSocialLinks];
    updated[index] = { ...updated[index], [field]: val };
    setCustomSocialLinks(updated);
  };

  const handleRemoveSocialLink = (index: number) => {
    setCustomSocialLinks(customSocialLinks.filter((_, idx) => idx !== index));
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    const formData = new FormData();
    formData.append('nickname', nicknameVal.trim());
    formData.append('bio', bioVal.trim());
    
    formData.append('website', JSON.stringify({ value: websiteVal.trim(), isPublic: websitePublic }));
    formData.append('gender', JSON.stringify({ value: genderVal, isPublic: genderPublic }));
    formData.append('country', JSON.stringify({ value: countryVal.trim(), isPublic: countryPublic }));
    formData.append('birthday', JSON.stringify({ value: birthdayVal ? new Date(birthdayVal) : null, isPublic: birthdayPublic }));
    formData.append('occupation', JSON.stringify({ value: occupationVal.trim(), isPublic: occupationPublic }));
    formData.append('customSocialLinks', JSON.stringify(customSocialLinks));

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    try {
      const updated = await updateProfile(formData).unwrap();
      dispatch(updateUser(updated));
      setEditSuccess('Cập nhật thông tin trang cá nhân thành công!');
      setTimeout(() => {
        setShowEditModal(false);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setEditError(err.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin!');
    }
  };

  // Các câu truy vấn (Queries)
  const { data: profileUser, isLoading: loadingProfile } = useGetPublicProfileQuery(id || '');

  const { data: artworks = [], isLoading: loadingArtworks } = useGetIllustrationsQuery({
    artistId: id,
  });

  const { data: followData = { followed: false } } = useCheckFollowStatusQuery(id || '', {
    skip: !id || !user || id === user._id,
  });

  const [toggleFollow] = useToggleFollowMutation();
  const [createCommission, { isLoading: isSubmittingCommission }] = useCreateCommissionMutation();

  const handleFollowToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await toggleFollow(id!).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/messenger?userId=${id}`);
  };

  const handleCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommError('');

    if (!commTitle.trim()) {
      setCommError('Vui lòng điền tiêu đề yêu cầu!');
      return;
    }
    if (!commDesc.trim()) {
      setCommError('Vui lòng mô tả yêu cầu vẽ (Brief)!');
      return;
    }
    if (commPrice <= 0) {
      setCommError('Số tiền đề xuất phải lớn hơn 0!');
      return;
    }
    if (!commDeadline) {
      setCommError('Vui lòng chọn hạn chót hoàn thành!');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('artistId', id!);
      formData.append('title', commTitle.trim());
      formData.append('description', commDesc.trim());
      formData.append('price', commPrice.toString());
      formData.append('deadline', commDeadline);
      formData.append('isPrivate', commPrivate.toString());
      
      refFiles.forEach((file) => {
        formData.append('referenceImages', file);
      });

      await createCommission(formData).unwrap();
      
      setShowCommissionModal(false);
      // Thiết lập lại (Reset)
      setCommTitle('');
      setCommDesc('');
      setCommPrice(100000);
      setCommDeadline('');
      setCommPrivate(false);
      setRefFiles([]);
      setRefImagePreviews([]);
      alert('Đã gửi yêu cầu vẽ tranh và tạm giữ tiền thành công!');
      navigate('/commissions');
    } catch (err: any) {
      console.error(err);
      setCommError(err.data?.message || 'Không đủ số dư ví hoặc có lỗi xảy ra!');
    }
  };

  if (loadingProfile) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>;
  }

  if (!profileUser) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--danger)' }}>
        Không tìm thấy hồ sơ người dùng.
      </div>
    );
  }

  const isMe = user && user._id === profileUser._id;
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

  const displayedWorks = artworks.filter(() => {
    if (activeTab === 'works') {
      return true;
    }
    // Để đơn giản, các tab likes/bookmarks có thể hiển thị nếu được phi chuẩn hóa hoặc nạp dữ liệu,
    // chúng ta chỉ hiển thị các tác phẩm đã tạo của nghệ sĩ trong lưới này để học thuật đơn giản,
    // hoặc chúng ta hiển thị một thông báo nếu tab trống.
    return false;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* 1. Ảnh bìa Cover Banner & Header Avatar */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          position: 'relative',
        }}
      >
        {/* Ảnh bìa Banner */}
        <div
          style={{
            height: '240px',
            backgroundColor: 'var(--bg-tertiary)',
            backgroundImage: profileUser.bannerUrl
              ? `url(${profileUser.bannerUrl.startsWith('http') ? profileUser.bannerUrl : `${API_BASE_URL}${profileUser.bannerUrl}`})`
              : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Phần thông tin chi tiết hồ sơ lớp phủ (Profile Details Overlay) */}
        <div
          style={{
            padding: '32px',
            marginTop: '-64px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            position: 'relative',
            zIndex: 10,
          }}
          className="portfolio-details-header"
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
            {/* Khung Avatar */}
            <img
              src={getImageUrl(profileUser.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profileUser.username}
              alt={profileUser.nickname}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--bg-secondary)',
                boxShadow: 'var(--card-shadow)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            />

            <div style={{ paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{profileUser.nickname}</h2>
                {profileUser.requestTerms?.hasTerms && (
                  <span
                    style={{
                      backgroundColor: 'var(--success)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Award size={12} />
                    {language === 'en' ? 'Open for Commission' : 'Nhận đặt vẽ'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>@{profileUser.username}</p>
            </div>
          </div>

          {/* Các nút kích hoạt hành động */}
          <div style={{ display: 'flex', gap: '12px', paddingBottom: '8px' }}>
            {isMe && (
              <button
                onClick={handleOpenEditModal}
                className="btn btn-primary"
                style={{ borderRadius: '20px', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings size={16} />
                Chỉnh sửa trang cá nhân
              </button>
            )}
            {!isMe && (
              <>
                <button
                  onClick={handleFollowToggle}
                  className={`btn ${followData.followed ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                >
                  <UserPlus size={16} />
                  {followData.followed ? t.unfollow : t.follow}
                </button>
                <button
                  onClick={handleCreateChat}
                  className="btn btn-secondary"
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                >
                  <Mail size={16} />
                  Nhắn tin
                </button>
                {profileUser.requestTerms?.hasTerms && (
                  <button
                    onClick={() => {
                      if (!user) navigate('/login');
                      else setShowTermsPopup(true);
                    }}
                    className="btn btn-accent"
                    style={{ borderRadius: '20px', padding: '10px 24px' }}
                  >
                    <Briefcase size={16} />
                    {language === 'en' ? 'View Request Terms' : 'Xem ĐK nhận vẽ'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chi tiết Bio người dùng và các chỉ số thống kê */}
        <div
          style={{
            padding: '0 32px 32px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '32px',
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '24px',
          }}
          className="portfolio-bio-grid"
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>{t.bio}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              {profileUser.bio || 'Người dùng này chưa viết lời giới thiệu trang cá nhân.'}
            </p>

            {/* Thêm phần thông tin chi tiết dưới Bio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>Thông tin chi tiết</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }} className="profile-info-grid">
                {/* Website */}
                {(profileUser.website?.value || (isMe && profileUser.website?.value === '')) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Globe size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Website:</span>
                    {profileUser.website.value ? (
                      <a href={profileUser.website.value.startsWith('http') ? profileUser.website.value : `https://${profileUser.website.value}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {profileUser.website.value}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa thiết lập</span>
                    )}
                    {isMe && !profileUser.website.isPublic && (
                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} title="Chỉ mình bạn nhìn thấy">
                        <Lock size={10} /> Riêng tư
                      </span>
                    )}
                  </div>
                )}

                {/* Giới tính */}
                {(profileUser.gender?.value || (isMe && profileUser.gender?.value === 'other')) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <User size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Giới tính:</span>
                    <span>
                      {profileUser.gender.value === 'male' ? 'Nam' : profileUser.gender.value === 'female' ? 'Nữ' : profileUser.gender.value === 'other' ? 'Khác' : 'Khác'}
                    </span>
                    {isMe && !profileUser.gender.isPublic && (
                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} title="Chỉ mình bạn nhìn thấy">
                        <Lock size={10} /> Riêng tư
                      </span>
                    )}
                  </div>
                )}

                {/* Quốc gia */}
                {(profileUser.country?.value || (isMe && profileUser.country?.value === '')) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Quốc gia:</span>
                    <span>{profileUser.country.value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa thiết lập</span>}</span>
                    {isMe && !profileUser.country.isPublic && (
                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} title="Chỉ mình bạn nhìn thấy">
                        <Lock size={10} /> Riêng tư
                      </span>
                    )}
                  </div>
                )}

                {/* Ngày sinh */}
                {(profileUser.birthday?.value || (isMe && !profileUser.birthday?.value)) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Ngày sinh:</span>
                    <span>
                      {profileUser.birthday?.value ? new Date(profileUser.birthday.value).toLocaleDateString('vi-VN') : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa thiết lập</span>}
                    </span>
                    {isMe && !profileUser.birthday?.isPublic && (
                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} title="Chỉ mình bạn nhìn thấy">
                        <Lock size={10} /> Riêng tư
                      </span>
                    )}
                  </div>
                )}

                {/* Nghề nghiệp */}
                {(profileUser.occupation?.value || (isMe && profileUser.occupation?.value === '')) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Nghề nghiệp:</span>
                    <span>{profileUser.occupation.value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa thiết lập</span>}</span>
                    {isMe && !profileUser.occupation.isPublic && (
                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} title="Chỉ mình bạn nhìn thấy">
                        <Lock size={10} /> Riêng tư
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Các liên kết mạng xã hội tùy chỉnh */}
              {profileUser.customSocialLinks && profileUser.customSocialLinks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Mạng xã hội liên kết:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {profileUser.customSocialLinks.map((link: any, idx: number) => {
                      const PlatformIcon = getPlatformIcon(link.platform);
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--glass-border)', fontSize: '13px' }}>
                          <PlatformIcon size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600 }}>{link.platform}:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{link.username}</span>
                          {isMe && !link.isPublic && (
                            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }} title="Riêng tư">
                              <Lock size={10} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                {artworks.length}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Tác phẩm
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                {profileUser.totalLikes || 0}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Yêu thích
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Các Tab của Portfolio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <button
            onClick={() => setActiveTab('works')}
            style={{
              background: 'none',
              border: 'none',
              padding: '16px 24px',
              cursor: 'pointer',
              color: activeTab === 'works' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '15px',
              borderBottom: activeTab === 'works' ? '2px solid var(--primary)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t.portfolio} ({artworks.length})
          </button>
        </div>

        {/* Lưới hiển thị các Tab */}
        {loadingArtworks ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : activeTab === 'works' && displayedWorks.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.noWorks}</div>
        ) : activeTab === 'works' ? (
          <div className="masonry-grid">
            {displayedWorks.map((artwork) => (
              <ArtworkCard key={artwork._id} artwork={artwork} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>Chức năng đang được tích hợp thêm.</div>
        )}
      </div>

      {/* Popup Modal tạo yêu cầu Commission */}
      {showCommissionModal && (
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
              maxWidth: '560px',
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
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{t.newRequest}</h2>
              <button
                onClick={() => setShowCommissionModal(false)}
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
            <form onSubmit={handleCommissionSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {commError && (
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
                  {commError}
                </div>
              )}

              {/* Tiêu đề */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestTitle} *</label>
                <input
                  type="text"
                  className="glass-input"
                  value={commTitle}
                  onChange={(e) => setCommTitle(e.target.value)}
                  placeholder="Vẽ chân dung anime cho tôi..."
                  required
                />
              </div>

              {/* Mô tả (Ngắn gọn) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestDesc} *</label>
                <textarea
                  className="glass-input"
                  rows={4}
                  value={commDesc}
                  onChange={(e) => setCommDesc(e.target.value)}
                  placeholder="Mô tả chi tiết kiểu dáng, màu sắc, bối cảnh nhân vật..."
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              {/* Giá cả */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestPrice} *</label>
                <input
                  type="number"
                  className="glass-input"
                  value={commPrice}
                  onChange={(e) => setCommPrice(Number(e.target.value))}
                  min={50000}
                  step={50000}
                  required
                />
              </div>

              {/* Hạn chót (Deadline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.requestDeadline} *</label>
                <input
                  type="date"
                  className="glass-input"
                  value={commDeadline}
                  onChange={(e) => setCommDeadline(e.target.value)}
                  required
                />
              </div>

              {/* Ảnh mẫu/tham khảo (Reference Images) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>
                  {language === 'vn' ? 'Ảnh mẫu/tham khảo (Tối đa 5 ảnh)' : 'Reference Images (Max 5)'}
                </label>
                <input
                  type="file"
                  className="glass-input"
                  multiple
                  accept="image/*"
                  onChange={handleRefImagesChange}
                  style={{ padding: '8px' }}
                />
                {refImagePreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {refImagePreviews.map((url, index) => (
                      <div key={index} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                        <img src={url} alt="Ref Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveRefImage(index)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            backgroundColor: 'rgba(239, 68, 68, 0.85)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '9px',
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hộp kiểm đặt ở chế độ riêng tư (Private) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="commPrivate"
                  checked={commPrivate}
                  onChange={(e) => setCommPrivate(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="commPrivate" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  {t.isPrivateRequest}
                </label>
              </div>

              {/* Các nút hành động */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '20px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingCommission}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCommission}>
                  <Briefcase size={16} />
                  {isSubmittingCommission ? 'Đang thực hiện...' : t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Modal xem điều khoản yêu cầu lấy cảm hứng từ Pixiv */}
      {showTermsPopup && profileUser?.requestTerms?.hasTerms && (
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
              maxWidth: '560px',
              width: '100%',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 1. Phân khúc Header ảnh bìa */}
            <div
              style={{
                height: '180px',
                backgroundColor: 'var(--bg-tertiary)',
                backgroundImage: profileUser.requestTerms.backgroundUrl
                  ? `url(${profileUser.requestTerms.backgroundUrl.startsWith('http') ? profileUser.requestTerms.backgroundUrl : `${API_BASE_URL}${profileUser.requestTerms.backgroundUrl}`})`
                  : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              {/* Nút đóng */}
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(10, 11, 16, 0.6)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              {/* Lớp phủ Avatar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-32px',
                  left: '32px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '12px'
                }}
              >
                <img
                  src={getImageUrl(profileUser.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profileUser.username}
                  alt={profileUser.nickname}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--bg-secondary)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>
            </div>

            {/* 2. Phân khúc nội dung chi tiết */}
            <div
              style={{
                padding: '48px 32px 32px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--primary)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Điều khoản đặt vẽ tranh
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profileUser.requestTerms.title}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  bởi @{profileUser.username}
                </span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '16px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {profileUser.requestTerms.details}
              </div>

              {/* Banner hiển thị mức giá mục tiêu (Target price) */}
              <div
                style={{
                  backgroundColor: 'rgba(20, 184, 166, 0.05)',
                  border: '1px solid rgba(20, 184, 166, 0.1)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Giá khởi điểm tối thiểu đề xuất:
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(profileUser.requestTerms.targetPrice)}
                </span>
              </div>
            </div>

            {/* 3. Phân khúc chân trang hành động (Action Footer) */}
            <div
              style={{
                padding: '20px 32px',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <button
                onClick={() => setShowTermsPopup(false)}
                className="btn btn-secondary"
                style={{ borderRadius: '20px' }}
              >
                Đóng lại
              </button>
              <button
                onClick={() => {
                  setShowTermsPopup(false);
                  setShowCommissionModal(true);
                }}
                className="btn btn-accent"
                style={{ borderRadius: '20px', padding: '10px 28px' }}
              >
                <Briefcase size={16} />
                Đặt vẽ tranh ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Popup Modal chỉnh sửa hồ sơ (Edit Profile) */}
      {showEditModal && (
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
              maxWidth: '700px',
              width: '100%',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column',
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
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-secondary)',
                zIndex: 110,
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} style={{ color: 'var(--primary)' }} />
                Chỉnh sửa trang cá nhân
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
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
            <form onSubmit={handleSaveEditProfile} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {editError && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '12px 16px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  {editSuccess}
                </div>
              )}

              {/* 1. Ảnh bìa Cover & Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>Ảnh bìa trang cá nhân</label>
                <div
                  style={{
                    height: '140px',
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-tertiary)',
                    position: 'relative',
                    backgroundImage: bannerPreview
                      ? `url(${bannerPreview.startsWith('blob') || bannerPreview.startsWith('http') ? bannerPreview : `${API_BASE_URL}${bannerPreview}`})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(10, 11, 16, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <label
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(10, 11, 16, 0.75)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <Camera size={14} />
                      Thay đổi ảnh bìa
                      <input type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={getImageUrl(avatarPreview) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profileUser.username}
                    alt="avatar"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--bg-secondary)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  />
                  <label
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px var(--primary-glow)',
                    }}
                  >
                    <Upload size={12} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Ảnh đại diện</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tải ảnh đại diện để nhận diện cá nhân của bạn.</p>
                </div>
              </div>

              {/* 2. Biệt danh & Bio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Biệt danh *</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={nicknameVal}
                    onChange={(e) => setNicknameVal(e.target.value)}
                    placeholder="Nhập biệt danh..."
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700 }}>Giới thiệu bản thân</label>
                  <textarea
                    className="glass-input"
                    rows={3}
                    value={bioVal}
                    onChange={(e) => setBioVal(e.target.value)}
                    placeholder="Viết một vài dòng giới thiệu về bản thân..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              {/* 3. Website & Sự riêng tư (Privacy) */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800 }}>Website cá nhân</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="glass-input"
                    value={websiteVal}
                    onChange={(e) => setWebsiteVal(e.target.value)}
                    placeholder="https://mywebsite.com"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="websitePublic"
                      checked={websitePublic}
                      onChange={(e) => setWebsitePublic(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="websitePublic" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Công khai</label>
                  </div>
                </div>
              </div>

              {/* 4. Các liên kết mạng xã hội tùy chỉnh */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800 }}>Liên kết mạng xã hội khác</h4>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} /> Thêm liên kết
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {customSocialLinks.map((link, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto auto', gap: '12px', alignItems: 'center' }}>
                      <select
                        className="glass-input"
                        value={link.platform}
                        onChange={(e) => handleSocialLinkChange(idx, 'platform', e.target.value)}
                        style={{ height: '38px', padding: '0 8px' }}
                      >
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Twitter/X">Twitter/X</option>
                        <option value="YouTube">YouTube</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Discord">Discord</option>
                        <option value="Pinterest">Pinterest</option>
                        <option value="DeviantArt">DeviantArt</option>
                        <option value="Patreon">Patreon</option>
                        <option value="Khác">Khác</option>
                      </select>

                      <input
                        type="text"
                        className="glass-input"
                        value={link.username}
                        onChange={(e) => handleSocialLinkChange(idx, 'username', e.target.value)}
                        placeholder="Tên tài khoản hoặc URL..."
                        style={{ height: '38px' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          id={`social-pub-${idx}`}
                          checked={link.isPublic}
                          onChange={(e) => handleSocialLinkChange(idx, 'isPublic', e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <label htmlFor={`social-pub-${idx}`} style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Công khai</label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Xóa liên kết"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {customSocialLinks.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                      Chưa thêm mạng xã hội liên kết.
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Thông tin cá nhân bổ sung */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800 }}>Thông tin cá nhân bổ sung</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }} className="social-links-grid">
                  {/* Giới tính */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700 }}>Giới tính</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          id="genderPublic"
                          checked={genderPublic}
                          onChange={(e) => setGenderPublic(e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="genderPublic" style={{ fontSize: '11px', fontWeight: 600 }}>Công khai</label>
                      </div>
                    </div>
                    <select
                      className="glass-input"
                      value={genderVal}
                      onChange={(e) => setGenderVal(e.target.value)}
                      style={{ height: '40px' }}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  {/* Quốc gia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700 }}>Quốc gia</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          id="countryPublic"
                          checked={countryPublic}
                          onChange={(e) => setCountryPublic(e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="countryPublic" style={{ fontSize: '11px', fontWeight: 600 }}>Công khai</label>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="glass-input"
                      value={countryVal}
                      onChange={(e) => setCountryVal(e.target.value)}
                      placeholder="Việt Nam, Nhật Bản..."
                    />
                  </div>

                  {/* Ngày sinh */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700 }}>Ngày sinh</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          id="birthdayPublic"
                          checked={birthdayPublic}
                          onChange={(e) => setBirthdayPublic(e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="birthdayPublic" style={{ fontSize: '11px', fontWeight: 600 }}>Công khai</label>
                      </div>
                    </div>
                    <input
                      type="date"
                      className="glass-input"
                      value={birthdayVal}
                      onChange={(e) => setBirthdayVal(e.target.value)}
                    />
                  </div>

                  {/* Nghề nghiệp */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700 }}>Nghề nghiệp</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          id="occupationPublic"
                          checked={occupationPublic}
                          onChange={(e) => setOccupationPublic(e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="occupationPublic" style={{ fontSize: '11px', fontWeight: 600 }}>Công khai</label>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="glass-input"
                      value={occupationVal}
                      onChange={(e) => setOccupationVal(e.target.value)}
                      placeholder="Người dùng tự do, Thiết kế đồ họa..."
                    />
                  </div>
                </div>
              </div>

              {/* Các nút hành động */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--glass-border)',
                  paddingTop: '20px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  disabled={isUpdatingProfile}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile}>
                  <Save size={16} />
                  {isUpdatingProfile ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
