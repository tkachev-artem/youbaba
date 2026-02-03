// API клиент для админских операций с товарами и настройками

import { clearProductsCacheFromStore } from '../../store/productsStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface CreateProductData {
  id: string;
  title: string;
  category: string;
  gram: string;
  description: string;
  price: number;
  image: File;
  isAvailable?: boolean;
  isFeatured?: boolean;
  order?: number;
}

export interface UpdateProductData {
  title?: string;
  category?: string;
  gram?: string;
  description?: string;
  price?: number;
  image?: File;
  isAvailable?: boolean;
  isFeatured?: boolean;
  order?: number;
}

/**
 * Создать новый товар
 */
export async function createProduct(data: CreateProductData, token: string) {
  const formData = new FormData();
  
  formData.append('id', data.id);
  formData.append('title', data.title);
  formData.append('category', data.category);
  formData.append('gram', data.gram);
  formData.append('description', data.description);
  formData.append('price', String(data.price));
  formData.append('image', data.image);
  
  if (data.isAvailable !== undefined) {
    formData.append('isAvailable', String(data.isAvailable));
  }
  if (data.isFeatured !== undefined) {
    formData.append('isFeatured', String(data.isFeatured));
  }
  if (data.order !== undefined) {
    formData.append('order', String(data.order));
  }

  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create product');
  }

  // Инвалидируем кеш товаров после создания
  clearProductsCache();

  return result;
}

/**
 * Обновить товар
 */
export async function updateProduct(id: string, data: UpdateProductData, token: string) {
  // Кодируем ID для поддержки кириллицы
  const encodedId = encodeURIComponent(id);
  const formData = new FormData();
  
  if (data.title) formData.append('title', data.title);
  if (data.category) formData.append('category', data.category);
  if (data.gram) formData.append('gram', data.gram);
  if (data.description) formData.append('description', data.description);
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.image) formData.append('image', data.image);
  if (data.isAvailable !== undefined) formData.append('isAvailable', String(data.isAvailable));
  if (data.isFeatured !== undefined) formData.append('isFeatured', String(data.isFeatured));
  if (data.order !== undefined) formData.append('order', String(data.order));

  const response = await fetch(`${API_BASE_URL}/products/${encodedId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update product');
  }

  // Инвалидируем кеш товаров после обновления
  clearProductsCache();

  return result;
}

/**
 * Очистить кеш товаров в localStorage
 */
export function clearProductsCache() {
  clearProductsCacheFromStore();
}

/**
 * Удалить товар
 */
export async function deleteProduct(id: string, token: string) {
  const encodedId = encodeURIComponent(id);
  const response = await fetch(`${API_BASE_URL}/products/${encodedId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete product');
  }

  // Инвалидируем кеш товаров после удаления
  clearProductsCache();

  return result;
}

/**
 * Переключить доступность товара
 */
export async function toggleProductAvailability(id: string, token: string) {
  const encodedId = encodeURIComponent(id);
  const response = await fetch(`${API_BASE_URL}/products/${encodedId}/availability`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to toggle availability');
  }

  // Инвалидируем кеш товаров после изменения доступности
  clearProductsCache();

  return result;
}

/**
 * Переключить статус "рекомендуемое"
 */
export async function toggleProductFeatured(id: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/products/${id}/featured`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to toggle featured');
  }

  // Инвалидируем кеш товаров после изменения статуса
  clearProductsCache();

  return result;
}

/**
 * Получить настройки ресторана
 */
export async function getRestaurantSettings() {
  const response = await fetch(`${API_BASE_URL}/settings`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch settings');
  }

  return result.data;
}

/**
 * Обновить настройки ресторана
 */
export async function updateRestaurantSettings(data: any, token: string) {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update settings');
  }

  return result.data;
}
