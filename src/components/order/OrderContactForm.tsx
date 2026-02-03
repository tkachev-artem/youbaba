import { useEffect } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { User } from 'lucide-react';

/**
 * Форма контактных данных (имя, телефон)
 */
export function OrderContactForm() {
  const name = useOrderStore((s) => s.name);
  const phone = useOrderStore((s) => s.phone);
  const setName = useOrderStore((s) => s.setName);
  const setPhone = useOrderStore((s) => s.setPhone);

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    const savedName = localStorage.getItem('orderContactName');
    const savedPhone = localStorage.getItem('orderContactPhone');
    
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
  }, [setName, setPhone]);

  // Обработчик изменения имени с сохранением в localStorage
  const handleNameChange = (value: string) => {
    setName(value);
    localStorage.setItem('orderContactName', value);
  };

  // Форматирование телефона
  const handlePhoneChange = (value: string) => {
    // Убираем все кроме цифр
    const digits = value.replace(/\D/g, '');
    
    // Форматируем
    let formatted = '+7';
    if (digits.length > 1) {
      formatted += ' (' + digits.substring(1, 4);
    }
    if (digits.length >= 5) {
      formatted += ') ' + digits.substring(4, 7);
    }
    if (digits.length >= 8) {
      formatted += '-' + digits.substring(7, 9);
    }
    if (digits.length >= 10) {
      formatted += '-' + digits.substring(9, 11);
    }
    
    setPhone(formatted);
    localStorage.setItem('orderContactPhone', formatted);
  };

  return (
    <div className="order-section-card">
      <div className="order-section-header-static">
        <User size={20} color="#B43F20" />
        <h2 className="order-section-title">Ваши данные</h2>
      </div>

      <div className="order-form-fields">
        <div className="order-form-field">
          <label htmlFor="order-name" className="order-form-label">
            Имя <span className="order-form-required">*</span>
          </label>
          <input
            id="order-name"
            type="text"
            className="order-input"
            placeholder="Иван Иванов"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="order-form-field">
          <label htmlFor="order-phone" className="order-form-label">
            Телефон <span className="order-form-required">*</span>
          </label>
          <input
            id="order-phone"
            type="tel"
            className="order-input"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            required
          />
        </div>
      </div>
    </div>
  );
}
