import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useLoginMutation, useGoogleLoginMutation } from '../store/authApi';
import { setCredentials } from '../store/authSlice';
import type { RootState } from '../store';
import { translations } from '../utils/translation';

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [loginUser, { isLoading }] = useLoginMutation();
  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrUsername || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    try {
      const response = await loginUser({ emailOrUsername, password }).unwrap();
      dispatch(setCredentials({ user: response, token: response.token }));
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.message || 'Đăng nhập không thành công, vui lòng thử lại!');
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
      setErrorMsg(err.data?.message || 'Đăng nhập Google không thành công, vui lòng thử lại!');
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
        minHeight: '80vh',
        width: '100%',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: 'var(--border-radius-lg)',
          padding: '40px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            {t.login}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Chào mừng bạn trở lại với cộng đồng sáng tạo nghệ thuật!
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.username} / Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="glass-input"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Nhập tên tài khoản hoặc email..."
                style={{ width: '100%', paddingLeft: '44px', height: '44px' }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.password}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', paddingLeft: '44px', height: '44px' }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ height: '44px', fontSize: '15px', marginTop: '8px' }}
          >
            <LogIn size={18} />
            {isLoading ? 'Đang xác thực...' : t.login}
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
            text="signin_with"
            shape="pill"
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t.noAccount}{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            {t.register}
          </Link>
        </div>
      </div>
    </div>
  );
};
