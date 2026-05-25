import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Wallet,
  Menu,
  CheckCircle,
  Plus,
} from 'lucide-react';
import type { RootState } from '../store';
import { setLanguage } from '../store/authSlice';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../store/notificationApi';
import { useGetWalletBalanceQuery } from '../store/walletApi';
import { translations } from '../utils/translation';

interface TopBarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const TopBar = ({ collapsed, setCollapsed }: TopBarProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

  const [searchVal, setSearchVal] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 15000, // Fallback poll in case WS drops
  });

  const { data: balanceData } = useGetWalletBalanceQuery(undefined, {
    skip: !user,
    pollingInterval: 10000, // Sync balance periodically
  });
  
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Sync URL search query if exists
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) setSearchVal(q);
  }, [location]);

  useEffect(() => {
    // Close dropdown on click outside
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
      navigate(`/explore?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await markRead(notif._id).unwrap();
      
      // Navigate depending on type
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
          }}
        >
          <Menu size={24} />
        </button>

        {/* Global Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            position: 'relative',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="glass-input"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%',
              paddingLeft: '44px',
              paddingRight: '16px',
              borderRadius: '24px',
              height: '40px',
            }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Wallet Balance Widget */}
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

        {/* Create Post Header button */}
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



        {/* Notification indicator */}
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

            {/* Notification Dropdown */}
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
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>{t.comments} ({notifications.length})</span>
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
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      Không có thông báo mới.
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
                          src={notif.actorId?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + notif._id}
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
      </div>
    </header>
  );
};
