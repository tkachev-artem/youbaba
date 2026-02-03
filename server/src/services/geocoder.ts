import axios from 'axios';

const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  displayName: string;
  address: string;
  coordinates: Coordinates;
}

/**
 * Геокодирование адреса через Yandex Geocoder API
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const response = await axios.get(YANDEX_GEOCODER_URL, {
      params: {
        apikey: process.env.YANDEX_MAPS_API_KEY,
        geocode: `Ростов-на-Дону, ${address}`,
        format: 'json',
        results: 1
      }
    });

    const geoObject = response.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    
    if (!geoObject) {
      return null;
    }

    const pos = geoObject.Point.pos.split(' ');
    
    return {
      lng: parseFloat(pos[0]),
      lat: parseFloat(pos[1])
    };
  } catch (error) {
    console.error('Ошибка геокодирования:', error);
    return null;
  }
}

/**
 * Поиск подсказок адресов
 */
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const response = await axios.get(YANDEX_GEOCODER_URL, {
      params: {
        apikey: process.env.YANDEX_MAPS_API_KEY,
        geocode: `Ростов-на-Дону, ${query}`,
        format: 'json',
        results: 5
      }
    });

    const featureMembers = response.data?.response?.GeoObjectCollection?.featureMember || [];
    
    return featureMembers.map((member: any) => {
      const geoObject = member.GeoObject;
      const pos = geoObject.Point.pos.split(' ');
      
      return {
        displayName: geoObject.metaDataProperty.GeocoderMetaData.text,
        address: geoObject.name || geoObject.metaDataProperty.GeocoderMetaData.text,
        coordinates: {
          lng: parseFloat(pos[0]),
          lat: parseFloat(pos[1])
        }
      };
    });
  } catch (error) {
    console.error('Ошибка поиска адресов:', error);
    return [];
  }
}

/**
 * Расчет расстояния между двумя точками по формуле Haversine (в км)
 */
export function calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
  const R = 6371; // Радиус Земли в км
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10;
}

/**
 * Конвертация градусов в радианы
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Расчет стоимости доставки
 */
export function calculateDeliveryCost(distance: number): number {
  const FREE_DELIVERY_RADIUS = 2; // км
  const BASE_COST = 100; // ₽
  const COST_PER_KM = 25; // ₽ за км
  const MAX_DELIVERY_COST = 500; // ₽

  if (distance <= FREE_DELIVERY_RADIUS) {
    return 0;
  }
  
  const cost = BASE_COST + (distance * COST_PER_KM);
  return Math.min(Math.round(cost), MAX_DELIVERY_COST);
}
