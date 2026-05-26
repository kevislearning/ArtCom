import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Save, Globe, Upload, User, Award, Key, Sun, Moon } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { setLanguage, updateUser } from '../store/authSlice';
import { useUpdateProfileMutation, useChangePasswordMutation } from '../store/authApi';
import { getImageUrl } from '../utils/url';

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

  // Profile Edit State
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [twitter, setTwitter] = useState(user?.socialLinks?.twitter || '');
  const [behance, setBehance] = useState(user?.socialLinks?.behance || '');
  const [artstation, setArtstation] = useState(user?.socialLinks?.artstation || '');

  // File states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [bannerPreview, setBannerPreview] = useState(user?.bannerUrl || '');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPw }] = useChangePasswordMutation();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('nickname', nickname.trim());
    formData.append('bio', bio.trim());
    
    const socialLinks = { twitter, behance, artstation };
    formData.append('socialLinks', JSON.stringify(socialLinks));

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    try {
      const updated = await updateProfile(formData).unwrap();
      dispatch(updateUser(updated));
      setSuccessMsg('Đã cập nhật thông tin trang cá nhân thành công!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin!');
    }
  };

  const toggleLanguageOption = (lang: 'vn' | 'en') => {
    dispatch(setLanguage(lang));
  };

  const handleToggleTheme = (nextTheme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccessMsg('');
    setPwErrorMsg('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPwErrorMsg('Vui lòng điền đầy đủ tất cả các trường!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwErrorMsg('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
      return;
    }

    if (newPassword.length < 6) {
      setPwErrorMsg('Mật khẩu mới phải chứa ít nhất 6 ký tự!');
      return;
    }

    try {
      const result = await changePassword({ currentPassword, newPassword }).unwrap();
      setPwSuccessMsg(result.message || 'Thay đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error(err);
      setPwErrorMsg(err.data?.message || 'Không thể đổi mật khẩu, vui lòng kiểm tra lại!');
    }
  };

  const API_BASE_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.settings}</h1>

      {/* Message Alerts */}
      {(successMsg || errorMsg) && (
        <div
          style={{
            backgroundColor: errorMsg ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: errorMsg ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
            color: errorMsg ? 'var(--danger)' : 'var(--success)',
            padding: '16px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {errorMsg || successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '32px', alignItems: 'start' }} className="settings-grid">
        {/* Left Column: Profile editing form */}
        {user ? (
          <form
            onSubmit={handleSubmit}
            className="glass-panel animate-fade-in"
            style={{
              padding: '32px',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--primary)' }} />
              {t.editProfile}
            </h2>

            {/* Banner Cover edit picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.banner}</label>
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
                    <Upload size={14} />
                    Thay đổi ảnh bìa
                    <input type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Avatar image edit picker */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={getImageUrl(avatarPreview) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}
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
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{t.avatar}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chấp nhận các file định dạng hình ảnh tối đa 10MB.</p>
              </div>
            </div>

            {/* Nickname & Bio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.nickname}</label>
                <input
                  type="text"
                  className="glass-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nhập biệt danh của bạn..."
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>{t.bio}</label>
                <textarea
                  className="glass-input"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Mô tả ngắn về bạn..."
                  style={{ resize: 'none' }}
                />
              </div>

              <div></div>
            </div>

            {/* Social Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800 }}>Mạng xã hội liên kết</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="social-links-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={14} style={{ color: '#1da1f2' }} />
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    className="glass-input"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} style={{ color: '#0057ff' }} />
                    Behance URL
                  </label>
                  <input
                    type="url"
                    className="glass-input"
                    value={behance}
                    onChange={(e) => setBehance(e.target.value)}
                    placeholder="https://behance.net/..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }} className="span-full">
                  <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={14} style={{ color: '#139df3' }} />
                    Artstation URL
                  </label>
                  <input
                    type="url"
                    className="glass-input"
                    value={artstation}
                    onChange={(e) => setArtstation(e.target.value)}
                    placeholder="https://artstation.com/..."
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '44px', alignSelf: 'flex-end' }} disabled={isLoading}>
              <Save size={16} />
              {isLoading ? 'Đang cập nhật...' : t.save}
            </button>
          </form>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              textAlign: 'center',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px dashed var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            Vui lòng đăng nhập để thay đổi thiết lập tài khoản.
          </div>
        )}

        {/* Right Column: Language, Theme, and Password settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Language and Theme Settings Card */}
          <div
            className="glass-panel animate-fade-in"
            style={{
              padding: '32px',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--glass-border)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              width: '100%',
            }}
          >
            {/* Language Switch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} style={{ color: 'var(--accent)' }} />
                {t.languageSelect}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleLanguageOption('vn')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    backgroundColor: language === 'vn' ? 'var(--primary)' : 'transparent',
                    color: language === 'vn' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Tiếng Việt (Default)
                </button>
                <button
                  type="button"
                  onClick={() => toggleLanguageOption('en')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    backgroundColor: language === 'en' ? 'var(--primary)' : 'transparent',
                    color: language === 'en' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  English
                </button>
              </div>
            </div>

            {/* Theme Switch (Moved from TopBar) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--primary)' }} /> : <Sun size={18} style={{ color: 'var(--warning)' }} />}
                {t.themeSelect}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleTheme('dark')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    backgroundColor: theme === 'dark' ? 'var(--primary)' : 'transparent',
                    color: theme === 'dark' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Dark Mode (Tối)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTheme('light')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '13px',
                    backgroundColor: theme === 'light' ? 'var(--primary)' : 'transparent',
                    color: theme === 'light' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Light Mode (Sáng)
                </button>
              </div>
            </div>
          </div>

          {/* Secure Password Change Card */}
          {user && (
            <form
              onSubmit={handlePasswordChange}
              className="glass-panel animate-fade-in"
              style={{
                padding: '32px',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--glass-border)',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                Đổi mật khẩu bảo mật
              </h3>

              {pwSuccessMsg && (
                <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  {pwSuccessMsg}
                </div>
              )}
              {pwErrorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  {pwErrorMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  className="glass-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Mật khẩu mới *</label>
                <input
                  type="password"
                  className="glass-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  className="glass-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '40px', marginTop: '4px', width: '100%' }}
                disabled={isChangingPw}
              >
                {isChangingPw ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
