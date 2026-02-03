import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Типы данных
export interface DaySchedule {
  open: string;      // "HH:MM"
  close: string;     // "HH:MM"
  isClosed: boolean;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RestaurantSettings {
  _id: string;
  name: string;
  address: string;
  phone: string;
  coordinates: Coordinates;
  openingHours: OpeningHours;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface RestaurantStatus {
  isOpen: boolean;
  message: string;
  nextOpenTime: string | null;
}

export interface RestaurantState {
  settings: RestaurantSettings | null;
  status: RestaurantStatus | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  updateSettings: (settings: Partial<RestaurantSettings>, token: string) => Promise<void>;
  checkStatus: () => void; // Клиентская проверка статуса
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set, get) => ({
      settings: null,
      status: null,
      isLoading: false,
      error: null,

      // Получить настройки ресторана
      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/settings`);
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Ошибка получения настроек');
          }

          set({ 
            settings: result.data, 
            isLoading: false 
          });

          // После получения настроек сразу проверяем статус
          get().checkStatus();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            isLoading: false 
          });
        }
      },

      // Получить статус работы ресторана (с сервера)
      fetchStatus: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/settings/status`);
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Ошибка получения статуса');
          }

          set({ status: result.data });
        } catch (error) {
          console.error('Ошибка получения статуса:', error);
        }
      },

      // Обновить настройки (админ)
      updateSettings: async (updates: Partial<RestaurantSettings>, token: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentSettings = get().settings;
          if (!currentSettings) {
            throw new Error('Настройки не загружены');
          }

          const updatedData = {
            ...currentSettings,
            ...updates,
          };

          const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updatedData),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Ошибка обновления настроек');
          }

          set({ 
            settings: result.data, 
            isLoading: false 
          });

          // Обновляем статус
          get().checkStatus();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            isLoading: false 
          });
          throw error;
        }
      },

      // Проверить статус на клиенте (без запроса к серверу)
      checkStatus: () => {
        const { settings } = get();
        if (!settings) return;

        const status = calculateRestaurantStatus(settings);
        set({ status });
      },
    }),
    {
      name: 'restaurant-storage',
      // Сохраняем только настройки (статус пересчитывается при загрузке)
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);

/**
 * Клиентская функция для расчета статуса работы
 */
function calculateRestaurantStatus(settings: RestaurantSettings): RestaurantStatus {
  // Проверяем флаг isActive
  if (!settings.isActive) {
    return {
      isOpen: false,
      message: 'Временно не\u00A0работаем',
      nextOpenTime: null,
    };
  }

  // Получаем текущее время
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Маппинг дней недели
  const dayNames: (keyof OpeningHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const dayName = dayNames[currentDay];
  const todaySchedule = settings.openingHours[dayName];

  // Проверяем, работает ли сегодня
  if (todaySchedule.isClosed) {
    return findNextOpenTime(settings, currentDay);
  }

  // Парсим время открытия и закрытия
  const [openHour, openMin] = todaySchedule.open.split(':').map(Number);
  const [closeHour, closeMin] = todaySchedule.close.split(':').map(Number);
  const openTimeInMinutes = openHour * 60 + openMin;
  const closeTimeInMinutes = closeHour * 60 + closeMin;

  // Проверяем текущее время
  if (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes) {
    return {
      isOpen: true,
      message: 'Мы открыты',
      nextOpenTime: null,
    };
  } else if (currentTimeInMinutes < openTimeInMinutes) {
    return {
      isOpen: false,
      message: `Откроемся в\u00A0${todaySchedule.open}`,
      nextOpenTime: todaySchedule.open,
    };
  } else {
    return findNextOpenTime(settings, currentDay);
  }
}

/**
 * Найти следующее время открытия
 */
function findNextOpenTime(settings: RestaurantSettings, currentDay: number): RestaurantStatus {
  const dayNames: (keyof OpeningHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const dayNamesRu = [
    'воскресенье',
    'понедельник',
    'вторник',
    'среду',
    'четверг',
    'пятницу',
    'субботу',
  ];

  // Ищем следующий рабочий день
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const dayName = dayNames[nextDay];
    const schedule = settings.openingHours[dayName];

    if (!schedule.isClosed) {
      const dayLabel = i === 1 ? 'завтра' : `в\u00A0${dayNamesRu[nextDay]}`;
      return {
        isOpen: false,
        message: `Откроемся ${dayLabel} в\u00A0${schedule.open}`,
        nextOpenTime: schedule.open,
      };
    }
  }

  // Если все дни закрыты
  return {
    isOpen: false,
    message: 'Временно не\u00A0работаем',
    nextOpenTime: null,
  };
}
