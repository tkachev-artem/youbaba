import { Router, Request, Response } from 'express';
import { RestaurantSettings, IRestaurantSettings } from '../models/RestaurantSettings';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/settings
 * Получить настройки ресторана (публичный endpoint)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Получаем первую (и единственную) запись настроек
    let settings = await RestaurantSettings.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Настройки ресторана не найдены. Выполните seed скрипт.',
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении настроек',
    });
  }
});

/**
 * GET /api/settings/status
 * Получить текущий статус работы ресторана (публичный endpoint)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const settings = await RestaurantSettings.findOne();

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Настройки ресторана не найдены',
      });
    }

    const status = calculateRestaurantStatus(settings);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Ошибка получения статуса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении статуса',
    });
  }
});

/**
 * PUT /api/settings
 * Обновить настройки ресторана (защищенный endpoint)
 */
router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      phone,
      coordinates,
      openingHours,
      isActive,
    } = req.body;

    // Валидация обязательных полей
    if (!name || !address || !phone || !coordinates || !openingHours) {
      return res.status(400).json({
        success: false,
        error: 'Не все обязательные поля заполнены',
      });
    }

    // Валидация координат
    if (
      typeof coordinates.lat !== 'number' ||
      typeof coordinates.lng !== 'number' ||
      coordinates.lat < -90 ||
      coordinates.lat > 90 ||
      coordinates.lng < -180 ||
      coordinates.lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Некорректные координаты',
      });
    }

    // Валидация часов работы
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const day of days) {
      if (!openingHours[day]) {
        return res.status(400).json({
          success: false,
          error: `Отсутствует расписание для ${day}`,
        });
      }

      const schedule = openingHours[day];
      
      if (!timeRegex.test(schedule.open) || !timeRegex.test(schedule.close)) {
        return res.status(400).json({
          success: false,
          error: `Некорректный формат времени для ${day}. Используйте HH:MM`,
        });
      }

      // Проверка что время закрытия позже времени открытия
      if (!schedule.isClosed) {
        const [openHour, openMin] = schedule.open.split(':').map(Number);
        const [closeHour, closeMin] = schedule.close.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

        if (closeMinutes <= openMinutes) {
          return res.status(400).json({
            success: false,
            error: `Время закрытия должно быть позже времени открытия для ${day}`,
          });
        }
      }
    }

    // Получаем ID админа из токена
    const adminId = (req as any).user?.id;

    // Обновляем или создаем настройки (singleton)
    let settings = await RestaurantSettings.findOne();

    if (settings) {
      // Обновляем существующие настройки
      settings.name = name;
      settings.address = address;
      settings.phone = phone;
      settings.coordinates = coordinates;
      settings.openingHours = openingHours;
      settings.isActive = isActive !== undefined ? isActive : settings.isActive;
      settings.updatedBy = adminId;

      await settings.save();
    } else {
      // Создаем новые настройки
      settings = await RestaurantSettings.create({
        name,
        address,
        phone,
        coordinates,
        openingHours,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: adminId,
      });
    }

    res.json({
      success: true,
      data: settings,
      message: 'Настройки успешно обновлены',
    });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера при обновлении настроек',
    });
  }
});

/**
 * Вспомогательная функция для расчета статуса работы ресторана
 */
function calculateRestaurantStatus(settings: IRestaurantSettings) {
  // Проверяем флаг isActive
  if (!settings.isActive) {
    return {
      isOpen: false,
      message: 'Временно не работаем',
      nextOpenTime: null,
    };
  }

  // Получаем текущее время
  const now = new Date();
  const moscowOffset = 3; // UTC+3 для Ростова-на-Дону
  const moscowTime = new Date(now.getTime() + moscowOffset * 60 * 60 * 1000);
  
  const currentDay = moscowTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const currentHours = moscowTime.getUTCHours();
  const currentMinutes = moscowTime.getUTCMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Маппинг дней недели
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[currentDay] as keyof typeof settings.openingHours;
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
      message: `Откроемся в ${todaySchedule.open}`,
      nextOpenTime: todaySchedule.open,
    };
  } else {
    return findNextOpenTime(settings, currentDay);
  }
}

/**
 * Найти следующее время открытия
 */
function findNextOpenTime(settings: IRestaurantSettings, currentDay: number) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesRu = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];

  // Ищем следующий рабочий день
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const dayName = dayNames[nextDay] as keyof typeof settings.openingHours;
    const schedule = settings.openingHours[dayName];

    if (!schedule.isClosed) {
      const dayLabel = i === 1 ? 'завтра' : `в ${dayNamesRu[nextDay]}`;
      return {
        isOpen: false,
        message: `Откроемся ${dayLabel} в ${schedule.open}`,
        nextOpenTime: schedule.open,
      };
    }
  }

  // Если все дни закрыты
  return {
    isOpen: false,
    message: 'Временно не работаем',
    nextOpenTime: null,
  };
}

export default router;
