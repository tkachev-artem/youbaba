/**
 * API методы для работы с заказами (для операторов)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Получить токен из хранилища Zustand
 */
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return null;
    const parsed = JSON.parse(authStorage);
    return parsed.state?.token || null;
  } catch (error) {
    console.error('Error parsing auth storage:', error);
    return null;
  }
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'completed' | 'cancelled';

export interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    userId?: string;
    name: string;
    phone: string;
  };
  items: Array<{
    productId: string;
    title: string;
    image: string;
    price: number;
    quantity: number;
    gram: string;
  }>;
  fulfillment: {
    type: 'delivery' | 'pickup';
    address?: string;
    deliveryCost: number;
    pickupAddress?: string;
  };
  payment: {
    method: 'card_online' | 'cash' | 'card_onsite';
    status: 'pending' | 'paid' | 'cancelled';
    paidAt?: string;
  };
  cutleryCount: number;
  comment?: string;
  pricing: {
    productsTotal: number;
    deliveryCost: number;
    pickupDiscount: number;
    finalTotal: number;
    appliedPromos: string[];
  };
  status: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    changedAt: string;
    changedBy?: string;
    comment?: string;
  }>;
  operator?: {
    id: string;
    name: string;
    confirmedAt: string;
  };
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrdersParams {
  status?: OrderStatus;
  fulfillmentType?: 'delivery' | 'pickup';
  date?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface GetOrdersResponse {
  success: boolean;
  orders: Order[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

/**
 * Получение списка заказов (требует авторизации)
 */
export async function getOrders(params: GetOrdersParams = {}): Promise<GetOrdersResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Не авторизован');
    }

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.fulfillmentType) queryParams.append('fulfillmentType', params.fulfillmentType);
    if (params.date) queryParams.append('date', params.date);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());

    const response = await fetch(`${API_BASE_URL}/orders?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка получения заказов');
    }

    return result;
  } catch (error: any) {
    console.error('Get orders error:', error);
    throw error;
  }
}

/**
 * Получение детальной информации о заказе
 */
export async function getOrderById(orderId: string): Promise<{ success: boolean; order: Order }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Не авторизован');
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка получения заказа');
    }

    return result;
  } catch (error: any) {
    console.error('Get order by ID error:', error);
    throw error;
  }
}

/**
 * Создание заказа оператором
 */
export async function createOrderAsOperator(
  orderData: any
): Promise<{ success: boolean; order: Order }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Не авторизован');
    }

    const response = await fetch(`${API_BASE_URL}/orders/operator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка создания заказа');
    }

    return {
      success: true,
      order: result.order,
    };
  } catch (error: any) {
    console.error('Create order error:', error);
    throw error;
  }
}

/**
 * Изменение статуса заказа
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  comment?: string
): Promise<{ success: boolean; order: Order }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Не авторизован');
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status, comment }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка изменения статуса');
    }

    return result;
  } catch (error: any) {
    console.error('Update order status error:', error);
    throw error;
  }
}

/**
 * Удаление заказа (только отменённые)
 */
export async function deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Не авторизован');
    }

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Ошибка удаления заказа');
    }

    return result;
  } catch (error: any) {
    console.error('Delete order error:', error);
    throw error;
  }
}
