import { Link, NavLink } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useDeliveryStore } from '../store/deliveryStore';
import { useEffect, useRef } from 'react';
import { Clock, ShoppingCart, Box } from 'lucide-react';
import { AddressSearch } from './AddressSearch';
import { useRestaurantStatus } from '../hooks/useRestaurantStatus';
import type { DeliveryResult } from '../lib/deliveryService';

export function Header({
  onBurgerClick,
  onCartClick
}: {
  onBurgerClick: () => void;
  onCartClick: () => void;
}) {
  const totalCount = useCartStore((s) => s.getTotalCount());
  const numberContainerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(totalCount);
  
  // Delivery store
  const address = useDeliveryStore((s) => s.address);
  const setAddress = useDeliveryStore((s) => s.setAddress);
  const setDeliveryInfo = useDeliveryStore((s) => s.setDeliveryInfo);
  const setCoordinates = useDeliveryStore((s) => s.setCoordinates);

  // Restaurant status
  const { isOpen, message } = useRestaurantStatus();

  // Обработка выбора адреса
  const handleAddressSelect = (result: DeliveryResult) => {
    setAddress(result.address);
    setDeliveryInfo(result);
    setCoordinates(result.coordinates);
  };

  useEffect(() => {
    // Если количество изменилось, запускаем анимацию
    if (totalCount !== prevCountRef.current && numberContainerRef.current) {
      const container = numberContainerRef.current;
      
      // Добавляем класс для анимации
      container.classList.add('show');
      
      // Удаляем класс после окончания анимации
      const timer = setTimeout(() => {
        container.classList.remove('show');
      }, 500);
      
      prevCountRef.current = totalCount;
      return () => clearTimeout(timer);
    }
  }, [totalCount]);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo-container">
          <img src="/Images/Icons/LOGO.png" alt="Логотип" className="logo" />
        </Link>

        <div className="search-container">
          <AddressSearch 
            onAddressSelect={handleAddressSelect}
            initialValue={address}
          />
        </div>

        <div className="opening-hours-container">
          <Clock 
            size={18}
            style={{ color: isOpen ? '#4CAF50' : '#B43F20', flexShrink: 0 }}
          />
          <p 
            className="opening-hours-text"
            style={{ color: isOpen ? '#4CAF50' : '#B43F20' }}
          >
            {message}
          </p>
        </div>

        <nav className="menu-nav">
          <Link
            to="#"
            className="header-btn cart-btn"
            onClick={(e) => {
              e.preventDefault();
              onCartClick();
            }}
          >
            <span className="cart-btn-text">Корзина</span>
            <ShoppingCart className="cart-btn-icon" size={20} />
            <div className="number-container" ref={numberContainerRef}>
              <p className="number">{totalCount}</p>
            </div>
          </Link>

          <Link to="/orders" className="header-btn orders-btn">
            <Box size={20} color="white" />
          </Link>

          <div className="burger-container" onClick={onBurgerClick} role="button" tabIndex={0}>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
          </div>
        </nav>
      </div>
    </header>
  );
}
