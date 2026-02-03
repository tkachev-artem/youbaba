/**
 * API методы для работы с заказами
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Типы
export type FulfillmentType = 'delivery' | 'pickup';
export type PaymentMethod = 'card_online' | 'cash' | 'card_onsite';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'completed' | 'cancelled';

export interface CreateOrderRequest {
  customer: {
    name: string;
    phone: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  fulfillment: {
    type: FulfillmentType;
    address?: string;
    deliveryCost?: number;
  };
  payment: {
    method: PaymentMethod;
  };
  cutleryCount?: number;
  comment?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  pricing: {
    productsTotal: number;
    deliveryCost: number;
    pickupDiscount: number;
    finalTotal: number;
    appliedPromos: string[];
  };
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Создание нового заказа
 */
export async function createOrder(data: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'unknown_error',
        message: result.message || 'Ошибка создания заказа',
      };
    }

    return {
      success: true,
      data: result.order,
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: 'network_error',
      message: 'Ошибка соединения с сервером',
    };
  }
}

/**
 * Получение деталей заказа по ID
 */
export async function getOrderById(orderId: string, token?: string): Promise<ApiResponse<any>> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/profile/orders/${orderId}`, {
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'unknown_error',
        message: result.message || 'Ошибка получения заказа',
      };
    }

    return {
      success: true,
      data: result.order,
    };
  } catch (error) {
    console.error('Get order error:', error);
    return {
      success: false,
      error: 'network_error',
      message: 'Ошибка соединения с сервером',
    };
  }
}

/**
 * Отслеживание заказа по номеру и телефону
 */
export async function trackOrder(orderNumber: string, phone: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderNumber,
        phone,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'unknown_error',
        message: result.message || 'Заказ не найден',
      };
    }

    return {
      success: true,
      data: result.order,
    };
  } catch (error) {
    console.error('Track order error:', error);
    return {
      success: false,
      error: 'network_error',
      message: 'Ошибка соединения с сервером',
    };
  }
}
