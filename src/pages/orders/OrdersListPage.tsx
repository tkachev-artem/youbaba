import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getOrders, createOrderAsOperator, type Order, type OrderStatus } from '../../lib/api/ordersOperator';
import { OrderCard } from '../../components/orders/OrderCard';
import { CreateOrderModal } from '../../components/orders/CreateOrderModal';
import { LogOut, RefreshCw, AlertCircle, Loader, CheckCircle, XCircle, Box, Search, Plus } from 'lucide-react';

/**
 * Страница списка заказов для операторов
 */
export function OrdersListPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Форматирует ввод номера заказа: 1 буква (А-Я, A-Z), автоматический дефис, затем цифры
   * Примеры: А-123, B-4567
   */
  const formatOrderNumber = (value: string): string => {
    // Если пустая строка
    if (!value) return '';
    
    // Убираем дефис для обработки
    const withoutDash = value.replace(/-/g, '');
    
    // Если первый символ - не буква, возвращаем исходное значение (поиск по телефону/имени)
    if (!/^[А-ЯA-Zа-яa-z]/.test(withoutDash.charAt(0))) {
      return value;
    }
    
    // Первый символ - буква (заглавная)
    const letter = withoutDash.charAt(0).toUpperCase();
    
    // Проверяем что это именно буква (русская или английская)
    if (!/^[А-ЯA-Z]$/.test(letter)) {
      return '';
    }
    
    // Остальные символы - только цифры
    const restChars = withoutDash.slice(1);
    const digits = restChars.replace(/\D/g, ''); // оставляем только цифры
    
    // Если есть хоть одна лишняя буква после первой - не даём ввести
    if (restChars.length > 0 && restChars !== digits) {
      // Возвращаем предыдущее корректное состояние
      return searchQuery;
    }
    
    // Формируем результат
    if (digits.length === 0) {
      return letter + '-';
    }
    
    return `${letter}-${digits}`;
  };

  /**
   * Обработчик изменения поля поиска
   */
  const handleSearchChange = (value: string) => {
    // Если пустая строка - просто очищаем
    if (!value) {
      setSearchQuery('');
      return;
    }
    
    // Если первый символ - буква, применяем форматирование номера заказа
    const firstChar = value.replace(/-/g, '').charAt(0);
    if (/^[А-ЯA-Zа-яa-z]$/.test(firstChar)) {
      const formatted = formatOrderNumber(value);
      setSearchQuery(formatted);
    } else {
      // Иначе это поиск по телефону или имени - просто сохраняем
      setSearchQuery(value);
    }
  };

  // Режим просмотра заказов
  const [viewMode, setViewMode] = useState<'queue' | 'pickup' | 'delivery' | 'completed'>('queue');
  
  // Модальное окно создания заказа
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Загрузка заказов
  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (fulfillmentTypeFilter !== 'all') params.fulfillmentType = fulfillmentTypeFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await getOrders(params);
      setOrders(response.orders);
    } catch (err: any) {
      console.error('Load orders error:', err);
      setError(err.message || 'Ошибка загрузки заказов');
      
      // Если ошибка авторизации - редирект на логин
      if (err.message?.includes('авторизован')) {
        logout();
        navigate('/ord/login', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, fulfillmentTypeFilter]);

  // Поиск с задержкой
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadOrders();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Автоматическое обновление заказов каждые 5 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders();
    }, 5000); // Обновляем каждые 5 секунд

    return () => clearInterval(interval);
  }, [statusFilter, fulfillmentTypeFilter, searchQuery]);

  // Сортировка по приоритету статусов
  const getStatusPriority = (status: OrderStatus): number => {
    const priorityMap: Record<OrderStatus, number> = {
      'in_delivery': 1,    // Первые - в доставке
      'ready': 2,          // Потом - готовы
      'preparing': 3,      // Потом - готовятся
      'confirmed': 4,      // Потом - подтверждены
      'pending': 5,        // Потом - ожидают подтверждения
      'completed': 6,      // Потом - выполнены
      'cancelled': 7,      // Последние - отменены
    };
    return priorityMap[status] || 99;
  };

  // Фильтрация заказов в зависимости от режима
  const filteredOrders = orders.filter((order) => {
    if (viewMode === 'queue') {
      // Очередь заказов: все ожидающие подтверждения и в работе
      return ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery'].includes(order.status);
    } else if (viewMode === 'pickup') {
      // Самовывоз: только в работе (без pending)
      return order.fulfillment.type === 'pickup' && ['confirmed', 'preparing', 'ready'].includes(order.status);
    } else if (viewMode === 'delivery') {
      // Доставка: только в работе (без pending)
      return order.fulfillment.type === 'delivery' && ['confirmed', 'preparing', 'ready', 'in_delivery'].includes(order.status);
    } else if (viewMode === 'completed') {
      // Завершенные: все выполненные и отменённые
      return ['completed', 'cancelled'].includes(order.status);
    }
    return true;
  });

  // Группировка заказов по статусам
  const queueOrders = filteredOrders
    .filter((o) => ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery'].includes(o.status))
    .sort((a, b) => {
      // Сначала сортируем по приоритету статуса
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Если приоритеты одинаковые, сортируем по времени создания (старые первыми)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const pickupOrders = filteredOrders
    .filter((o) => o.fulfillment.type === 'pickup' && ['confirmed', 'preparing', 'ready'].includes(o.status))
    .sort((a, b) => {
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const deliveryOrders = filteredOrders
    .filter((o) => o.fulfillment.type === 'delivery' && ['confirmed', 'preparing', 'ready', 'in_delivery'].includes(o.status))
    .sort((a, b) => {
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled');

  // Определяем какие группы показывать в зависимости от режима
  const showQueueGroup = viewMode === 'queue' && queueOrders.length > 0;
  const showPickupGroup = viewMode === 'pickup' && pickupOrders.length > 0;
  const showDeliveryGroup = viewMode === 'delivery' && deliveryOrders.length > 0;
  const showCompletedGroup = viewMode === 'completed' && completedOrders.length > 0;
  const showCancelledGroup = viewMode === 'completed' && cancelledOrders.length > 0;
  
  // Проверка на пустое состояние
  const hasNoOrders = !showQueueGroup && !showPickupGroup && !showDeliveryGroup && !showCompletedGroup && !showCancelledGroup;

  const handleLogout = () => {
    logout();
    navigate('/ord/login', { replace: true });
  };

  // Обработка создания заказа
  const handleCreateOrder = async (orderData: any) => {
    try {
      await createOrderAsOperator(orderData);
      // Обновить список заказов
      await loadOrders();
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка создания заказа');
    }
  };

  return (
    <div className="orders-list-page">
      {/* Шапка */}
      <div className="orders-header">
        <div className="orders-header-info">
          <h1 className="orders-page-title">ЮБАБА: Панель заказов</h1>
          <p className="orders-page-subtitle">
            {user?.username && `Оператор: ${user.username}`}
          </p>
        </div>

        {/* Кнопки фильтров по группам */}
        <div className="orders-view-filters">
          <button
            className={`orders-view-btn ${viewMode === 'queue' ? 'active' : ''}`}
            onClick={() => setViewMode('queue')}
            style={{
              backgroundColor: viewMode === 'queue' ? 'rgba(30, 144, 255, 0.2)' : '#F5F5F5',
              color: viewMode === 'queue' ? '#1565C0' : '#000000',
              border: 'none',
              fontWeight: 600
            }}
          >
            Очередь заказов
          </button>
          <button
            className={`orders-view-btn ${viewMode === 'pickup' ? 'active' : ''}`}
            onClick={() => setViewMode('pickup')}
            style={{
              backgroundColor: viewMode === 'pickup' ? 'rgba(123, 31, 162, 0.2)' : '#F5F5F5',
              color: viewMode === 'pickup' ? '#6A1B9A' : '#000000',
              border: 'none',
              fontWeight: 600
            }}
          >
            Самовывоз
          </button>
          <button
            className={`orders-view-btn ${viewMode === 'delivery' ? 'active' : ''}`}
            onClick={() => setViewMode('delivery')}
            style={{
              backgroundColor: viewMode === 'delivery' ? 'rgba(230, 81, 0, 0.2)' : '#F5F5F5',
              color: viewMode === 'delivery' ? '#E65100' : '#000000',
              border: 'none',
              fontWeight: 600
            }}
          >
            Доставка
          </button>
          <button
            className={`orders-view-btn ${viewMode === 'completed' ? 'active' : ''}`}
            onClick={() => setViewMode('completed')}
            style={{
              backgroundColor: viewMode === 'completed' ? 'rgb(241, 248, 244)' : '#F5F5F5',
              color: viewMode === 'completed' ? 'rgb(76, 175, 80)' : '#000000',
              border: 'none',
              fontWeight: 600
            }}
          >
            Завершенные
          </button>
          
          {/* Поиск */}
          <div className="orders-header-search">
            <input
              type="text"
              className="orders-filter-input"
              placeholder="Поиск заказа (А-123)"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <button
              className="orders-search-btn"
              type="button"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Кнопка добавления заказа */}
          <button
            className="orders-add-btn"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus size={20} />
            Добавить заказ
          </button>
        </div>
      </div>

      {/* Модальное окно создания заказа */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOrder}
      />


      {/* Контент */}
      <div className="orders-content">
        {error && (
          <div className="orders-error">
            {error}
          </div>
        )}

        {isLoading && orders.length === 0 ? (
          <div className="orders-loading">
            <div className="orders-loading-spinner" />
            <p>Загрузка заказов...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <Box size={48} color="#9e9e9e" className="orders-empty-icon" />
            <p>Заказов не найдено</p>
          </div>
        ) : (
          <>
            {/* Группа: Очередь заказов */}
            {showQueueGroup && (
              <div className="orders-group orders-group-queue">
                <div className="orders-group-header">
                  <h2 className="orders-group-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={20} color="#1E90FF" />
                    Все заказы
                  </h2>
                  <span className="orders-group-count" style={{ backgroundColor: '#1E90FF' }}>{queueOrders.length}</span>
                </div>
                <div className="orders-group-content">
                  {queueOrders.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Группа: Самовывоз */}
            {showPickupGroup && (
              <div className="orders-group orders-group-pickup">
                <div className="orders-group-header">
                  <h2 className="orders-group-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={20} color="#6A1B9A" />
                    Самовывоз
                  </h2>
                  <span className="orders-group-count" style={{ backgroundColor: '#6A1B9A' }}>{pickupOrders.length}</span>
                </div>
                <div className="orders-group-content">
                  {pickupOrders.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Группа: Доставка */}
            {showDeliveryGroup && (
              <div className="orders-group orders-group-delivery">
                <div className="orders-group-header">
                  <h2 className="orders-group-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={20} color="#E65100" />
                    Доставка
                  </h2>
                  <span className="orders-group-count" style={{ backgroundColor: '#E65100' }}>{deliveryOrders.length}</span>
                </div>
                <div className="orders-group-content">
                  {deliveryOrders.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Группа: Выполнено */}
            {showCompletedGroup && (
              <div className="orders-group orders-group-completed">
                <div className="orders-group-header">
                  <h2 className="orders-group-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={20} color="#4CAF50" />
                    Выполнено
                  </h2>
                  <span className="orders-group-count" style={{ backgroundColor: '#4CAF50' }}>{completedOrders.length}</span>
                </div>
                <div className="orders-group-content">
                  {completedOrders.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Группа: Отменённые */}
            {showCancelledGroup && (
              <div className="orders-group orders-group-cancelled">
                <div className="orders-group-header">
                  <h2 className="orders-group-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={20} color="#E57373" />
                    Отменённые
                  </h2>
                  <span className="orders-group-count" style={{ backgroundColor: '#E57373' }}>{cancelledOrders.length}</span>
                </div>
                <div className="orders-group-content">
                  {cancelledOrders.map((order) => (
                    <OrderCard key={order._id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
