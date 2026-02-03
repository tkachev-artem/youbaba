import { useOrderStore } from '../../store/orderStore';
import { CreditCard, RussianRuble } from 'lucide-react';
import type { PaymentMethod } from '../../lib/api/orders';

/**
 * Выбор способа оплаты
 */
export function OrderPaymentSelector() {
  const fulfillmentType = useOrderStore((s) => s.fulfillmentType);
  const paymentMethod = useOrderStore((s) => s.paymentMethod);
  const setPaymentMethod = useOrderStore((s) => s.setPaymentMethod);

  // Доступные способы оплаты (различаются для доставки и самовывоза)
  const availablePayments: Array<{
    method: PaymentMethod;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    iconColor: string;
    disabled?: boolean;
  }> = fulfillmentType === 'delivery'
    ? [
        // При доставке только "Картой сейчас", но она неактивна
        {
          method: 'card_online',
          icon: <CreditCard size={20} />,
          iconColor: '#7B1FA2',
          title: 'Картой сейчас',
          subtitle: 'Временно недоступно',
          disabled: true,
        },
      ]
    : [
        // При самовывозе "При получении" активен, "Картой сейчас" неактивна
        {
          method: 'cash',
          icon: <RussianRuble size={20} />,
          iconColor: '#1565C0',
          title: 'При получении',
          subtitle: 'Наличными / Картой',
        },
        {
          method: 'card_online',
          icon: <CreditCard size={20} />,
          iconColor: '#7B1FA2',
          title: 'Картой сейчас',
          subtitle: 'Временно недоступно',
          disabled: true,
        },
      ];

  return (
    <div className="order-section-card">
      <div className="order-section-header-static">
        <CreditCard size={20} color="#7B1FA2" />
        <h2 className="order-section-title">Способ оплаты</h2>
      </div>

      <div className="payment-options">
        {availablePayments.map((option) => (
          <button
            key={option.method}
            type="button"
            className={`payment-option ${
              paymentMethod === option.method ? 'selected' : ''
            } ${option.disabled ? 'disabled' : ''}`}
            onClick={() => !option.disabled && setPaymentMethod(option.method)}
            disabled={option.disabled}
          >
            <div className="payment-radio">
              {paymentMethod === option.method && (
                <div className="payment-radio-dot" />
              )}
            </div>
            <div className="payment-content">
              <div className="payment-title">{option.title}</div>
              <div className="payment-subtitle">{option.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
