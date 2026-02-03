import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useCartStore } from '../store/cartStore';
import { useDeliveryStore } from '../store/deliveryStore';
import { formatRub } from '../lib/money';
import { ShoppingCart } from 'lucide-react';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const clear = useCartStore((s) => s.clear);
  const productsTotal = useCartStore((s) => s.getTotalPrice());
  
  // Получаем стоимость доставки из стора
  const deliveryInfo = useDeliveryStore((s) => s.deliveryInfo);
  const deliveryTotal = deliveryInfo?.cost ?? 0;

  const productsTotalLabel = useMemo(() => formatRub(productsTotal), [productsTotal]);
  const deliveryTotalLabel = useMemo(() => formatRub(deliveryTotal), [deliveryTotal]);
  const finalTotalLabel = useMemo(
    () => formatRub(productsTotal + deliveryTotal),
    [productsTotal, deliveryTotal]
  );

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const goToOrder = () => {
    if (items.length === 0) return;
    onClose();
    navigate('/order');
  };

  return (
    <>
      <div className={`cart-overlay ${open ? 'active' : ''}`} onClick={onClose} role="presentation" />

      <div className={`cart-sidebar ${open ? 'active' : ''}`} aria-hidden={!open}>
        <div className="cart-header">
          <div className="cart-title">
            КОРЗИНА
            <button className="close-cart" aria-label="Закрыть корзину" onClick={onClose} type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="cart-content">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={60} color="#FF9800" className="cart-empty-icon" />
              <p className="cart-empty-text">Ваша корзина пуста</p>
              <button className="continue-shopping-btn" type="button" onClick={onClose}>
                Продолжить покупки
              </button>
            </div>
          ) : (
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.title}</div>
                    <div className="cart-item-price">{formatRub(item.price)}</div>

                    <div className="cart-item-controls">
                      <button
                        className="quantity-btn minus"
                        type="button"
                        aria-label="Уменьшить количество"
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>

                      <span className="quantity-display">{item.quantity}</span>

                      <button
                        className="quantity-btn plus"
                        type="button"
                        aria-label="Увеличить количество"
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>

                      <button
                        className="remove-item"
                        type="button"
                        aria-label="Удалить товар"
                        onClick={() => removeItem(item.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer показываем всегда, но кнопка disabled если корзина пустая */}
        <div className="cart-footer" style={{ display: items.length === 0 ? 'none' : 'block' }}>
          <div className="cart-totals">
            <div className="total-row">
              <span className="total-label">Стоимость товаров:</span>
              <span className="total-value" id="products-total">
                {productsTotalLabel}
              </span>
            </div>
            <div className="total-row">
              <span className="total-label">Стоимость доставки:</span>
              <span className="total-value" id="delivery-total">
                {deliveryTotalLabel}
              </span>
            </div>
            <div className="total-row final">
              <span className="total-label">Итого к оплате:</span>
              <span className="total-value" id="final-total">
                {finalTotalLabel}
              </span>
            </div>
          </div>

          <button className="checkout-btn" type="button" onClick={goToOrder} disabled={items.length === 0}>
            Далее
          </button>

          <button className="clear-cart" type="button" onClick={clear} disabled={items.length === 0}>
            Очистить корзину
          </button>
        </div>
      </div>
    </>
  );
}
