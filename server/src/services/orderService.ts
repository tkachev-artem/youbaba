import { Order, OrderStatus, FulfillmentType } from '../models/Order';

/**
 * Определение начального статуса заказа на основе параметров
 */
export const determineInitialOrderStatus = (
  fulfillmentType: FulfillmentType,
  paymentMethod: string
): OrderStatus => {
  // Доставка - всегда pending (ждём подтверждения оплаты или оператором)
  if (fulfillmentType === FulfillmentType.DELIVERY) {
    return OrderStatus.PENDING;
  }

  // Самовывоз + Карта онлайн -> confirmed (оплачено)
  if (
    fulfillmentType === FulfillmentType.PICKUP &&
    paymentMethod === 'card_online'
  ) {
    return OrderStatus.CONFIRMED;
  }

  // Самовывоз + (Наличные или Карта при получении) -> pending (ждём подтверждения)
  if (
    fulfillmentType === FulfillmentType.PICKUP &&
    (paymentMethod === 'cash' || paymentMethod === 'card_onsite')
  ) {
    return OrderStatus.PENDING;
  }

  // По умолчанию pending
  return OrderStatus.PENDING;
};

/**
 * Расчёт итоговой стоимости заказа
 */
export const calculateOrderPricing = async (params: {
  productsTotal: number;
  fulfillmentType: FulfillmentType;
  address?: string;
}) => {
  const { productsTotal, fulfillmentType, address } = params;
  
  let deliveryCost = 0;
  let pickupDiscount = 0;
  let deliveryInfo = undefined;

  // Расчет стоимости доставки
  if (fulfillmentType === FulfillmentType.DELIVERY && address) {
    // Здесь можно добавить логику расчета стоимости доставки по адресу
    // Пока устанавливаем фиксированную стоимость
    deliveryCost = 200; // Базовая стоимость доставки
    deliveryInfo = {
      cost: deliveryCost,
      estimatedTime: '60-90 минут',
    };
  }

  // Скидка 10% за самовывоз
  if (fulfillmentType === FulfillmentType.PICKUP) {
    pickupDiscount = Math.round(productsTotal * 0.1);
  }

  const finalTotal = productsTotal - pickupDiscount + deliveryCost;

  return {
    productsTotal,
    deliveryCost,
    pickupDiscount,
    finalTotal,
    deliveryInfo,
  };
};

/**
 * Проверка применения акций
 */
export const checkPromos = (productsTotal: number): string[] => {
  const appliedPromos: string[] = [];

  // Акция: Бесплатный ролл от 2500 ₽
  if (productsTotal >= 2500) {
    appliedPromos.push('free_roll_2500');
  }

  return appliedPromos;
};

/**
 * Генерация сообщения для уведомления оператора
 */
export const generateOperatorNotification = (order: any): string => {
  const statusEmoji = order.status === OrderStatus.PENDING ? '⚠️' : '✅';
  const fulfillmentEmoji = order.fulfillment.type === 'delivery' ? '🚚' : '🏪';
  const paymentEmoji = order.payment.method === 'cash' ? '💵' : '💳';

  let message = `${statusEmoji} НОВЫЙ ЗАКАЗ! #${order.orderNumber}\n\n`;
  message += `👤 ${order.customer.name}\n`;
  message += `📞 ${order.customer.phone}\n\n`;
  message += `🛒 Состав:\n`;

  order.items.forEach((item: any) => {
    message += `• ${item.title} x${item.quantity}\n`;
  });

  message += `\n${fulfillmentEmoji} ${
    order.fulfillment.type === 'delivery' ? 'Доставка' : 'Самовывоз'
  }\n`;
  message += `${paymentEmoji} ${
    order.payment.method === 'cash'
      ? 'Наличные'
      : order.payment.method === 'card_online'
      ? 'Карта онлайн'
      : 'Карта при получении'
  } • ${order.pricing.finalTotal} ₽\n`;

  if (order.status === OrderStatus.PENDING) {
    message += `\n⚠️ Требует подтверждения!`;
  }

  return message;
};
