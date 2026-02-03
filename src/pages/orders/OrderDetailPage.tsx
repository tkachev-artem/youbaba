import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getOrderById, 
  updateOrderStatus, 
  type Order, 
  type OrderStatus 
} from '../../lib/api/ordersOperator';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { CustomSelect } from '../../components/orders/CustomSelect';
import { ConfirmDialog } from '../../components/orders/ConfirmDialog';
import { ArrowLeft, Phone, MapPin, CreditCard, User, Package, Utensils, Box, Truck, Store, ReceiptRussianRuble, MessageCircle, Settings, CheckCircle, XCircle, Clock, AlertCircle, Loader } from 'lucide-react';

/**
 * Страница детального просмотра заказа
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Состояния для диалогов подтверждения
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'default' | 'danger';
    needsInput?: boolean;
    inputPlaceholder?: string;
    inputValue?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [cancelReason, setCancelReason] = useState('');

  // Загрузка заказа
  const loadOrder = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getOrderById(id);
      setOrder(response.order);
    } catch (err: any) {
      console.error('Load order error:', err);
      setError(err.message || 'Ошибка загрузки заказа');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  // Изменение статуса
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Изменить статус заказа?',
      message: `Вы действительно хотите изменить статус на "${getStatusLabel(newStatus)}"?`,
      type: 'default',
      onConfirm: () => confirmStatusChange(newStatus),
    });
  };

  const confirmStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setIsUpdating(true);
    
    try {
      const response = await updateOrderStatus(order._id, newStatus);
      setOrder(response.order);
    } catch (err: any) {
      setConfirmDialog({
        isOpen: true,
        title: 'Ошибка',
        message: err.message || 'Не удалось изменить статус',
        type: 'danger',
        onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Подтверждение заказа
  const handleConfirm = () => handleStatusChange('confirmed');

  // Отмена заказа
  const handleCancel = () => {
    setCancelReason('');
    setConfirmDialog({
      isOpen: true,
      title: 'Отменить заказ',
      message: 'Укажите причину отмены заказа:',
      type: 'danger',
      needsInput: true,
      inputPlaceholder: 'Причина отмены...',
      inputValue: cancelReason,
      onConfirm: () => confirmCancel(),
    });
  };

  const confirmCancel = async () => {
    if (!order || !cancelReason.trim()) return;
    
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setIsUpdating(true);
    
    try {
      const response = await updateOrderStatus(order._id, 'cancelled', cancelReason);
      setOrder(response.order);
      setCancelReason('');
    } catch (err: any) {
      setConfirmDialog({
        isOpen: true,
        title: 'Ошибка',
        message: err.message || 'Не удалось отменить заказ',
        type: 'danger',
        onConfirm: () => setConfirmDialog({ ...confirmDialog, isOpen: false }),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждён',
      preparing: 'Готовится',
      ready: 'Готов',
      in_delivery: 'В доставке',
      completed: 'Выполнен',
      cancelled: 'Отменён',
    };
    return labels[status];
  };

  // Опции для селекта статусов (исключаем "В доставке" для самовывоза)
  const getStatusOptions = () => {
    const allOptions = [
      { value: 'pending', label: 'Ожидает подтверждения', icon: <Clock size={18} color="#FFB800" /> },
      { value: 'confirmed', label: 'Подтверждён', icon: <CheckCircle size={18} color="#004D40" /> },
      { value: 'preparing', label: 'Готовится', icon: <Loader size={18} color="#1E90FF" /> },
      { value: 'ready', label: 'Готов', icon: <CheckCircle size={18} color="#9CCC65" /> },
      { value: 'in_delivery', label: 'В доставке', icon: <Truck size={18} color="#9C27B0" /> },
      { value: 'completed', label: 'Выполнен', icon: <CheckCircle size={18} color="#9E9E9E" /> },
      { value: 'cancelled', label: 'Отменён', icon: <XCircle size={18} color="#9E9E9E" /> },
    ];
    
    // Исключаем "В доставке" для самовывоза
    if (order?.fulfillment.type === 'pickup') {
      return allOptions.filter(opt => opt.value !== 'in_delivery');
    }
    
    return allOptions;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-loading">
          <div className="orders-loading-spinner" />
          <p>Загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-error">
          <p>{error || 'Заказ не найден'}</p>
          <button className="order-detail-back-btn" onClick={() => navigate('/ord')}>
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      {/* Шапка */}
      <div className="order-detail-header">
        <button className="order-detail-back" onClick={() => navigate('/ord')}>
          <ArrowLeft size={20} />
          <span>Назад к списку</span>
        </button>
        <h1 className="order-detail-title">Заказ #{order.orderNumber}</h1>
      </div>

      <div className="order-detail-content">
        {/* Основная информация */}
        <div className="order-detail-main">
          {/* Информация о заказе */}
          <div className="order-detail-card">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={20} color="#B43F20" />
              Информация о заказе
            </h2>
            
            <div className="order-info-section">
              <div className="order-info-row">
                <div className="order-info-label">Статус заказа</div>
                <OrderStatusBadge status={order.status} size="lg" fulfillmentType={order.fulfillment.type as 'delivery' | 'pickup'} />
              </div>
              
              <div className="order-info-row">
                <div className="order-info-label">Создан</div>
                <div className="order-info-value">
                  <Clock size={16} color="#999" />
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
              
              <div className="order-info-row">
                <div className="order-info-label">Тип получения</div>
                <div className="order-info-value">
                  {order.fulfillment.type === 'delivery' ? (
                    <>
                      <Truck size={16} color="#E65100" />
                      <span>Доставка</span>
                    </>
                  ) : (
                    <>
                      <Store size={16} color="#7B1FA2" />
                      <span>Самовывоз</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="order-info-row">
                <div className="order-info-label">Способ оплаты</div>
                <div className="order-info-value">
                  {order.payment.method === 'cash' ? (
                    <>
                      <ReceiptRussianRuble size={16} color="#1565C0" />
                      <span>Наличные</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} color="#7B1FA2" />
                      <span>{order.payment.method === 'card_online' ? 'Карта онлайн' : 'Карта'}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="order-info-row">
                <div className="order-info-label">Статус оплаты</div>
                <div className="order-info-value">
                  {order.payment.status === 'paid' ? (
                    <>
                      <CheckCircle size={16} color="#2E7D32" />
                      <span style={{ color: '#2E7D32', fontWeight: 600 }}>Оплачено</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} color="#616161" />
                      <span style={{ color: '#616161' }}>Не оплачено</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Клиент */}
          <div className="order-detail-card">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="#B43F20" />
              Клиент
            </h2>
            
            <div className="order-customer-section">
              <div className="order-customer-row">
                <div className="order-customer-icon">
                  <User size={18} color="#666" />
                </div>
                <div className="order-customer-content">
                  <div className="order-customer-label">Имя</div>
                  <div className="order-customer-value">{order.customer.name}</div>
                </div>
              </div>
              
              <div className="order-customer-row">
                <div className="order-customer-icon">
                  <Phone size={18} color="#666" />
                </div>
                <div className="order-customer-content">
                  <div className="order-customer-label">Телефон</div>
                  <a href={`tel:${order.customer.phone}`} className="order-customer-phone">
                    {order.customer.phone}
                  </a>
                </div>
              </div>
              
              {order.comment && (
                <div className="order-customer-comment">
                  <div className="order-customer-comment-header">
                    <MessageCircle size={16} color="#B43F20" />
                    <span>Комментарий к заказу</span>
                  </div>
                  <div className="order-customer-comment-text">{order.comment}</div>
                </div>
              )}
            </div>
          </div>

          {/* Адрес */}
          <div className="order-detail-card">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} color="#B43F20" />{order.fulfillment.type === 'delivery' ? 'Адрес доставки' : 'Адрес самовывоза'}
            </h2>
            <div className="order-detail-address">
              <MapPin size={18} />
              <span>
                {order.fulfillment.type === 'delivery' 
                  ? order.fulfillment.address 
                  : order.fulfillment.pickupAddress || 'ул. Пушкина, 1, Ростов-на-Дону'}
              </span>
            </div>
            {order.fulfillment.type === 'delivery' && (
              <div className="order-detail-delivery-info">
                <div className="order-detail-delivery-info-header">
                  <Truck size={18} color="#E65100" />
                  <span>Информация о доставке</span>
                </div>
                <div className="order-detail-delivery-info-content">
                  <div className="order-detail-delivery-info-item">
                    <div className="order-detail-delivery-info-label">
                      <Package size={16} />
                      <span>Стоимость</span>
                    </div>
                    <div className="order-detail-delivery-info-value order-detail-delivery-cost">
                      {order.fulfillment.deliveryCost} ₽
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Состав заказа */}
          <div className="order-detail-card">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={20} color="#B43F20" />Состав заказа</h2>
            <div className="order-detail-items">
              {order.items.map((item, index) => (
                <div key={index} className="order-detail-item">
                  <div className="order-detail-item-info">
                    <span className="order-detail-item-title">{item.title}</span>
                    <span className="order-detail-item-gram">{item.gram}</span>
                  </div>
                  <div className="order-detail-item-qty">x{item.quantity}</div>
                  <div className="order-detail-item-price">{item.price * item.quantity} ₽</div>
                </div>
              ))}
              {order.cutleryCount > 0 && (
                <div className="order-detail-cutlery">
                  <Utensils size={16} />
                  <span>Количество приборов: {order.cutleryCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* История */}
          {order.statusHistory && order.statusHistory.length > 1 && (
            <div className="order-detail-card">
              <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} color="#B43F20" />История изменений</h2>
              <div className="order-detail-timeline">
                {order.statusHistory.map((item, index) => (
                  <div key={index} className="order-detail-timeline-item">
                    <div className="order-detail-timeline-dot" />
                    <div className="order-detail-timeline-content">
                      <div className="order-detail-timeline-status">
                        {getStatusLabel(item.status)}
                      </div>
                      <div className="order-detail-timeline-time">
                        {formatDate(item.changedAt)}
                      </div>
                      {item.comment && (
                        <div className="order-detail-timeline-comment">
                          {item.comment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Сайдбар */}
        <div className="order-detail-sidebar">
          {/* Итого */}
          <div className="order-detail-card order-detail-summary">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ReceiptRussianRuble size={20} color="#B43F20" />Итого</h2>
            <div className="order-detail-summary-rows">
              <div className="order-detail-summary-row">
                <span>Товары:</span>
                <span>{order.pricing.productsTotal} ₽</span>
              </div>
              {order.pricing.deliveryCost > 0 && (
                <div className="order-detail-summary-row">
                  <span>Доставка:</span>
                  <span>{order.pricing.deliveryCost} ₽</span>
                </div>
              )}
              {order.pricing.pickupDiscount > 0 && (
                <div className="order-detail-summary-row order-detail-summary-discount">
                  <span>Скидка (-10%):</span>
                  <span>-{order.pricing.pickupDiscount} ₽</span>
                </div>
              )}
            </div>
            <div className="order-detail-summary-divider" />
            <div className="order-detail-summary-total">
              <span>К оплате:</span>
              <span>{order.pricing.finalTotal} ₽</span>
            </div>
          </div>

          {/* Смена статуса */}
          <div className="order-detail-card">
            <h2 className="order-detail-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="#B43F20" />Управление</h2>
            <div className="order-detail-status-change">
              <CustomSelect
                value={order.status}
                onChange={(value) => handleStatusChange(value as OrderStatus)}
                options={getStatusOptions()}
                label="Изменить статус"
              />
            </div>

            {/* Быстрые действия */}
            <div className="order-detail-actions">
              {order.status === 'pending' && (
                <button
                  className="order-detail-action-btn order-detail-action-confirm"
                  onClick={handleConfirm}
                  disabled={isUpdating}
                >
                  <CheckCircle size={16} color="#004D40" style={{ display: 'inline', marginRight: '4px' }} />Подтвердить заказ
                </button>
              )}
              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <button
                  className="order-detail-action-btn order-detail-action-cancel"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <XCircle size={16} color="#F44336" style={{ display: 'inline', marginRight: '4px' }} />Отменить заказ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Диалог подтверждения */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        needsInput={confirmDialog.needsInput}
        inputPlaceholder={confirmDialog.inputPlaceholder}
        inputValue={confirmDialog.needsInput ? cancelReason : undefined}
        onInputChange={confirmDialog.needsInput ? setCancelReason : undefined}
        confirmLabel={confirmDialog.type === 'danger' ? 'Подтвердить' : 'Да'}
        cancelLabel="Отмена"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
