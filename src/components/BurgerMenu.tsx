import { Clock, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import { useRestaurantStatus } from '../hooks/useRestaurantStatus';
import { AddressSearch } from './AddressSearch';
import { useDeliveryStore } from '../store/deliveryStore';
import type { DeliveryResult } from '../lib/deliveryService';

export function BurgerMenu({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Добавляем/убираем класс к body когда меню открыто/закрыто
  useEffect(() => {
    if (open) {
      document.body.classList.add('burger-menu-open');
    } else {
      document.body.classList.remove('burger-menu-open');
    }
    return () => {
      document.body.classList.remove('burger-menu-open');
    };
  }, [open]);
  const { isOpen, message } = useRestaurantStatus();
  
  // Delivery store
  const address = useDeliveryStore((s) => s.address);
  const setAddress = useDeliveryStore((s) => s.setAddress);
  const setDeliveryInfo = useDeliveryStore((s) => s.setDeliveryInfo);
  const setCoordinates = useDeliveryStore((s) => s.setCoordinates);

  // Обработка выбора адреса
  const handleAddressSelect = (result: DeliveryResult) => {
    setAddress(result.address);
    setDeliveryInfo(result);
    setCoordinates(result.coordinates);
  };

  if (!open) return null;

  return (
    <div 
      className="burger-menu-overlay"
      onClick={onClose}
    >
      <div 
        className="burger-menu-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Поиск адреса */}
        <div className="burger-menu-section">
          <div className="burger-menu-label">
            <MapPin size={18} style={{ color: '#B43F20' }} />
            <span>Адрес доставки</span>
          </div>
          <AddressSearch 
            onAddressSelect={handleAddressSelect}
            initialValue={address}
          />
        </div>

        {/* Время работы */}
        <div className="burger-menu-section">
          <div className="burger-menu-label">
            <Clock size={18} style={{ color: isOpen ? '#4CAF50' : '#B43F20' }} />
            <span>Время работы</span>
          </div>
          <div 
            className="burger-menu-status"
            style={{ 
              background: isOpen ? 'rgba(76, 175, 80, 0.1)' : 'rgba(180, 63, 32, 0.1)',
              border: `1px solid ${isOpen ? 'rgba(76, 175, 80, 0.3)' : 'rgba(180, 63, 32, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <div 
              style={{ 
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOpen ? '#4CAF50' : '#B43F20'
              }}
            />
            <p 
              style={{ 
                color: isOpen ? '#2e7d32' : '#B43F20',
                fontWeight: '600',
                fontSize: '14px',
                margin: 0
              }}
            >
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
