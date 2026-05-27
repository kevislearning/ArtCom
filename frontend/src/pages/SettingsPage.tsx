import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Globe, Key, Sun, Moon } from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';
import { setLanguage } from '../store/authSlice';
import { useChangePasswordMutation } from '../store/authApi';

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = language === 'en' ? translations.en : translations.vn;

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

  const [changePassword, { isLoading: isChangingPw }] = useChangePasswordMutation();

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.settings}</h1>

      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: user ? '1fr 1fr' : '1fr', 
          gap: '32px', 
          alignItems: 'start' 
        }} 
        className="settings-grid"
      >
        {/* Left Column: Language and Theme Settings Card */}
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

          {/* Theme Switch */}
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

        {/* Right Column: Secure Password Change Card */}
        {user ? (
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
      </div>
    </div>
  );
};
