import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

// Các trang (Pages)
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { ArtworkDetails } from './pages/ArtworkDetails';
import { Portfolio } from './pages/Portfolio';
import { WalletDashboard } from './pages/WalletDashboard';
import { Commissions } from './pages/Commissions';
import { Messenger } from './pages/Messenger';
import { SettingsPage } from './pages/SettingsPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Following } from './pages/Following';
import { Rankings } from './pages/Rankings.tsx';
import { Bookmarks } from './pages/Bookmarks.tsx';
import { Dashboard } from './pages/Dashboard.tsx';

// Tiện ích (Utilities)
import { initSocket, disconnectSocket } from './utils/socket';
import { api } from './store/api';

function App() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Tải và áp dụng theme từ localStorage trong lần khởi động đầu tiên
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Khởi tạo WebSockets sau khi kích hoạt phiên đăng nhập (login session)
  useEffect(() => {
    if (token && user) {
      initSocket(
        token,
        () => {
          // Invalidate cache của notifications khi nhận được socket push alert mới
          dispatch(api.util.invalidateTags(['Notification']));
        },
        () => {
          // Invalidate cache của chats khi nhận được tin nhắn socket push alert mới
          dispatch(api.util.invalidateTags(['Chat']));
        }
      );
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [token, user, dispatch]);

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar có thể thu gọn (Collapsible Sidebar) */}
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        <div className="app-main">
          {/* Sticky Header trên cùng */}
          <TopBar />

          <main className="app-content animate-fade-in">
            <Routes>
              {/* Các Route công khai (Public Routes) */}
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/artwork/:id" element={<ArtworkDetails />} />
              <Route path="/portfolio/:id" element={<Portfolio />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/rankings" element={<Rankings />} />

              {/* Các Route được bảo vệ bằng phiên làm việc (Session Protected) */}
              <Route
                path="/following"
                element={user ? <Following /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/wallet"
                element={user ? <WalletDashboard /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/commissions"
                element={user ? <Commissions /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/messenger"
                element={user ? <Messenger /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/bookmarks"
                element={user ? <Bookmarks /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/dashboard"
                element={user ? <Dashboard /> : <Navigate to="/login" replace />}
              />

              {/* Các Route xác thực (Authentication Routes) */}
              <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to="/" replace />}
              />
              <Route
                path="/register"
                element={!user ? <Register /> : <Navigate to="/" replace />}
              />

              {/* Route mặc định dự phòng (Fallback Route) */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
