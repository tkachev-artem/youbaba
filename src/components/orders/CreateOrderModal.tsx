import { useState, useMemo } from 'react';
import { X, User, Phone, MapPin, CreditCard, Package, MessageSquare, Utensils, Wallet, CheckCircle, Clock, AlertCircle, Loader, XCircle, Truck, RussianRuble, ReceiptRussianRuble, Store, Minus, Plus, CircleAlert } from 'lucide-react';
import { ProductSelector } from './ProductSelector';
import { CustomSelect } from './CustomSelect';
import { AddressSearch } from '../AddressSearch';
import type { Product } from '../../lib/api/products';
import type { CreateOrderRequest, PaymentMethod } from '../../lib/api/orders';
import type { DeliveryResult } from '../../lib/deliveryService';

interface SelectedProduct {
  product: Product;
  quantity: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: CreateOrderRequest & { status?: string; paymentStatus?: string }) => Promise<void>;
}

/**
 * Модальное окно создания заказа оператором
 */
export function CreateOrderModal({ isOpen, onClose, onSubmit }: CreateOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Данные клиента
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Продукты
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // Тип получения
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult | null>(null);

  // Оплата
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');

  // Статус заказа
  const [orderStatus, setOrderStatus] = useState<string>('pending');

  // Дополнительно
  const [cutleryCount, setCutleryCount] = useState(0);
  const [comment, setComment] = useState('');

  // Форматирование телефона
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
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
    setCustomerPhone(formatted);
  };

  // Обработка выбора адреса
  const handleAddressSelect = (result: DeliveryResult) => {
    setDeliveryAddress(result.fullAddress);
    setDeliveryResult(result);
  };

  // Валидация
  const validateForm = (): string | null => {
    if (!customerName.trim()) return 'Укажите имя клиента';
    if (!customerPhone.trim() || customerPhone.length < 18) return 'Укажите корректный телефон';
    if (selectedProducts.length === 0) return 'Добавьте хотя бы один товар';
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) return 'Укажите адрес доставки';
    return null;
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData: CreateOrderRequest & { status?: string; paymentStatus?: string } = {
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
        items: selectedProducts.map((sp) => ({
          productId: sp.product.id, // Используем slug id, не _id
          quantity: sp.quantity,
        })),
        fulfillment: {
          type: fulfillmentType,
          ...(fulfillmentType === 'delivery' && { address: deliveryAddress.trim() }),
        },
        payment: {
          method: paymentMethod,
        },
        cutleryCount,
        comment: comment.trim() || undefined,
        status: orderStatus,
        paymentStatus,
      };

      await onSubmit(orderData);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания заказа');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Закрытие модального окна
  const handleClose = () => {
    if (!isSubmitting) {
      setCustomerName('');
      setCustomerPhone('');
      setSelectedProducts([]);
      setFulfillmentType('pickup');
      setDeliveryAddress('');
      setDeliveryResult(null);
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setOrderStatus('pending');
      setCutleryCount(0);
      setComment('');
      setError(null);
      onClose();
    }
  };

  // Опции для селектов
  const paymentMethodOptions = [
    { value: 'cash', label: 'Наличные', icon: <RussianRuble size={18} color="#1565C0" /> },
    { value: 'card_onsite', label: 'Карта', icon: <CreditCard size={18} color="#7B1FA2" /> },
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: 'Не оплачен', icon: <XCircle size={18} color="#616161" /> },
    { value: 'paid', label: 'Оплачен', icon: <CheckCircle size={18} color="#2E7D32" /> },
  ];

  const orderStatusOptions = [
    { value: 'pending', label: 'Ожидает подтверждения', icon: <Clock size={18} color="#FFB800" /> },
    { value: 'confirmed', label: 'Подтверждён', icon: <CheckCircle size={18} color="#004D40" /> },
    { value: 'preparing', label: 'Готовится', icon: <Loader size={18} color="#1E90FF" /> },
    { value: 'ready', label: 'Готов', icon: <CheckCircle size={18} color="#9CCC65" /> },
    { value: 'in_delivery', label: 'В доставке', icon: <Truck size={18} color="#9C27B0" /> },
    { value: 'completed', label: 'Выполнен', icon: <CheckCircle size={18} color="#9E9E9E" /> },
    { value: 'cancelled', label: 'Отменён', icon: <XCircle size={18} color="#9E9E9E" /> },
  ];

  // Расчет итоговой суммы
  const totals = useMemo(() => {
    const productsTotal = selectedProducts.reduce(
      (sum, sp) => sum + sp.product.price * sp.quantity,
      0
    );
    const deliveryCost = fulfillmentType === 'delivery' && deliveryResult ? deliveryResult.cost : 0;
    const pickupDiscount = fulfillmentType === 'pickup' ? Math.round(productsTotal * 0.1) : 0;
    const finalTotal = productsTotal - pickupDiscount + deliveryCost;
    
    return { productsTotal, deliveryCost, pickupDiscount, finalTotal };
  }, [selectedProducts, fulfillmentType, deliveryResult]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-order-modal" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header">
          <div className="modal-header-content">
            <Package size={24} className="modal-header-icon" />
            <h2 className="modal-title">Новый заказ</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="modal-error">
              <CircleAlert size={20} className="modal-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Данные клиента */}
          <div className="modal-section">
            <div className="modal-section-title">
              <User size={20} color="#B43F20" />
              Данные клиента
            </div>
            <div className="modal-form-fields">
              <div className="modal-form-field">
                <label htmlFor="customer-name">
                  Имя <span className="required">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div className="modal-form-field">
                <label htmlFor="customer-phone">
                  Телефон <span className="required">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  required
                />
              </div>
            </div>
          </div>

          {/* Продукты */}
          <div className="modal-section">
            <ProductSelector
              selectedProducts={selectedProducts}
              onProductsChange={setSelectedProducts}
            />
          </div>

          {/* Тип получения */}
          <div className="modal-section">
            <div className="modal-section-title">
              <MapPin size={20} color="#B43F20" />
              Тип получения
            </div>
            
            <div className="modal-fulfillment-group">
              <button
                type="button"
                className={`modal-fulfillment-btn modal-fulfillment-pickup ${fulfillmentType === 'pickup' ? 'active' : ''}`}
                onClick={() => {
                  setFulfillmentType('pickup');
                  setDeliveryAddress('');
                  setDeliveryResult(null);
                }}
              >
                <div className="modal-fulfillment-btn-icon">
                  <Store size={24} color={fulfillmentType === 'pickup' ? '#7B1FA2' : '#999'} />
                </div>
                <span>Самовывоз</span>
              </button>
              
              <button
                type="button"
                className={`modal-fulfillment-btn modal-fulfillment-delivery ${fulfillmentType === 'delivery' ? 'active' : ''}`}
                onClick={() => setFulfillmentType('delivery')}
              >
                <div className="modal-fulfillment-btn-icon">
                  <Truck size={24} color={fulfillmentType === 'delivery' ? '#E65100' : '#999'} />
                </div>
                <span>Доставка</span>
              </button>
            </div>

            {fulfillmentType === 'delivery' && (
              <div className="modal-delivery-block modal-delivery-full-width">
                <div className="modal-form-field">
                  <label htmlFor="delivery-address">
                    Адрес доставки <span className="required">*</span>
                  </label>
                  <AddressSearch
                    onAddressSelect={handleAddressSelect}
                    initialValue={deliveryAddress}
                  />
                </div>
                {deliveryResult && (
                  <div className="modal-delivery-result">
                    <div className="modal-delivery-result-header">
                      <Truck size={18} color="#E65100" />
                      <span>Информация о доставке</span>
                    </div>
                    <div className="modal-delivery-result-content">
                      <div className="modal-delivery-result-item">
                        <div className="modal-delivery-result-label">
                          <MapPin size={16} />
                          <span>Расстояние</span>
                        </div>
                        <div className="modal-delivery-result-value">
                          {deliveryResult.distance.toFixed(1)} км
                        </div>
                      </div>
                      <div className="modal-delivery-result-divider" />
                      <div className="modal-delivery-result-item">
                        <div className="modal-delivery-result-label">
                          <Package size={16} />
                          <span>Стоимость</span>
                        </div>
                        <div className="modal-delivery-result-value modal-delivery-cost">
                          {deliveryResult.cost} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Оплата */}
          <div className="modal-section">
            <div className="modal-section-title">
              <CreditCard size={20} color="#B43F20" />
              Оплата
            </div>
            <div className="modal-form-fields">
              <CustomSelect
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={paymentMethodOptions}
                label="Способ оплаты"
              />
              <CustomSelect
                value={paymentStatus}
                onChange={(value) => setPaymentStatus(value as 'pending' | 'paid')}
                options={paymentStatusOptions}
                label="Статус оплаты"
              />
            </div>
          </div>

          {/* Статус и дополнительно */}
          <div className="modal-section">
            <div className="modal-section-title">
              <Package size={20} color="#B43F20" />
              Статус и дополнительно
            </div>
            <div className="modal-form-fields">
              <CustomSelect
                value={orderStatus}
                onChange={setOrderStatus}
                options={orderStatusOptions}
                label="Статус заказа"
              />
              <div className="modal-form-field">
                <label htmlFor="cutlery-count">Количество приборов</label>
                <div className="cutlery-counter">
                  <button
                    type="button"
                    className="cutlery-btn"
                    onClick={() => setCutleryCount(Math.max(0, cutleryCount - 1))}
                    disabled={cutleryCount <= 0}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="cutlery-count">{cutleryCount}</span>
                  <button
                    type="button"
                    className="cutlery-btn"
                    onClick={() => setCutleryCount(cutleryCount + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-form-field" style={{ marginTop: '16px' }}>
              <label htmlFor="order-comment">Комментарий к заказу</label>
              <textarea
                id="order-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Дополнительные пожелания..."
                rows={3}
              />
            </div>
          </div>

          {/* Итого */}
          {selectedProducts.length > 0 && (
            <div className="modal-section modal-order-summary">
              <div className="modal-section-title">
                <ReceiptRussianRuble size={20} color="#9CCC65" />
                Итого
              </div>
              
              <div className="modal-summary-rows">
                <div className="modal-summary-row">
                  <span>Товары:</span>
                  <span>{totals.productsTotal} ₽</span>
                </div>

                {totals.deliveryCost > 0 && (
                  <div className="modal-summary-row">
                    <span>Доставка:</span>
                    <span>{totals.deliveryCost} ₽</span>
                  </div>
                )}

                {totals.pickupDiscount > 0 && (
                  <div className="modal-summary-row modal-summary-discount">
                    <span>Скидка самовывоз (-10%):</span>
                    <span>-{totals.pickupDiscount} ₽</span>
                  </div>
                )}
              </div>

              <div className="modal-summary-divider" />

              <div className="modal-summary-total">
                <span>К оплате:</span>
                <span className="modal-summary-total-price">{totals.finalTotal} ₽</span>
              </div>
            </div>
          )}

          {/* Кнопки */}
          <div className="modal-footer">
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать заказ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
