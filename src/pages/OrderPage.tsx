import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { useRestaurantStore } from '../store/restaurantStore';
import { OrderItemsBlock } from '../components/order/OrderItemsBlock';
import { OrderContactForm } from '../components/order/OrderContactForm';
import { OrderFulfillmentSelector } from '../components/order/OrderFulfillmentSelector';
import { OrderAddressField } from '../components/order/OrderAddressField';
import { OrderPaymentSelector } from '../components/order/OrderPaymentSelector';
import { OrderAdditionalFields } from '../components/order/OrderAdditionalFields';
import { OrderSummary } from '../components/order/OrderSummary';
import { ArrowLeft } from 'lucide-react';

/**
 * Страница оформления заказа
 */
export function OrderPage() {
  const navigate = useNavigate();
  const cartItems = useCartStore((s) => s.items);
  const resetOrder = useOrderStore((s) => s.reset);
  const fetchSettings = useRestaurantStore((s) => s.fetchSettings);

  // Проверка: если корзина пуста, редирект на главную
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/', { replace: true });
    }
  }, [cartItems.length, navigate]);

  // Инициализация при монтировании
  useEffect(() => {
    // Загружаем данные из localStorage перед сбросом
    const savedName = localStorage.getItem('orderContactName');
    const savedPhone = localStorage.getItem('orderContactPhone');
    
    resetOrder();
    
    // Восстанавливаем имя и телефон после сброса
    if (savedName) useOrderStore.getState().setName(savedName);
    if (savedPhone) useOrderStore.getState().setPhone(savedPhone);
    
    fetchSettings();
  }, [resetOrder, fetchSettings]);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <Layout>
      <div className="order-page">
        <div className="order-container">
          {/* Шапка */}
          <div className="order-header">
            <h1 className="order-page-title">Оформление заказа</h1>
          </div>

          {/* Контент */}
          <div className="order-content">
            <div className="order-form">
              {/* Список товаров */}
              <OrderItemsBlock />

              {/* Контактные данные */}
              <OrderContactForm />

              {/* Тип получения */}
              <OrderFulfillmentSelector />

              {/* Адрес */}
              <OrderAddressField />

              {/* Способ оплаты */}
              <OrderPaymentSelector />

              {/* Дополнительные поля */}
              <OrderAdditionalFields />
            </div>

            {/* Итого (липкий блок) */}
            <div className="order-sidebar">
              <OrderSummary />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
