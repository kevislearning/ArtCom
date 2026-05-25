import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  Compass,
  Users,
  Wallet,
  Briefcase,
  MessageSquare,
  Settings,
  LogOut,
  Image,
  Trophy,
  Bookmark,
  LayoutDashboard,
} from 'lucide-react';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import { useLogoutMutation } from '../store/authApi';
import { translations } from '../utils/translation';
import { disconnectSocket } from '../utils/socket';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar = ({ collapsed, setCollapsed }: SidebarProps) => {
  const dispatch = useDispatch();
  const { user, language } = useSelector((state: RootState) => state.auth);
  const [triggerLogout] = useLogoutMutation();
  const t = translations[language];

  const handleLogout = async () => {
    try {
      await triggerLogout().unwrap();
      dispatch(logout());
      disconnectSocket();
    } catch (err) {
      console.error('Logout failed', err);
      dispatch(logout());
    }
  };

  const navItems = [
    { to: '/', label: t.home, icon: Home },
    { to: '/explore', label: t.explore, icon: Compass },
    { to: '/rankings', label: t.rankings, icon: Trophy },
    ...(user ? [{ to: '/following', label: t.following, icon: Users }] : []),
    ...(user ? [{ to: '/bookmarks', label: t.bookmarksNav, icon: Bookmark }] : []),
    ...(user ? [{ to: '/wallet', label: t.wallet, icon: Wallet }] : []),
    ...(user ? [{ to: '/commissions', label: t.commissions, icon: Briefcase }] : []),
    ...(user ? [{ to: '/messenger', label: t.messenger, icon: MessageSquare }] : []),
    ...(user ? [{ to: '/dashboard', label: t.dashboardNav, icon: LayoutDashboard }] : []),
    { to: '/settings', label: t.settings, icon: Settings },
  ];

  return (
    <aside
      className={`glass-panel sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        width: collapsed ? '80px' : '260px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--glass-border)',
        transition: 'width var(--transition-normal)',
        padding: '24px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Sidebar Logo */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 8px',
          marginBottom: '32px',
          cursor: 'pointer',
          color: 'var(--primary)',
        }}
      >
        <Image size={32} style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
        {!collapsed && (
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
        )}
      </div>

      {/* Navigation list */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-sm)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px',
                boxShadow: isActive ? '0 4px 14px var(--primary-glow)' : 'none',
                transition: 'all var(--transition-fast)',
              })}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Auth user foot info */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <img
              src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={user.nickname}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--glass-border)',
              }}
            />
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.nickname}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{user.username}
                </p>
              </div>
            )}
          </div>
        )}

        {user ? (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--border-radius-sm)',
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              width: '100%',
              fontSize: '15px',
              transition: 'all var(--transition-fast)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }}
          >
            <LogOut size={20} />
            {!collapsed && <span>{t.logout}</span>}
          </button>
        ) : (
          <NavLink
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--border-radius-sm)',
              color: '#ffffff',
              backgroundColor: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              textAlign: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px var(--primary-glow)',
            }}
          >
            {!collapsed ? <span>{t.login}</span> : <Compass size={20} />}
          </NavLink>
        )}
      </div>
    </aside>
  );
};
