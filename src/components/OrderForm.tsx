import { useMemo, useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useDeliveryStore } from '../store/deliveryStore';
import { formatRub } from '../lib/money';

export function OrderForm() {
  const productsTotal = useCartStore((s) => s.getTotalPrice());
  
  // Получаем стоимость доставки из стора
  const deliveryInfo = useDeliveryStore((s) => s.deliveryInfo);
  const deliveryCost = deliveryInfo?.cost ?? 0;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card'>('sbp');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Итоговая сумма = товары + доставка
  const finalTotal = useMemo(() => formatRub(productsTotal + deliveryCost), [productsTotal, deliveryCost]);

  return (
    <div className="form-container">
      <form action="" className="form" onSubmit={(e) => e.preventDefault()}>
        <h1 className="form-title">Оформление заказа</h1>
        <div className="inputs-container">
          <div className="input-info">
            <div className="input-container">
              <label htmlFor="name" className="input-title">
                Ваше имя
              </label>
              <input
                type="text"
                id="name"
                name="Name"
                placeholder="Введите ваше имя"
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="input-container">
              <label htmlFor="phone" className="input-title">
                Ваш номер телефона
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder={'+7 (000) 000-00-00'}
                className="input"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="input-container">
              <label htmlFor="comment" className="input-title">
                Оставить комментарий
              </label>
              <textarea
                name="comment"
                id="comment"
                placeholder="Необязательно*"
                className="input textarea-input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="input-container">
              <label htmlFor="address-input" className="input-title arddress-title">
                Ваш адрес
              </label>
              <input
                type="text"
                name="address"
                placeholder="Введите ваш адрес сюда"
                id="address-input"
                className="search-input address-input"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="total-row" id="total-order">
                <span className="total-label">Стоимость доставки - </span>
                <span className="total-value" id="delivery-total">
                  {deliveryInfo ? (
                    deliveryInfo.isFree ? (
                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>Бесплатно 🎉</span>
                    ) : (
                      formatRub(deliveryCost)
                    )
                  ) : (
                    <span style={{ color: '#999', fontSize: '14px' }}>Укажите адрес в шапке сайта</span>
                  )}
                </span>
              </div>
            </div>

            <div className="payment-container">
              <div className="input-container">
                <h1 className="input-title">Способы оплаты</h1>
                <div className="change-container">
                  <button
                    className="change-btn"
                    id="paymentToggle"
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    aria-expanded={dropdownOpen}
                  >
                    <h1 className="change-title">Выбрать способ</h1>
                    <div className="change-icon-container">
                      <svg className="change-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className="payment-dropdown"
                id="paymentDropdown"
                style={{ display: dropdownOpen ? 'block' : 'none' }}
              >
                <div className="payment-options">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="sbp"
                      checked={paymentMethod === 'sbp'}
                      className="payment-radio"
                      onChange={() => setPaymentMethod('sbp')}
                    />
                    <div className="payment-card">
                      <div className="payment-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M8 8H16V16H8V8Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 12V16" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 8V12" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="payment-info">
                        <div className="payment-name">СБП</div>
                        <div className="payment-description">Быстрый перевод через Т-Банк</div>
                      </div>
                      <div className="payment-check">
                        <div className="check-circle"></div>
                      </div>
                    </div>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      className="payment-radio"
                      onChange={() => setPaymentMethod('card')}
                    />
                    <div className="payment-card">
                      <div className="payment-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M2 8H22V16H2V8Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M2 10H22" stroke="currentColor" strokeWidth="2" />
                          <path d="M6 14H8" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="payment-info">
                        <div className="payment-name">Самовывоз</div>
                        <div className="payment-description">Оплата наличными при самовывозе</div>
                      </div>
                      <div className="payment-check">
                        <div className="check-circle"></div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="other-container">
          <div className="input-container">
            <h1 className="input-title">К оплате:</h1>
            <p className="total-value" id="final-total">
              {finalTotal}
            </p>
          </div>
          <div className="order-btn-container">
            <button className="order-btn" type="submit">
              Оплатить
            </button>
          </div>
          <div className="order-document-container">
            <p className="order-document-text">
              Нажимая кнопку оплатить, вы даете согласие на политику конфиденциальности и обработку персональных данных
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
