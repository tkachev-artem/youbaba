import { create } from 'zustand';
import { getProducts, getProductsByCategory, Product } from '../lib/api/products';

const CACHE_KEY = 'products_cache';
const CACHE_HASH_KEY = 'products_cache_hash';
const CACHE_TIMESTAMP_KEY = 'products_cache_timestamp';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 часа

// Функция для расчета хеша товаров (простая версия)
function calculateProductsHash(products: Product[]): string {
  const serialized = JSON.stringify(products.map(p => p.updatedAt).sort());
  return btoa(serialized).substring(0, 16); // Берем первые 16 символов base64
}

// Функция для загрузки товаров из localStorage
function loadFromCache(): { products: Product[]; grouped: Array<{ title: string; items: Product[] }> } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    // Проверяем, не истек ли кеш
    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_HASH_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    const products = JSON.parse(cached);
    const grouped = groupProductsByCategory(products);
    return { products, grouped };
  } catch (error) {
    console.error('Error loading products from cache:', error);
    return null;
  }
}

// Функция для сохранения товаров в localStorage
function saveToCache(products: Product[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(CACHE_HASH_KEY, calculateProductsHash(products));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving products to cache:', error);
  }
}

// Функция для группировки товаров по категориям
function groupProductsByCategory(products: Product[]): Array<{ title: string; items: Product[] }> {
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

// Экспортируем функцию для очистки кеша (может использоваться в других местах)
export function clearProductsCacheFromStore() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_HASH_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

interface ProductsState {
  products: Product[];
  groupedProducts: Array<{ title: string; items: Product[] }>;
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  
  // Actions
  fetchProducts: (forceRefresh?: boolean) => Promise<void>;
  fetchProductsByCategory: (category: string) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  getFeaturedProducts: () => Product[];
  clearError: () => void;
  checkForUpdates: () => Promise<boolean>; // Возвращает true если были обновления
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  groupedProducts: [],
  isLoading: false,
  error: null,
  selectedCategory: null,

  fetchProducts: async (forceRefresh = false) => {
    // Если не форсируем обновление, пробуем загрузить из кеша
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        set({
          products: cached.products,
          groupedProducts: cached.grouped,
          isLoading: false,
          error: null,
        });
        return;
      }
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await getProducts({
        available: true,
        sort: 'order',
        order: 'asc',
        limit: 100,
      });
      
      const products = response.data;
      const groupedProducts = groupProductsByCategory(products);
      
      // Сохраняем в localStorage
      saveToCache(products);
      
      set({
        products,
        groupedProducts,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Если ошибка, пробуем загрузить из кеша
      const cached = loadFromCache();
      if (cached) {
        set({
          products: cached.products,
          groupedProducts: cached.grouped,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load products',
        });
      }
    }
  },

  fetchProductsByCategory: async (category: string) => {
    set({ isLoading: true, error: null, selectedCategory: category });
    
    try {
      const response = await getProductsByCategory(category);
      const products = response.data;
      
      const sortedProducts = [...products].sort((a, b) => a.order - b.order);
      const groupedProducts = [{
        title: category,
        items: sortedProducts,
      }];
      
      set({
        products: sortedProducts,
        groupedProducts,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching products by category:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load products',
      });
    }
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
    
    if (category === null) {
      get().fetchProducts();
    } else {
      get().fetchProductsByCategory(category);
    }
  },

  getFeaturedProducts: () => {
    const { products } = get();
    return products
      .filter(p => p.isFeatured && p.isAvailable)
      .sort((a, b) => a.order - b.order);
  },

  clearError: () => {
    set({ error: null });
  },

  checkForUpdates: async () => {
    try {
      const response = await getProducts({
        available: true,
        sort: 'order',
        order: 'asc',
        limit: 100,
      });
      
      const newProducts = response.data;
      const newHash = calculateProductsHash(newProducts);
      const oldHash = localStorage.getItem(CACHE_HASH_KEY);
      
      if (newHash !== oldHash) {
        // Товары изменились, обновляем кеш
        const groupedProducts = groupProductsByCategory(newProducts);
        saveToCache(newProducts);
        
        set({
          products: newProducts,
          groupedProducts,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  },
}));
