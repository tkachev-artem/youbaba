import type { OrderStatus } from '../../lib/api/ordersOperator';
import { Clock, CheckCircle, Loader, Truck, XCircle } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  fulfillmentType?: 'delivery' | 'pickup';
}

/**
 * Бейдж статуса заказа с цветовой индикацией
 */
export function OrderStatusBadge({ status, size = 'md', fulfillmentType }: OrderStatusBadgeProps) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  
  // Динамический текст для ready в зависимости от типа доставки
  const getReadyLabel = () => {
    if (status === 'ready') {
      return fulfillmentType === 'delivery' ? 'Готов к доставке' : 'Готов к выдаче';
    }
    return null;
  };
  
  const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode }> = {
    pending: { label: 'Ожидает подтверждения', icon: <Clock size={iconSize} color="#FFB800" /> },
    confirmed: { label: 'Подтверждён', icon: <CheckCircle size={iconSize} color="#004D40" /> },
    preparing: { label: 'Готовится', icon: <Loader size={iconSize} color="#1E90FF" /> },
    ready: { label: getReadyLabel() || 'Готов', icon: <CheckCircle size={iconSize} color="#9CCC65" /> },
    in_delivery: { label: 'В доставке', icon: <Truck size={iconSize} color="#9C27B0" /> },
    completed: { label: 'Выполнен', icon: <CheckCircle size={iconSize} color="#9E9E9E" /> },
    cancelled: { label: 'Отменён', icon: <XCircle size={iconSize} color="#9E9E9E" /> },
  };

  const config = statusConfig[status];

  return (
    <div className={`order-status-badge order-status-${status} order-status-${size}`}>
      <span className="order-status-emoji">{config.icon}</span>
      <span className="order-status-label">{config.label}</span>
    </div>
  );
}
