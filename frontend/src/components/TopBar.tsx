import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Wallet,
  CheckCircle,
  Plus,
  LogOut,
  Image,
} from 'lucide-react';
import type { RootState } from '../store';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../store/notificationApi';
import { useGetWalletBalanceQuery } from '../store/walletApi';
import { translations } from '../utils/translation';
import { getImageUrl } from '../utils/url';
import { logout } from '../store/authSlice';
import { useLogoutMutation } from '../store/authApi';
import { disconnectSocket } from '../utils/socket';


export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  const [searchVal, setSearchVal] = useState('');
  const [searchType, setSearchType] = useState<'artwork' | 'user'>('artwork');
  const [showNotif, setShowNotif] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [triggerLogout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await triggerLogout().unwrap();
      dispatch(logout());
      disconnectSocket();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      dispatch(logout());
      navigate('/login');
    }
  };

  // Các câu truy vấn (Queries)
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 15000, // Fallback poll định kỳ phòng trường hợp WS bị ngắt kết nối
  });

  const { data: balanceData } = useGetWalletBalanceQuery(undefined, {
    skip: !user,
    pollingInterval: 10000, // Đồng bộ hóa số dư định kỳ
  });
  
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Đồng bộ hóa URL search query nếu tồn tại
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) setSearchVal(q);
    
    const typeParam = params.get('type');
    if (typeParam === 'user' || typeParam === 'artwork') {
      setSearchType(typeParam as 'artwork' | 'user');
    } else {
      setSearchType('artwork');
    }
  }, [location]);

  useEffect(() => {
    // Đóng dropdown khi nhấp ra ngoài
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchVal.trim())}&type=${searchType}`);
    } else {
      navigate(`/explore?type=${searchType}`);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await markRead(notif._id).unwrap();
      
      // Điều hướng tùy thuộc vào loại
      if (notif.targetModel === 'Illustration' && notif.targetId) {
        navigate(`/artwork/${notif.targetId}`);
      } else if (notif.targetModel === 'Commission') {
        navigate('/commissions');
      } else if (notif.targetModel === 'Message') {
        navigate('/messenger');
      }
      setShowNotif(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  return (
    <header
      className="glass-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        height: '72px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Cột trái: Logo & Tên website */}
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          color: 'var(--primary)',
          width: '25%',
          minWidth: '150px'
        }}
      >
        <img
          src="/favicon.png"
          alt="ArtCom"
          style={{
            width: '32px',
            height: '32px',
            objectFit: 'contain',
            borderRadius: '4px',
            filter: 'drop-shadow(0 0 8px var(--primary-glow))'
          }}
          onError={(e) => {
            // Fallback sang Lucide Image icon nếu load favicon.png thất bại
            e.currentTarget.style.display = 'none';
            const fallback = document.getElementById('logo-fallback-icon');
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          id="logo-fallback-icon"
          style={{ display: 'none', alignItems: 'center' }}
        >
          <Image size={32} style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
        </div>
        <span
          style={{
            fontWeight: 800,
            fontSize: '20px',
            letterSpacing: '0.5px',
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ArtCom
        </span>
      </div>

      {/* Cột giữa: Thanh tìm kiếm căn giữa (Search Bar) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            height: '40px',
            width: '100%',
            maxWidth: '420px',
            padding: '0 8px',
            gap: '4px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'artwork' | 'user')}
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 8px',
              borderRight: '1px solid var(--glass-border)',
              height: '24px',
            }}
          >
            <option value="artwork" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {language === 'vn' ? 'Tranh' : 'Arts'}
            </option>
            <option value="user" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {language === 'vn' ? 'Người dùng' : 'Users'}
            </option>
          </select>
          
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '8px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={searchType === 'user' ? (language === 'vn' ? 'Tìm người dùng' : 'Search users') : t.searchPlaceholder}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                paddingLeft: '32px',
                paddingRight: '8px',
                height: '32px',
                outline: 'none',
                fontSize: '14px',
              }}
            />
          </div>
        </form>
      </div>

      {/* Cột phải: Thông tin người dùng, Ví, Notifications & Hành động */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end', width: '40%' }}>
        {/* Widget hiển thị số dư ví (Wallet Balance) */}
        {user && (
          <div
            onClick={() => navigate('/wallet')}
            className="pulse-active"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--glass-border)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--accent)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Wallet size={16} />
            <span>{formatVND(balanceData?.walletBalance ?? user.walletBalance ?? 0)}</span>
          </div>
        )}

        {/* Nút đăng bài viết trên Header */}
        {user && (
          <button
            onClick={() => navigate('/explore?upload=true')}
            className="btn btn-primary animate-fade-in"
            style={{
              borderRadius: '20px',
              height: '40px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Plus size={16} />
            <span>{language === 'vn' ? 'Đăng tác phẩm' : 'Upload Art'}</span>
          </button>
        )}

        {/* Chỉ báo notification */}
        {user && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="btn btn-secondary"
              style={{
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    backgroundColor: 'var(--danger)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    fontSize: '10px',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown hiển thị notifications */}
            {showNotif && (
              <div
                className="glass-panel animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50px',
                  width: '360px',
                  maxHeight: '480px',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--card-shadow)',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: '1px solid var(--glass-border)',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>{t.notifications} ({notifications.length})</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle size={14} />
                      {t.markAllRead}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      {t.noNewNotifications}
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          backgroundColor: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = notif.isRead
                            ? 'transparent'
                            : 'rgba(99, 102, 241, 0.05)')
                        }
                      >
                        <img
                          src={getImageUrl(notif.actorId?.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + notif._id}
                          alt="avatar"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: notif.isRead ? 400 : 700 }}>
                            {notif.contentPreview}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Chỉ báo notification (kết thúc phía trên) */}

        {/* Avatar, biệt danh người dùng, và các nút Đăng nhập/Đăng xuất */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => navigate(`/portfolio/${user._id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'opacity var(--transition-fast)'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <img
                src={getImageUrl(user.avatarUrl) || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}
                alt={user.nickname}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {user.nickname}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                color: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
              }}
            >
              <LogOut size={14} />
              <span>{t.logout}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary animate-fade-in"
            style={{
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 14px var(--primary-glow)',
            }}
          >
            {t.login}
          </button>
        )}
      </div>
    </header>
  );
};
