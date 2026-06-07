import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Home,
  Compass,
  Users,
  Wallet,
  Briefcase,
  MessageSquare,
  Settings,
  Trophy,
  Bookmark,
  LayoutDashboard,
  Menu,
} from 'lucide-react';
import type { RootState } from '../store';
import { translations } from '../utils/translation';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (o: boolean) => void;
}

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) => {
  const { user, language } = useSelector((state: RootState) => state.auth);
  const t = translations[language];

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
    <>
      {/* Lớp nền mờ cho ngăn kéo di động (Backdrop for mobile drawer) */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      <aside
        className={`glass-panel sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          width: collapsed ? '80px' : '260px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--glass-border)',
          transition: 'width var(--transition-normal), transform var(--transition-normal)',
          padding: '24px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <style>{`
          /* Kiểu dáng di động cho ngăn kéo Sidebar (Mobile styles) */
          @media (max-width: 768px) {
            .sidebar {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              height: 100vh !important;
              width: 260px !important;
              transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
              z-index: 1000 !important;
              box-shadow: 5px 0 25px rgba(0, 0, 0, 0.4) !important;
            }
          }
        `}</style>

        {/* Hamburger Menu bật/tắt Sidebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginBottom: '32px',
            padding: '0 8px',
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              transition: 'background var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Danh sách điều hướng (Navigation list) */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
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
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Thông tin người dùng ở chân trang (Đã chuyển sang TopBar) */}
        <div style={{ marginTop: 'auto' }}></div>
      </aside>
    </>
  );
};
