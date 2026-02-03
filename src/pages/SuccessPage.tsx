import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useEffect, useMemo } from 'react';
import { useCartStore } from '../store/cartStore';
import { CheckCircle, Home } from 'lucide-react';

export function SuccessPage() {
  const [params] = useSearchParams();
  const orderId = useMemo(
    () => params.get('order_id') || localStorage.getItem('current_order_id'),
    [params]
  );

  const clearCart = useCartStore((s) => s.clear);

  useEffect(() => {
    // Очищаем localStorage-ключ и корзину
    localStorage.removeItem('current_order_id');
    clearCart();
  }, [clearCart]);

  return (
    <Layout>
      <div className="order-page">
        <div className="order-container">
          <div className="success-page-card">
            <div className="success-icon-wrapper">
              <CheckCircle size={80} color="#2E7D32" strokeWidth={2} />
            </div>
            
            <h1 className="success-title">Заказ успешно оформлен!</h1>
            
            <div className="success-order-info">
              <span className="success-order-label">Номер заказа:</span>
              <span className="success-order-id">{orderId || 'Загрузка...'}</span>
            </div>

            <p className="success-message">
              Ваш заказ принят в обработку. Мы уже начали готовить ваш заказ.
              С вами свяжутся в ближайшее время для подтверждения.
            </p>

            <Link to="/" className="success-btn">
              <Home size={20} />
              <span>Вернуться на главную</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
