// API клиент для работы с товарами

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Product {
  _id: string;
  id: string;
  title: string;
  category: string;
  gram: string;
  description: string;
  price: number;
  image: {
    original: {
      url: string;
      bucket: string;
      filename: string;
      size: number;
      width: number;
      height: number;
    };
    thumbnail: {
      url: string;
      filename: string;
      size: number;
      width: number;
      height: number;
    };
  };
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
  views: number;
  sales: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  category?: string;
  available?: boolean;
  featured?: boolean;
  search?: string;
  sort?: 'title' | 'price' | 'order' | 'createdAt' | 'views' | 'sales';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProductStats {
  total: number;
  available: number;
  unavailable: number;
  featured: number;
  byCategory: Array<{
    _id: string;
    count: number;
    availableCount: number;
  }>;
}

/**
 * Получить все товары с фильтрацией и пагинацией
 */
export async function getProducts(params?: GetProductsParams): Promise<PaginatedResponse<Product>> {
  const queryParams = new URLSearchParams();
  
  if (params?.category) queryParams.append('category', params.category);
  if (params?.available !== undefined) queryParams.append('available', String(params.available));
  if (params?.featured !== undefined) queryParams.append('featured', String(params.featured));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.order) queryParams.append('order', params.order);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  
  const url = `${API_BASE_URL}/products?${queryParams.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Получить товар по ID
 */
export async function getProductById(id: string): Promise<ApiResponse<Product>> {
  // Кодируем ID для поддержки кириллицы
  const encodedId = encodeURIComponent(id);
  const response = await fetch(`${API_BASE_URL}/products/${encodedId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Получить товары по категории
 */
export async function getProductsByCategory(category: string): Promise<ApiResponse<Product[]>> {
  const response = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(category)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch products by category: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Получить статистику по товарам
 */
export async function getProductStats(): Promise<ApiResponse<ProductStats>> {
  const response = await fetch(`${API_BASE_URL}/products/stats`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch product stats: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Группировать товары по категориям
 * Используется для совместимости со старым интерфейсом
 */
export function groupProductsByCategory(products: Product[]): Array<{ title: string; items: Product[] }> {
  const grouped = new Map<string, Product[]>();
  
  products.forEach(product => {
    if (!grouped.has(product.category)) {
      grouped.set(product.category, []);
    }
    grouped.get(product.category)!.push(product);
  });
  
  // Сортируем товары внутри категории по order
  grouped.forEach(items => {
    items.sort((a, b) => a.order - b.order);
  });
  
  // Преобразуем Map в массив объектов
  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}
