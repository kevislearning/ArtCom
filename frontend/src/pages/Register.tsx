import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useRegisterMutation, useGoogleLoginMutation } from '../store/authApi';
import { setCredentials } from '../store/authSlice';
import type { RootState } from '../store';
import { translations } from '../utils/translation';

export const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [registerUser, { isLoading }] = useRegisterMutation();
  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !email || !password) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    try {
      const response = await registerUser({
        username,
        email,
        password,
        nickname: nickname || username,
      }).unwrap();
      dispatch(setCredentials({ user: response, token: response.token }));
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.message || 'Đăng ký không thành công, vui lòng thử lại!');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setErrorMsg('');
    if (!credentialResponse.credential) {
      setErrorMsg('Không nhận được thông tin xác thực từ Google!');
      return;
    }
    try {
      const response = await googleLoginMutation({ credential: credentialResponse.credential }).unwrap();
      dispatch(setCredentials({ user: response, token: response.token }));
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.message || 'Đăng ký Google không thành công, vui lòng thử lại!');
    }
  };

  const handleGoogleError = () => {
    setErrorMsg('Xác thực tài khoản Google thất bại!');
  };


  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        width: '100%',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '460px',
          width: '100%',
          borderRadius: 'var(--border-radius-lg)',
          padding: '40px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              marginBottom: '8px',
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t.register}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Tham gia cộng đồng người dùng chuyên nghiệp hàng đầu!
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.username} *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="glass-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="viet_anh_123"
                style={{ width: '100%', paddingLeft: '44px', height: '42px' }}
                required
              />
              <UserIcon size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.email} *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="email"
                className="glass-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                style={{ width: '100%', paddingLeft: '44px', height: '42px' }}
                required
              />
              <Mail size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.password} *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu bảo mật..."
                style={{ width: '100%', paddingLeft: '44px', height: '42px' }}
                required
              />
              <Lock size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.nickname}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="glass-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Biệt danh hiển thị..."
                style={{ width: '100%', paddingLeft: '44px', height: '42px' }}
              />
              <UserIcon size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ height: '44px', fontSize: '15px', marginTop: '12px' }}
          >
            <UserPlus size={18} />
            {isLoading ? 'Đang tạo tài khoản...' : t.register}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--glass-border)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--glass-border)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            size="large"
            width="360"
            text="signup_with"
            shape="pill"
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t.haveAccount}{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            {t.login}
          </Link>
        </div>
      </div>
    </div>
  );
};
