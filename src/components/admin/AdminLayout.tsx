import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Package, LogOut, Settings, Image, ClipboardList, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import '../../styles/admin.css';

export function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Проверка размера экрана
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      // Если экран меньше 1024px, редирект на главную
      if (!desktop) {
        navigate('/', { replace: true });
      }
    };

    // Проверка при монтировании
    checkScreenSize();

    // Слушатель изменения размера окна
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  // Если не десктоп, показываем заглушку перед редиректом
  if (!isDesktop) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        background: '#f7f7f7'
      }}>
        <Monitor size={64} color="#B43F20" style={{ marginBottom: '20px' }} />
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
          Админ-панель доступна только на больших экранах
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
          Для работы с админ-панелью используйте устройство с разрешением экрана от 1024px
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            background: '#B43F20',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-info">
          <h1 className="admin-page-title">ЮБАБА: Админ-панель</h1>
          <p className="admin-page-subtitle">
            {user?.username && `Администратор: ${user.username}`}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="admin-nav-buttons">
          <Link
            to="/ord"
            className="admin-nav-btn"
          >
            <ClipboardList size={20} />
            Панель заказов
          </Link>

          <Link
            to="/admin/products"
            className={`admin-nav-btn ${isActive('/admin/products') || location.pathname.includes('/admin/products/') ? 'active' : ''}`}
          >
            <Package size={20} />
            Товары
          </Link>

          <Link
            to="/admin/hero-slides"
            className={`admin-nav-btn ${location.pathname.includes('/admin/hero-slides') ? 'active' : ''}`}
          >
            <Image size={20} />
            Hero-слайды
          </Link>

          <Link
            to="/admin/settings"
            className={`admin-nav-btn ${isActive('/admin/settings') ? 'active' : ''}`}
          >
            <Settings size={20} />
            Настройки ресторана
          </Link>

          <button onClick={handleLogout} className="admin-logout-btn">
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
