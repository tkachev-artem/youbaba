import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Clock, Package, Phone, User, Truck, Store, RussianRuble, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import type { Order } from '../../lib/api/ordersOperator';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

// Система цветов фона для карточек по статусам
const statusColorMap: Record<string, string> = {
  pending: '#FFF8E1',      // Светложелтый
  confirmed: '#E0F2F1',    // Светломятный (ещё светлее)
  preparing: '#E3F2FD',    // Светлосиний
  ready: '#F0F4C3',        // Светлолиметный
  in_delivery: '#F3E5F5',  // Светлофиолетовый
  completed: '#F1F8F4',    // Еле заметный светлозелёный
  cancelled: '#F5F5F5',    // Светлосерый
};

/**
 * Карточка заказа в списке
 */
export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState<string>('');

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Функция для подсчёта прошедшего времени с момента подтверждения
  const calculateElapsedTime = () => {
    if (!order.confirmedAt) {
      setElapsedTime('');
      return;
    }

    const confirmed = new Date(order.confirmedAt).getTime();
    // Если заказ завершён - считаем до completedAt, иначе до текущего времени
    const endTime = order.completedAt ? new Date(order.completedAt).getTime() : Date.now();
    const diffMs = endTime - confirmed;

    if (diffMs < 0) {
      setElapsedTime('');
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const days = Math.floor(hours / 24);

    let result = '';
    if (days > 0) {
      result = `${days}д ${hours % 24}ч`;
    } else if (hours > 0) {
      result = `${hours}ч ${minutes}м`;
    } else {
      result = `${minutes}м`;
    }
    
    setElapsedTime(result);
  };

  // Обновляем время каждую минуту (только для незавершённых заказов)
  useEffect(() => {
    calculateElapsedTime();
    
    // Если заказ завершён - не запускаем интервал
    if (order.completedAt) {
      return;
    }
    
    const interval = setInterval(calculateElapsedTime, 60000); // обновляем каждую минуту
    return () => clearInterval(interval);
  }, [order.confirmedAt, order.completedAt]);

  const FulfillmentIcon = order.fulfillment.type === 'delivery' ? Truck : Store;
  const backgroundColor = statusColorMap[order.status] || '#FFFFFF';

  return (
    <div
      className={`order-card order-card-status-${order.status}`}
      style={{ backgroundColor }}
      onClick={() => navigate(`/ord/${order._id}`)}
    >
      <div className="order-card-header">
        <div className="order-card-number" style={{ color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : undefined }}>#{order.orderNumber}</div>
        <div className="order-card-time" style={{ color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : undefined }}>
          <Clock size={14} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : 'currentColor'} />
          {formatTime(order.createdAt)}
        </div>
      </div>

      <div className="order-card-customer">
        <div className="order-card-customer-row">
          <User size={16} />
          <span>{order.customer.name}</span>
        </div>
        <div className="order-card-customer-row">
          <Phone size={16} />
          <span>{order.customer.phone}</span>
        </div>
      </div>

      <div className="order-card-info">
        <div className="order-card-info-item" style={{ 
          color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : (order.fulfillment.type === 'delivery' ? '#E65100' : '#7B1FA2'), 
          borderColor: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : (order.fulfillment.type === 'delivery' ? '#E65100' : '#7B1FA2')
        }}>
          <FulfillmentIcon size={16} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : (order.fulfillment.type === 'delivery' ? '#E65100' : '#7B1FA2')} />
          <span>{order.fulfillment.type === 'delivery' ? 'Доставка' : 'Самовывоз'}</span>
        </div>
        <div className="order-card-info-item" style={{ 
          color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#F57F17', 
          borderColor: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#F57F17'
        }}>
          <Package size={16} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#F57F17'} />
          <span>{order.pricing.finalTotal} ₽</span>
        </div>
        <div className="order-card-info-item" style={{ 
          color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#1565C0', 
          borderColor: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#1565C0'
        }}>
          <RussianRuble size={16} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#1565C0'} />
          <span>При получении</span>
        </div>
        <div className="order-card-info-item" style={{ 
          color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : (order.payment.status === 'paid' ? '#2E7D32' : '#616161'), 
          borderColor: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : (order.payment.status === 'paid' ? '#2E7D32' : '#616161')
        }}>
          {order.payment.status === 'paid' ? 
            <CheckCircle size={16} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#2E7D32'} /> : 
            <XCircle size={16} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#616161'} />
          }
          <span>{order.payment.status === 'paid' ? 'Оплачено' : 'Не оплачено'}</span>
        </div>
      </div>

      <div className="order-card-items">
        {order.items.slice(0, 2).map((item, index) => (
          <span key={index} className="order-card-item" style={{ color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : undefined }}>
            {item.title} x{item.quantity}
          </span>
        ))}
        {order.items.length > 2 && (
          <span className="order-card-item-more" style={{ color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : undefined }}>
            +{order.items.length - 2} ещё
          </span>
        )}
      </div>

      <div className="order-card-footer">
        <OrderStatusBadge status={order.status} fulfillmentType={order.fulfillment.type as 'delivery' | 'pickup'} />
        {elapsedTime && (
          <div className="order-card-elapsed-time" style={{ 
            color: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#FFA000',
            borderColor: (order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#FFB800',
            background: (order.status === 'completed' || order.status === 'cancelled') ? '#F5F5F5' : '#ffffff'
          }}>
            <Clock size={14} color={(order.status === 'completed' || order.status === 'cancelled') ? '#666666' : '#FFB800'} />
            <span>{elapsedTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}
