import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';

/**
 * Склонение слова "позиция" в зависимости от количества
 */
function getPluralForm(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'позиций';
  }
  
  if (lastDigit === 1) {
    return 'позиция';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'позиции';
  }
  
  return 'позиций';
}

/**
 * Блок "Ваши товары" - сворачиваемый список товаров в заказе
 */
export function OrderItemsBlock() {
  const items = useCartStore((s) => s.items);
  const totalCount = useCartStore((s) => s.getTotalCount());
  const totalPrice = useCartStore((s) => s.getTotalPrice());
  
  const [isExpanded, setIsExpanded] = useState(true);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="order-section-card">
      <button
        className="order-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="order-section-header-left">
          <Package size={20} color="#F57F17" />
          <h2 className="order-section-title">
            Ваш заказ ({totalCount} {getPluralForm(totalCount)})
          </h2>
        </div>
        <div className="order-section-header-right">
          {isExpanded ? (
            <ChevronUp size={20} className="order-section-chevron" />
          ) : (
            <ChevronDown size={20} className="order-section-chevron" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="order-items-list">
          {items.map((item) => (
            <div key={item.id} className="order-item">
              <div className="order-item-info">
                <span className="order-item-title">{item.title}</span>
                <span className="order-item-quantity">x{item.quantity}</span>
              </div>
              <span className="order-item-price">{item.price * item.quantity} ₽</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
