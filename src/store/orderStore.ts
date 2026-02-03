import { create } from 'zustand';
import { createOrder, CreateOrderRequest, OrderResponse, FulfillmentType, PaymentMethod } from '../lib/api/orders';
import { useCartStore } from './cartStore';
import { useDeliveryStore } from './deliveryStore';

interface OrderState {
  // Данные формы
  name: string;
  phone: string;
  comment: string;
  cutleryCount: number;
  
  // Тип получения
  fulfillmentType: FulfillmentType;
  
  // Способ оплаты
  paymentMethod: PaymentMethod;
  
  // Состояние отправки
  isSubmitting: boolean;
  error: string | null;
  
  // Созданный заказ
  createdOrder: OrderResponse | null;
  
  // Actions
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  setComment: (comment: string) => void;
  setCutleryCount: (count: number) => void;
  setFulfillmentType: (type: FulfillmentType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  
  // Расчёты
  calculateTotals: () => {
    productsTotal: number;
    deliveryCost: number;
    pickupDiscount: number;
    finalTotal: number;
  };
  
  // Проверка акций
  checkPromos: () => string[];
  
  // Валидация
  validate: () => { valid: boolean; errors: string[] };
  
  // Отправка заказа
  submitOrder: () => Promise<{ success: boolean; order?: OrderResponse; error?: string }>;
  
  // Сброс
  reset: () => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  // Начальное состояние
  name: '',
  phone: '',
  comment: '',
  cutleryCount: 0,
  fulfillmentType: 'pickup', // По умолчанию самовывоз, так как доставка временно недоступна
  paymentMethod: 'cash', // По умолчанию наличные, так как карта онлайн временно недоступна
  isSubmitting: false,
  error: null,
  createdOrder: null,

  // Setters
  setName: (name) => set({ name }),
  setPhone: (phone) => set({ phone }),
  setComment: (comment) => set({ comment }),
  setCutleryCount: (count) => set({ cutleryCount: Math.max(0, count) }),
  
  setFulfillmentType: (type) => {
    set({ fulfillmentType: type });
    
    // Автоматически меняем способ оплаты при смене типа получения
    const state = get();
    if (type === 'delivery') {
      // Для доставки наличные (карта временно недоступна)
      if (state.paymentMethod !== 'cash') {
        set({ paymentMethod: 'cash' });
      }
    } else {
      // Для самовывоза наличные
      if (state.paymentMethod !== 'cash') {
        set({ paymentMethod: 'cash' });
      }
    }
  },
  
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  // Расчёт итоговой стоимости
  calculateTotals: () => {
    const cartStore = useCartStore.getState();
    const deliveryStore = useDeliveryStore.getState();
    const state = get();

    const productsTotal = cartStore.getTotalPrice();
    
    // Стоимость доставки
    const deliveryCost = state.fulfillmentType === 'delivery' 
      ? (deliveryStore.deliveryInfo?.cost || 0) 
      : 0;
    
    // Скидка 10% за самовывоз
    const pickupDiscount = state.fulfillmentType === 'pickup' 
      ? Math.round(productsTotal * 0.1) 
      : 0;
    
    // Итого
    const finalTotal = productsTotal - pickupDiscount + deliveryCost;

    return {
      productsTotal,
      deliveryCost,
      pickupDiscount,
      finalTotal,
    };
  },

  // Проверка применимых акций
  checkPromos: () => {
    const cartStore = useCartStore.getState();
    const productsTotal = cartStore.getTotalPrice();
    const promos: string[] = [];

    // Акция: Бесплатный ролл от 2500 ₽
    if (productsTotal >= 2500) {
      promos.push('free_roll_2500');
    }

    return promos;
  },

  // Валидация формы
  validate: () => {
    const state = get();
    const cartStore = useCartStore.getState();
    const deliveryStore = useDeliveryStore.getState();
    const errors: string[] = [];

    // Проверка корзины
    if (cartStore.items.length === 0) {
      errors.push('Корзина пуста');
    }

    // Проверка имени
    if (!state.name || state.name.trim().length < 2) {
      errors.push('Укажите корректное имя');
    }

    // Проверка телефона
    // Убираем все символы кроме цифр и +
    const cleanPhone = state.phone.replace(/[^\d+]/g, '');
    // Формат: +7 и 10 цифр
    const phoneRegex = /^\+7\d{10}$/;
    if (!state.phone || !phoneRegex.test(cleanPhone)) {
      errors.push('Укажите корректный номер телефона');
    }

    // Проверка адреса для доставки
    if (state.fulfillmentType === 'delivery') {
      if (!deliveryStore.address) {
        errors.push('Укажите адрес доставки');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Отправка заказа
  submitOrder: async () => {
    const state = get();
    const cartStore = useCartStore.getState();
    const deliveryStore = useDeliveryStore.getState();

    // Валидация
    const validation = state.validate();
    if (!validation.valid) {
      set({ error: validation.errors[0] });
      return { success: false, error: validation.errors[0] };
    }

    set({ isSubmitting: true, error: null });

    try {
      // Подготовка данных заказа
      const orderData: CreateOrderRequest = {
        customer: {
          name: state.name.trim(),
          phone: state.phone.replace(/[^\d+]/g, ''), // Убираем все кроме цифр и +
        },
        items: cartStore.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        fulfillment: {
          type: state.fulfillmentType,
          address: state.fulfillmentType === 'delivery' ? deliveryStore.address : undefined,
          deliveryCost: state.fulfillmentType === 'delivery' 
            ? (deliveryStore.deliveryInfo?.cost || 0) 
            : 0,
        },
        payment: {
          method: state.paymentMethod,
        },
        cutleryCount: state.cutleryCount,
        comment: state.comment.trim(),
      };

      // Отправка на сервер
      const response = await createOrder(orderData);

      if (!response.success || !response.data) {
        set({ 
          isSubmitting: false, 
          error: response.message || 'Ошибка создания заказа' 
        });
        return { 
          success: false, 
          error: response.message || 'Ошибка создания заказа' 
        };
      }

      // Успешно создан
      set({ 
        isSubmitting: false, 
        createdOrder: response.data,
        error: null 
      });

      // Очищаем корзину
      cartStore.clear();

      return { 
        success: true, 
        order: response.data 
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Неизвестная ошибка';
      set({ isSubmitting: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Сброс состояния
  reset: () => {
    // Сброс количества приборов по количеству товаров
    const cartStore = useCartStore.getState();
    const totalItems = cartStore.getTotalCount();
    
    set({
      name: '',
      phone: '',
      comment: '',
      cutleryCount: totalItems,
      fulfillmentType: 'pickup', // По умолчанию самовывоз
      paymentMethod: 'cash', // По умолчанию наличные
      isSubmitting: false,
      error: null,
      createdOrder: null,
    });
  },

  clearError: () => set({ error: null }),
}));

// Автоматическая инициализация количества приборов при монтировании
if (typeof window !== 'undefined') {
  const cartStore = useCartStore.getState();
  const totalItems = cartStore.getTotalCount();
  if (totalItems > 0) {
    useOrderStore.setState({ cutleryCount: totalItems });
  }
}
