import { useMemo } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { useCartStore } from '../../store/cartStore';
import { useDeliveryStore } from '../../store/deliveryStore';
import { ReceiptRussianRuble, Gift, CircleAlert } from 'lucide-react';

/**
 * Блок итоговой стоимости (липкий на мобильных)
 */
export function OrderSummary() {
  const fulfillmentType = useOrderStore((s) => s.fulfillmentType);
  const isSubmitting = useOrderStore((s) => s.isSubmitting);
  const error = useOrderStore((s) => s.error);
  const submitOrder = useOrderStore((s) => s.submitOrder);
  
  // Зависимости для расчётов
  const cartTotal = useCartStore((s) => s.getTotalPrice());
  const deliveryInfo = useDeliveryStore((s) => s.deliveryInfo);
  
  // Мемоизированные расчёты
  const totals = useMemo(() => {
    const productsTotal = cartTotal;
    const deliveryCost = fulfillmentType === 'delivery' ? (deliveryInfo?.cost || 0) : 0;
    const pickupDiscount = fulfillmentType === 'pickup' ? Math.round(productsTotal * 0.1) : 0;
    const finalTotal = productsTotal - pickupDiscount + deliveryCost;
    
    return { productsTotal, deliveryCost, pickupDiscount, finalTotal };
  }, [cartTotal, deliveryInfo, fulfillmentType]);
  
  const promos = useMemo(() => {
    const appliedPromos: string[] = [];
    if (totals.productsTotal >= 2500) {
      appliedPromos.push('free_roll_2500');
    }
    return appliedPromos;
  }, [totals.productsTotal]);

  const { productsTotal, deliveryCost, pickupDiscount, finalTotal } = totals;

  const handleSubmit = async () => {
    const result = await submitOrder();
    
    if (result.success && result.order) {
      // Редирект на страницу успеха
      window.location.href = `/success?order_id=${result.order.orderNumber}`;
    }
  };

  return (
    <div className="order-summary">
      <div className="order-summary-content">
        <h2 className="order-summary-title">Итого</h2>

        <div className="order-summary-rows">
          <div className="order-summary-row">
            <span>Товары:</span>
            <span>{productsTotal} ₽</span>
          </div>

          {deliveryCost > 0 && (
            <div className="order-summary-row">
              <span>Доставка:</span>
              <span>{deliveryCost} ₽</span>
            </div>
          )}

          {pickupDiscount > 0 && (
            <div className="order-summary-row order-summary-discount">
              <span>Скидка самовывоз (-10%):</span>
              <span>-{pickupDiscount} ₽</span>
            </div>
          )}
        </div>

        <div className="order-summary-divider" />

        <div className="order-summary-total">
          <span>К оплате:</span>
          <span className="order-summary-total-price">{finalTotal} ₽</span>
        </div>

        {/* Акции */}
        {promos.length > 0 && (
          <div className="order-summary-promos">
            {promos.includes('free_roll_2500') && (
              <div className="order-promo-badge">
                <Gift size={16} color="#4CAF50" style={{ display: 'inline', marginRight: '4px' }} />Бесплатный ролл в подарок!
              </div>
            )}
          </div>
        )}

        {/* Прогресс до акции */}
        {!promos.includes('free_roll_2500') && productsTotal < 2500 && (
          <div className="order-promo-progress">
            <div className="order-promo-progress-text">
              До бесплатного ролла осталось: {2500 - productsTotal} ₽
            </div>
            <div className="order-promo-progress-bar">
              <div
                className="order-promo-progress-fill"
                style={{ width: `${(productsTotal / 2500) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="order-error">
            <CircleAlert size={20} className="order-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Кнопка отправки */}
        <button
          type="button"
          className="order-submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Оформление...' : 'Оформить заказ'}
        </button>
      </div>
    </div>
  );
}
