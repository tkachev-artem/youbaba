import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { BurgerMenu } from './BurgerMenu';
import { CartDrawer } from './CartDrawer';
import { Header } from './Header';
import { Toast } from './Toast';
import { useRestaurantStatus } from '../hooks/useRestaurantStatus';

export function Layout({ children }: { children: ReactNode }) {
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { phone, getFormattedSchedule } = useRestaurantStatus();

  const toggleBurger = useCallback(() => setBurgerOpen(prev => !prev), []);
  const closeBurger = useCallback(() => setBurgerOpen(false), []);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <div className="wrapper">
      <Header onBurgerClick={toggleBurger} onCartClick={openCart} />
      <BurgerMenu
        open={burgerOpen}
        onClose={closeBurger}
      />
      <CartDrawer open={cartOpen} onClose={closeCart} />
      <Toast />

      {children}

      {/* Footer восстановлен из YouBaBa/Pages/index.html */}
      <footer className="footer" id="footer">
        <div className="footer-container">
          <div className="footer-panel-container">
            <div className="footer-panel" id="service-panel">
              <div className="footer-panel-title-container">
                <h1 className="footer-title">Сервис</h1>
                <img src="/Images/Icons/Cloud.png" alt="" className="footer-icon" />
              </div>
              <div className="footer-line"></div>
              <div className="footer-nav-container">
                <Link to="/" className="footer-btn">
                  Главная
                </Link>
                <a href="#" className="footer-btn">
                  О нас
                </a>
                <a href="https://yandex.com/maps/org/yubaba/91686760604/reviews/" target="_blank" rel="noopener noreferrer" className="footer-btn">
                  Отзывы
                </a>
              </div>
            </div>

            <div className="footer-panel" id="politika">
              <div className="footer-panel-title-container">
                <h1 className="footer-title">Правовая информация</h1>
                <img src="/Images/Icons/list.png" alt="" className="footer-icon" id="list-icon" />
              </div>
              <div className="footer-line"></div>
              <div className="footer-nav-container">
                <a href="#" className="footer-btn">
                  Политика конфиденциальности
                </a>
                <a href="#" className="footer-btn">
                  Публичная оферта
                </a>
                <a href="#" className="footer-btn">
                  Безопасные платежи
                </a>
                <a href="#" className="footer-btn">
                  Политика возврата
                </a>
              </div>
            </div>

            <div className="footer-panel" id="phone-panel">
              <h1 className="footer-phone">{phone}</h1>
              <p className="footer-opening-hours">{getFormattedSchedule()}</p>
            </div>

            <div className="footer-social-container">
              <div className="footer-social-line footer-social-line-1"></div>
              <div className="footer-social-info">
                <div className="footer-social-title-container">
                  <h1 className="footer-social-title">Наши соцсети</h1>
                  <p className="footer-social-text">Будьте в курсе всех новостей!</p>
                </div>
                <div className="footer-social-btn-container">
                  <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} className="footer-social-btn">
                    <img src="/Images/Icons/What'sapp.png" alt="" className="footer-social-icon" />
                  </a>
                </div>
              </div>
              <div className="footer-social-line footer-social-line-2"></div>
            </div>

            <div className="footer-document-container">
              <nav className="footer-document-nav">
                <a href="#" className="footer-btn" id="document-btn">
                  Политика конфиденциальности
                </a>
                <a href="#" className="footer-btn" id="document-btn">
                  Публичная оферта
                </a>
                <a href="#" className="footer-btn" id="document-btn">
                  Безопасные платежи
                </a>
                <a href="#" className="footer-btn" id="document-btn">
                  Политика возврата
                </a>
                <a href="#" className="footer-btn" id="document-btn">
                  ИП Барсегян София Седраковна
                </a>
              </nav>
            </div>
          </div>

          <div className="footer-right-container">
            <h1 className="footer-right-title">Юбаба 2026</h1>
            <p className="footer-right" id="pc-document">
              ИП Барсегян София Седраковна
            </p>
            <p className="footer-right">Все права защищены</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
