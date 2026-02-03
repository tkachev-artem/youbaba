import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface HeroSlideImage {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
  objectName: string;
}

export interface HeroSlideImagePosition {
  positionX?: number; // Позиция X в процентах (0-100)
  positionY?: number; // Позиция Y в процентах (0-100)
  // Legacy поля для обратной совместимости
  objectPosition?: string;
  backgroundPosition?: string;
}

export interface HeroSlide {
  _id: string;
  bgImage: HeroSlideImage;
  imagePosition: HeroSlideImagePosition;
  hashtag: string;
  title: string;
  text: string;
  mobileTitle?: string;
  mobileText?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHeroSlideData {
  image: File;
  hashtag: string;
  title: string;
  text?: string;
  mobileTitle?: string;
  mobileText?: string;
  order?: number;
  isActive?: boolean;
  imagePosition?: HeroSlideImagePosition;
}

export interface UpdateHeroSlideData {
  image?: File;
  hashtag?: string;
  title?: string;
  text?: string;
  mobileTitle?: string;
  mobileText?: string;
  order?: number;
  isActive?: boolean;
  imagePosition?: HeroSlideImagePosition;
}

/**
 * Получить все активные слайды (публичный доступ)
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const response = await axios.get(`${API_BASE_URL}/hero-slides`);
  return response.data.data;
}

/**
 * Получить все слайды (включая неактивные) - только для админов
 */
export async function getAllHeroSlides(token: string): Promise<HeroSlide[]> {
  const response = await axios.get(`${API_BASE_URL}/hero-slides/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
}

/**
 * Получить конкретный слайд по ID
 */
export async function getHeroSlideById(id: string, token: string): Promise<HeroSlide> {
  const response = await axios.get(`${API_BASE_URL}/hero-slides/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
}

/**
 * Создать новый слайд
 */
export async function createHeroSlide(data: CreateHeroSlideData, token: string): Promise<HeroSlide> {
  const formData = new FormData();
  formData.append('image', data.image);
  formData.append('hashtag', data.hashtag);
  formData.append('title', data.title);
  
  if (data.text) formData.append('text', data.text);
  if (data.mobileTitle) formData.append('mobileTitle', data.mobileTitle);
  if (data.mobileText) formData.append('mobileText', data.mobileText);
  if (data.order !== undefined) formData.append('order', data.order.toString());
  if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
  if (data.imagePosition) formData.append('imagePosition', JSON.stringify(data.imagePosition));

  const response = await axios.post(`${API_BASE_URL}/hero-slides`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
}

/**
 * Обновить слайд
 */
export async function updateHeroSlide(
  id: string,
  data: UpdateHeroSlideData,
  token: string
): Promise<HeroSlide> {
  const formData = new FormData();
  
  if (data.image) formData.append('image', data.image);
  if (data.hashtag) formData.append('hashtag', data.hashtag);
  if (data.title) formData.append('title', data.title);
  if (data.text !== undefined) formData.append('text', data.text);
  if (data.mobileTitle !== undefined) formData.append('mobileTitle', data.mobileTitle);
  if (data.mobileText !== undefined) formData.append('mobileText', data.mobileText);
  if (data.order !== undefined) formData.append('order', data.order.toString());
  if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
  if (data.imagePosition) formData.append('imagePosition', JSON.stringify(data.imagePosition));

  const response = await axios.put(`${API_BASE_URL}/hero-slides/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
}

/**
 * Удалить слайд
 */
export async function deleteHeroSlide(id: string, token: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/hero-slides/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Изменить порядок слайдов
 */
export async function reorderHeroSlides(
  slides: Array<{ id: string; order: number }>,
  token: string
): Promise<void> {
  await axios.patch(
    `${API_BASE_URL}/hero-slides/reorder`,
    { slides },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
