import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRestaurantStore } from '../../store/restaurantStore';
import { getRestaurantSettings, updateRestaurantSettings } from '../../lib/api/admin';
import { Save, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import type { RestaurantSettings, DaySchedule } from '../../store/restaurantStore';
import '../../styles/admin.css';

export function SettingsPage() {
  const { token } = useAuthStore();
  const { fetchSettings } = useRestaurantStore();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загрузка настроек
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getRestaurantSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки настроек');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка изменений основных полей
  const handleFieldChange = (field: keyof RestaurantSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  // Обработка изменений координат
  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    if (!settings) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setSettings({
      ...settings,
      coordinates: {
        ...settings.coordinates,
        [field]: numValue,
      },
    });
  };

  // Обработка изменений расписания
  const handleScheduleChange = (
    day: string,
    field: keyof DaySchedule,
    value: string | boolean
  ) => {
    if (!settings) return;
    
    // Проверяем, что day является валидным ключом openingHours
    if (!(day in settings.openingHours)) return;
    
    setSettings({
      ...settings,
      openingHours: {
        ...settings.openingHours,
        [day]: {
          ...(settings.openingHours as any)[day],
          [field]: value,
        },
      },
    });
  };

  // Валидация времени
  const validateTime = (time: string): boolean => {
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  };

  // Валидация телефона
  const validatePhone = (phone: string): boolean => {
    const regex = /^\+?[0-9\s\-\(\)]{10,20}$/;
    return regex.test(phone);
  };

  // Сохранение настроек
  const handleSave = async () => {
    if (!settings || !token) return;

    // Валидация
    if (!settings.name.trim()) {
      setError('Название ресторана обязательно');
      return;
    }

    if (!settings.address.trim()) {
      setError('Адрес обязателен');
      return;
    }

    if (!validatePhone(settings.phone)) {
      setError('Некорректный формат телефона');
      return;
    }

    // Валидация времени для всех дней
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    for (const day of days) {
      const schedule = settings.openingHours[day];
      if (!schedule.isClosed) {
        if (!validateTime(schedule.open) || !validateTime(schedule.close)) {
          setError(`Некорректное время для ${getDayName(day)}`);
          return;
        }

        // Проверка что время закрытия позже открытия
        const [openH, openM] = schedule.open.split(':').map(Number);
        const [closeH, closeM] = schedule.close.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (closeMinutes <= openMinutes) {
          setError(`Время закрытия должно быть позже открытия для ${getDayName(day)}`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateRestaurantSettings(settings, token);
      
      // Обновляем глобальный store после сохранения
      await fetchSettings();
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  // Получить название дня на русском
  const getDayName = (day: string): string => {
    const names: Record<string, string> = {
      monday: 'Понедельник',
      tuesday: 'Вторник',
      wednesday: 'Среда',
      thursday: 'Четверг',
      friday: 'Пятница',
      saturday: 'Суббота',
      sunday: 'Воскресенье',
    };
    return names[day] || day;
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p className="admin-loading-text">Загрузка настроек...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="admin-loading">
        <div className="admin-alert admin-alert-error">
          Не удалось загрузить настройки
        </div>
        <button onClick={loadSettings} className="admin-btn admin-btn-primary">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Alerts */}
      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle size={20} />
          Настройки успешно сохранены!
        </div>
      )}

      {/* Form */}
      <div>
        {/* Основная информация */}
        <div className="admin-section">
          <h3 className="admin-section-title">Основная информация</h3>

          <div className="admin-form-group">
            <label className="admin-form-label">
              Название ресторана *
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="admin-form-input"
              placeholder="Юбаба"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">
              Адрес *
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              className="admin-form-input"
              placeholder="Ростов-на-Дону, ул. Эстонская 49А"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">
              Телефон *
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className="admin-form-input"
              placeholder="+7 938 138-99-09"
            />
          </div>
        </div>

        {/* Координаты */}
        <div className="admin-section">
          <h3 className="admin-section-title">Координаты для карты</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">
                Широта *
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.coordinates.lat}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                className="admin-form-input"
                placeholder="47.225970"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Долгота *
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.coordinates.lng}
                onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                className="admin-form-input"
                placeholder="39.686114"
              />
            </div>
          </div>
        </div>

        {/* Режим работы */}
        <div className="admin-section">
          <h3 className="admin-section-title">Режим работы</h3>

          {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
            const schedule = settings.openingHours[day];
            return (
              <div key={day} className="admin-schedule-day">
                <div className="admin-schedule-day-name">{getDayName(day)}</div>
                
                <div className="admin-schedule-time">
                  {!schedule.isClosed ? (
                    <>
                      <input
                        type="time"
                        value={schedule.open}
                        onChange={(e) => handleScheduleChange(day, 'open', e.target.value)}
                        className="admin-form-input admin-time-input"
                      />
                      <span className="admin-schedule-separator">—</span>
                      <input
                        type="time"
                        value={schedule.close}
                        onChange={(e) => handleScheduleChange(day, 'close', e.target.value)}
                        className="admin-form-input admin-time-input"
                      />
                    </>
                  ) : (
                    <span className="admin-schedule-closed">Выходной</span>
                  )}
                </div>

                <label className="admin-schedule-checkbox">
                  <input
                    type="checkbox"
                    checked={schedule.isClosed}
                    onChange={(e) => handleScheduleChange(day, 'isClosed', e.target.checked)}
                  />
                  <span>Выходной</span>
                </label>
              </div>
            );
          })}
        </div>

        {/* Статус */}
        <div className="admin-section">
          <h3 className="admin-section-title">Статус ресторана</h3>
          
          <label className="admin-toggle-switch">
            <input
              type="checkbox"
              checked={settings.isActive}
              onChange={(e) => handleFieldChange('isActive', e.target.checked)}
            />
            <span className="admin-toggle-slider"></span>
            <span className="admin-toggle-text">
              {settings.isActive ? 'Ресторан работает' : 'Ресторан временно закрыт'}
            </span>
          </label>

          {!settings.isActive && (
            <div className="admin-alert admin-alert-warning" style={{ marginTop: '16px' }}>
              <AlertTriangle size={18} />
              Ресторан отображается как закрытый для всех пользователей
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="admin-actions">
          <button
            onClick={loadSettings}
            disabled={isSaving}
            className="admin-btn admin-btn-secondary"
          >
            Отменить
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="admin-btn admin-btn-primary"
          >
            {isSaving ? (
              <>
                <div className="admin-spinner"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save size={18} />
                Сохранить изменения
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
