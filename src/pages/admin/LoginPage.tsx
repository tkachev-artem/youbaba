import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import '../../styles/orders.css';

/**
 * Единая страница авторизации для админки
 */
export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ username, password });
      // После успешной авторизации переходим на страницу товаров
      navigate('/admin/products');
    } catch (err) {
      // Ошибка уже в store
    }
  };

  return (
    <div className="orders-login-page">
      <div className="orders-login-container">
        <div className="orders-login-card">
          <div className="orders-login-header">
            <h1 className="orders-login-title">Админ-панель</h1>
            <p className="orders-login-subtitle">YouBaBa</p>
          </div>

          <form onSubmit={handleSubmit} className="orders-login-form">
            <div className="orders-login-field">
              <label htmlFor="username" className="orders-login-label">
                Логин
              </label>
              <input
                id="username"
                type="text"
                className="orders-login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="orders-login-field">
              <label htmlFor="password" className="orders-login-label">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                className="orders-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="orders-login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="orders-login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="orders-login-footer">
            <p className="orders-login-hint">
              Доступ только для администраторов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
