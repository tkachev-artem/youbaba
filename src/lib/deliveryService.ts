/**
 * Сервис для расчёта стоимости доставки
 * Использует наш бэкенд с Яндекс.Карты API
 */

// URL бэкенда
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Типы
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DeliveryResult {
  distance: number; // км
  cost: number; // ₽
  isFree: boolean;
  address: string;
  coordinates: Coordinates; // координаты адреса доставки
}

/**
 * Интерфейс для подсказки адреса
 */
export interface AddressSuggestion {
  displayName: string; // Полный адрес для отображения
  address: string; // Короткий адрес для поиска
  coordinates: Coordinates;
}

/**
 * Получить подсказки адресов при вводе
 * @param query - Частичный адрес для поиска
 * @returns Promise с массивом подсказок
 */
export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/delivery/suggestions?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка поиска подсказок:', error);
    return [];
  }
}

/**
 * Полный расчёт доставки по адресу
 * @param address - Адрес доставки
 * @returns Promise с результатом расчёта или null если адрес не найден
 */
export async function calculateDelivery(address: string): Promise<DeliveryResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/delivery/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address })
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Адрес не найден
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка расчёта доставки:', error);
    return null;
  }
}

/**
 * Получить координаты ресторана
 */
export async function getRestaurantCoords(): Promise<Coordinates> {
  try {
    const response = await fetch(`${API_BASE_URL}/delivery/restaurant`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка получения координат ресторана:', error);
    // Возвращаем координаты по умолчанию
    return { lat: 47.225970, lng: 39.686114 };
  }
}
