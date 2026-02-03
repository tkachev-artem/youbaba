import { create } from 'zustand';
import { HeroSlide, getHeroSlides } from '../lib/api/heroSlides';

const SLIDES_STORAGE_KEY = 'hero_slides_cache';
const SLIDES_TIMESTAMP_KEY = 'hero_slides_timestamp';
const CACHE_DURATION = 60 * 60 * 1000; // 1 час

interface HeroSlidesState {
  slides: HeroSlide[];
  loading: boolean;
  error: string | null;
  fetchSlides: (forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
}

// Загрузка слайдов из localStorage
const loadSlidesFromCache = (): HeroSlide[] | null => {
  try {
    const cached = localStorage.getItem(SLIDES_STORAGE_KEY);
    const timestamp = localStorage.getItem(SLIDES_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      // Кеш устарел
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error loading slides from cache:', error);
    return null;
  }
};

// Сохранение слайдов в localStorage
const saveSlidesToCache = (slides: HeroSlide[]) => {
  try {
    localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slides));
    localStorage.setItem(SLIDES_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving slides to cache:', error);
  }
};

// Получение последней даты обновления из кешированных слайдов
const getLastUpdateFromCache = (): string | null => {
  const slides = loadSlidesFromCache();
  if (!slides || slides.length === 0) return null;
  
  // Находим самую позднюю дату обновления среди всех слайдов
  const latestUpdate = slides.reduce((latest, slide) => {
    const slideUpdate = new Date(slide.updatedAt).getTime();
    return slideUpdate > latest ? slideUpdate : latest;
  }, 0);
  
  return latestUpdate > 0 ? new Date(latestUpdate).toISOString() : null;
};

export const useHeroSlidesStore = create<HeroSlidesState>((set, get) => ({
  slides: loadSlidesFromCache() || [],
  loading: false,
  error: null,

  fetchSlides: async (forceRefresh = false) => {
    // Если не принудительное обновление, пробуем загрузить из кеша
    if (!forceRefresh) {
      const cachedSlides = loadSlidesFromCache();
      if (cachedSlides && cachedSlides.length > 0) {
        const currentSlides = get().slides;
        // Обновляем только если слайды действительно изменились или еще не загружены
        if (currentSlides.length === 0 || JSON.stringify(cachedSlides) !== JSON.stringify(currentSlides)) {
          set({ slides: cachedSlides, loading: false });
        }
        
        // Запускаем проверку обновлений в фоне
        setTimeout(() => {
          get().fetchSlides(true);
        }, 1000);
        
        return;
      }
    }

    // Для фоновых обновлений не показываем loading
    const showLoading = !forceRefresh || get().slides.length === 0;
    
    if (showLoading) {
      set({ loading: true, error: null });
    }
    
    try {
      const slides = await getHeroSlides();
      
      // Проверяем, изменились ли слайды
      const currentSlides = get().slides;
      const hasChanges = JSON.stringify(slides) !== JSON.stringify(currentSlides);
      
      if (hasChanges) {
        saveSlidesToCache(slides);
        set({ slides, loading: false });
      } else {
        if (showLoading) {
          set({ loading: false });
        }
      }
    } catch (error) {
      console.error('Failed to fetch hero slides:', error);
      
      // Если ошибка и есть кешированные данные, используем их
      const cachedSlides = loadSlidesFromCache();
      if (cachedSlides && cachedSlides.length > 0) {
        const currentSlides = get().slides;
        if (currentSlides.length === 0 || JSON.stringify(cachedSlides) !== JSON.stringify(currentSlides)) {
          set({ slides: cachedSlides, loading: false, error: null });
        } else {
          set({ loading: false });
        }
      } else {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch slides',
          loading: false,
        });
      }
    }
  },

  clearError: () => set({ error: null }),
}));
