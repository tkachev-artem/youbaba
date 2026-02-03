import { useEffect } from 'react';
import { useRestaurantStore } from '../store/restaurantStore';

/**
 * Hook для работы со статусом ресторана
 * Автоматически загружает настройки при монтировании
 * и обновляет статус каждую минуту
 */
export function useRestaurantStatus() {
  const { settings, status, isLoading, error, fetchSettings, checkStatus } = useRestaurantStore();

  useEffect(() => {
    // Загружаем настройки при монтировании, если их еще нет
    if (!settings) {
      fetchSettings();
    } else {
      // Если настройки уже есть, просто пересчитываем статус
      checkStatus();
    }

    // Обновляем статус каждую минуту
    const interval = setInterval(() => {
      checkStatus();
    }, 60000); // 60 секунд

    return () => clearInterval(interval);
  }, [settings, fetchSettings, checkStatus]);

  return {
    // Статус работы
    isOpen: status?.isOpen ?? false,
    message: status?.message ?? 'Загрузка...',
    nextOpenTime: status?.nextOpenTime,

    // Информация о ресторане
    name: settings?.name ?? 'Юбаба',
    phone: settings?.phone ?? '+7 938 138-99-09',
    address: settings?.address ?? 'Ростов-на-Дону, ул. Эстонская 49А',
    coordinates: settings?.coordinates,
    openingHours: settings?.openingHours,

    // Состояние загрузки
    isLoading,
    error,

    // Для форматирования расписания
    getFormattedSchedule: () => {
      if (!settings?.openingHours) return '';
      
      const schedule = settings.openingHours;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
      
      // Проверяем, одинаковое ли расписание для всех дней
      const firstDay = schedule.monday;
      const allSame = days.every(
        day => 
          schedule[day].open === firstDay.open && 
          schedule[day].close === firstDay.close &&
          schedule[day].isClosed === firstDay.isClosed
      );

      if (allSame && !firstDay.isClosed) {
        return `Ежедневно с ${firstDay.open} до ${firstDay.close}`;
      }

      // Если расписание разное, возвращаем более детальную информацию
      const workDays = days.filter(day => !schedule[day].isClosed);
      if (workDays.length === 0) {
        return 'Закрыто';
      }

      const { open, close } = schedule[workDays[0]];
      return `Время работы: с ${open} до ${close}`;
    },
  };
}
