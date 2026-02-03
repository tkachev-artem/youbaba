import { useOrderStore } from '../../store/orderStore';
import { useDeliveryStore } from '../../store/deliveryStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { AddressSearch } from '../AddressSearch';
import { MapPin, Phone, Clock, Truck, Package } from 'lucide-react';
import type { DeliveryResult } from '../../lib/deliveryService';

/**
 * Поле адреса (показывается только для доставки)
 */
export function OrderAddressField() {
  const fulfillmentType = useOrderStore((s) => s.fulfillmentType);
  const address = useDeliveryStore((s) => s.address);
  const deliveryInfo = useDeliveryStore((s) => s.deliveryInfo);
  const setAddress = useDeliveryStore((s) => s.setAddress);
  const setDeliveryInfo = useDeliveryStore((s) => s.setDeliveryInfo);
  const setCoordinates = useDeliveryStore((s) => s.setCoordinates);
  const settings = useRestaurantStore((s) => s.settings);

  // Форматирование времени работы
  const formatOpeningHours = () => {
    if (!settings?.openingHours) return 'Время работы не указано';
    
    const hours = settings.openingHours;
    const today = hours.monday; // Можно взять любой день для примера или текущий
    
    if (today?.isClosed) {
      return 'Закрыто';
    }
    
    return `Ежедневно ${today?.open || '12:00'} - ${today?.close || '22:30'}`;
  };

  // Показываем только для доставки
  if (fulfillmentType !== 'delivery') {
    return (
      <div className="order-section-card">
        <div className="order-section-header-static">
          <MapPin size={20} color="#7B1FA2" />
          <h2 className="order-section-title">Адрес самовывоза</h2>
        </div>
        <div className="pickup-address-info">
          <div className="pickup-info-row">
            <MapPin size={18} color="#666" />
            <span>{settings?.address || 'Адрес не указан'}</span>
          </div>
          <div className="pickup-info-row">
            <Phone size={18} color="#666" />
            <span>{settings?.phone || 'Телефон не указан'}</span>
          </div>
          <div className="pickup-info-row">
            <Clock size={18} color="#666" />
            <span>{formatOpeningHours()}</span>
          </div>
        </div>
      </div>
    );
  }

  const handleAddressSelect = (result: DeliveryResult) => {
    setAddress(result.address);
    setDeliveryInfo(result);
    setCoordinates(result.coordinates);
  };

  return (
    <div className="order-section-card">
      <div className="order-section-header-static">
        <MapPin size={20} color="#E65100" />
        <h2 className="order-section-title">
          Адрес доставки <span className="order-form-required">*</span>
        </h2>
      </div>

      <div className="order-form-fields">
        <AddressSearch
          onAddressSelect={handleAddressSelect}
          initialValue={address}
        />

        {deliveryInfo && (
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
                  {deliveryInfo.distance.toFixed(1)} км
                </div>
              </div>
              <div className="modal-delivery-result-divider" />
              <div className="modal-delivery-result-item">
                <div className="modal-delivery-result-label">
                  <Package size={16} />
                  <span>Стоимость</span>
                </div>
                <div className="modal-delivery-result-value modal-delivery-cost">
                  {deliveryInfo.cost} ₽
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
