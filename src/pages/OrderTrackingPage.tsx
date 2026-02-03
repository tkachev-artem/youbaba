import { useState } from 'react';
import { Layout } from '../components/Layout';
import { trackOrder } from '../lib/api/orders';
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge';
import { Search, Box, Phone, User, MapPin, CreditCard, Package, Utensils, MessageCircle, Truck, Store, CircleAlert } from 'lucide-react';

export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOrderNumberChange = (value: string) => {
    // Удаляем все, кроме латинских букв и цифр
    let cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Ограничиваем первый символ только латинской буквой
    if (cleaned.length > 0 && !/[A-Z]/.test(cleaned[0])) {
      cleaned = cleaned.substring(1);
    }
    
    // Форматируем: буква + дефис + цифры
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned[0]; // Первая буква
      if (cleaned.length > 1) {
        formatted += '-' + cleaned.substring(1, 4); // Максимум 3 цифры после дефиса
      }
    }
    
    setOrderNumber(formatted);
  };

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
  };

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      setError('Введите номер заказа');
      return;
    }

    if (!phone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await trackOrder(orderNumber.trim(), phone.replace(/\D/g, ''));
      
      if (!result.success) {
        setError(result.message || 'Заказ не найден');
        setOrderData(null);
      } else {
        setOrderData(result.data);
      }
    } catch (err) {
      setError('Ошибка при поиске заказа');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="order-page">
        <div className="order-container">
          <div className="order-tracking-card">
            {!orderData && (
              <>
                <div className="order-tracking-header">
                  <Box size={40} color="#B43F20" />
                  <h1 className="order-tracking-title">Отслеживание заказа</h1>
                  <p className="order-tracking-subtitle">
                    Введите номер заказа и телефон для отслеживания статуса
                  </p>
                </div>

                <div className="order-tracking-form">
                  <div className="modal-form-field">
                    <label htmlFor="order-number">Номер заказа</label>
                    <input
                      id="order-number"
                      type="text"
                      value={orderNumber}
                      onChange={(e) => handleOrderNumberChange(e.target.value)}
                      placeholder="Например: S-001"
                      maxLength={5}
                    />
                  </div>

                  <div className="modal-form-field">
                    <label htmlFor="phone">Номер телефона</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>

                  {error && (
                    <div className="order-error">
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="order-tracking-btn"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    <Search size={20} />
                    <span>{loading ? 'Поиск...' : 'Найти заказ'}</span>
                  </button>
                </div>
              </>
            )}

            {orderData && (
              <div className="order-tracking-result">
                {/* Кнопка "Назад к поиску" */}
                <button
                  type="button"
                  className="order-tracking-back-btn"
                  onClick={() => {
                    setOrderData(null);
                    setOrderNumber('');
                    setPhone('');
                    setError('');
                  }}
                >
                  <Search size={18} />
                  <span>Искать другой заказ</span>
                </button>

                {/* Статус заказа */}
                <div className="order-detail-section">
                  <div className="order-detail-section-header">
                    <Package size={20} color="#F57F17" />
                    <h3>Статус заказа</h3>
                  </div>
                  <div className="order-detail-section-content">
                    <OrderStatusBadge status={orderData.status} />
                  </div>
                </div>

                {/* Информация о клиенте */}
                <div className="order-detail-section">
                  <div className="order-detail-section-header">
                    <User size={20} color="#B43F20" />
                    <h3>Информация о клиенте</h3>
                  </div>
                  <div className="order-detail-section-content">
                    <div className="order-detail-item">
                      <span className="order-detail-label">Имя:</span>
                      <span className="order-detail-value">{orderData.customer.name}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Телефон:</span>
                      <span className="order-detail-value">{orderData.customer.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Доставка / Самовывоз */}
                <div className="order-detail-section">
                  <div className="order-detail-section-header">
                    {orderData.fulfillment.type === 'delivery' ? (
                      <Truck size={20} color="#E65100" />
                    ) : (
                      <Store size={20} color="#7B1FA2" />
                    )}
                    <h3>{orderData.fulfillment.type === 'delivery' ? 'Доставка' : 'Самовывоз'}</h3>
                  </div>
                  <div className="order-detail-section-content">
                    {orderData.fulfillment.type === 'delivery' && orderData.fulfillment.address && (
                      <div className="order-detail-item">
                        <span className="order-detail-label">Адрес доставки:</span>
                        <span className="order-detail-value">{orderData.fulfillment.address}</span>
                      </div>
                    )}
                    {orderData.fulfillment.type === 'delivery' && orderData.fulfillment.deliveryCost > 0 && (
                      <div className="order-detail-item">
                        <span className="order-detail-label">Стоимость доставки:</span>
                        <span className="order-detail-value">{orderData.fulfillment.deliveryCost} ₽</span>
                      </div>
                    )}
                    {orderData.fulfillment.type === 'pickup' && orderData.fulfillment.pickupAddress && (
                      <div className="order-detail-item">
                        <span className="order-detail-label">Адрес ресторана:</span>
                        <span className="order-detail-value">{orderData.fulfillment.pickupAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Товары */}
                <div className="order-detail-section">
                  <div className="order-detail-section-header">
                    <Package size={20} color="#F57F17" />
                    <h3>Товары ({orderData.items.length})</h3>
                  </div>
                  <div className="order-detail-section-content">
                    {orderData.items.map((item: any, index: number) => (
                      <div key={index} className="order-detail-product">
                        <div className="order-detail-product-info">
                          <span className="order-detail-product-name">{item.title}</span>
                          <span className="order-detail-product-quantity">x{item.quantity}</span>
                        </div>
                        <span className="order-detail-product-price">{item.price * item.quantity} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Дополнительно */}
                {(orderData.cutleryCount > 0 || orderData.comment) && (
                  <div className="order-detail-section">
                    <div className="order-detail-section-header">
                      <Utensils size={20} color="#4CAF50" />
                      <h3>Дополнительно</h3>
                    </div>
                    <div className="order-detail-section-content">
                      {orderData.cutleryCount > 0 && (
                        <div className="order-detail-item">
                          <span className="order-detail-label">Приборы:</span>
                          <span className="order-detail-value">{orderData.cutleryCount} шт.</span>
                        </div>
                      )}
                      {orderData.comment && (
                        <div className="order-detail-item">
                          <MessageCircle size={16} color="#666" />
                          <span>{orderData.comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Итого */}
                <div className="order-detail-section order-detail-summary">
                  <div className="order-detail-section-content">
                    <div className="order-detail-item">
                      <span className="order-detail-label">Товары:</span>
                      <span className="order-detail-value">{orderData.pricing.productsTotal} ₽</span>
                    </div>
                    {orderData.pricing.deliveryCost > 0 && (
                      <div className="order-detail-item">
                        <span className="order-detail-label">Доставка:</span>
                        <span className="order-detail-value">{orderData.pricing.deliveryCost} ₽</span>
                      </div>
                    )}
                    {orderData.pricing.pickupDiscount > 0 && (
                      <div className="order-detail-item order-detail-discount">
                        <span className="order-detail-label">Скидка самовывоз:</span>
                        <span className="order-detail-value">-{orderData.pricing.pickupDiscount} ₽</span>
                      </div>
                    )}
                    <div className="order-detail-divider" />
                    <div className="order-detail-item order-detail-total">
                      <span className="order-detail-label">Итого:</span>
                      <span className="order-detail-value">{orderData.pricing.finalTotal} ₽</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
