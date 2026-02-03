import { useOrderStore } from '../../store/orderStore';
import { Truck, Store } from 'lucide-react';
import type { FulfillmentType } from '../../lib/api/orders';

/**
 * Выбор типа получения (доставка/самовывоз)
 */
export function OrderFulfillmentSelector() {
  const fulfillmentType = useOrderStore((s) => s.fulfillmentType);
  const setFulfillmentType = useOrderStore((s) => s.setFulfillmentType);

  return (
    <div className="order-section-card">
      <div className="order-section-header-static">
        <Truck size={20} color="#E65100" />
        <h2 className="order-section-title">Как получить заказ?</h2>
      </div>

      <div className="modal-fulfillment-group">
        <button
          type="button"
          className={`modal-fulfillment-btn modal-fulfillment-pickup ${
            fulfillmentType === 'pickup' ? 'active' : ''
          }`}
          onClick={() => setFulfillmentType('pickup')}
        >
          <div className="modal-fulfillment-btn-icon">
            <Store size={24} color={fulfillmentType === 'pickup' ? '#7B1FA2' : '#999'} />
          </div>
          <span>Самовывоз</span>
        </button>
        
        <button
          type="button"
          className={`modal-fulfillment-btn modal-fulfillment-delivery ${
            fulfillmentType === 'delivery' ? 'active' : ''
          } disabled`}
          onClick={() => {}} // Заблокирована
          disabled
        >
          <div className="modal-fulfillment-btn-icon">
            <Truck size={24} color="#999" />
          </div>
          <span>Доставка</span>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Временно недоступна</div>
        </button>
      </div>
    </div>
  );
}
