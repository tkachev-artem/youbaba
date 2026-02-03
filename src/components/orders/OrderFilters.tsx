import type { OrderStatus } from '../../lib/api/ordersOperator';

interface OrderFiltersProps {
  status: OrderStatus | 'all';
  fulfillmentType: 'all' | 'delivery' | 'pickup';
  search: string;
  onStatusChange: (status: OrderStatus | 'all') => void;
  onFulfillmentTypeChange: (type: 'all' | 'delivery' | 'pickup') => void;
  onSearchChange: (search: string) => void;
}

/**
 * Форматирует ввод номера заказа: 1 буква (А-Я, A-Z), автоматический дефис, затем цифры
 * Примеры: А-123, B-4567
 */
const formatOrderNumber = (value: string): string => {
  // Удаляем все, кроме букв и цифр
  const cleaned = value.replace(/[^А-ЯA-Z0-9а-яa-z]/gi, '');
  
  if (cleaned.length === 0) return '';
  
  // Берём первую букву и переводим в верхний регистр
  const letter = cleaned.charAt(0).toUpperCase();
  
  // Если введена только буква
  if (cleaned.length === 1) {
    // Проверяем что это действительно буква
    if (/[А-ЯA-Z]/i.test(letter)) {
      return letter;
    }
    return '';
  }
  
  // Если введено больше символов
  // Берём только цифры после первого символа
  const digits = cleaned.slice(1).replace(/\D/g, '');
  
  // Если нет цифр, возвращаем только букву
  if (digits.length === 0) {
    if (/[А-ЯA-Z]/i.test(letter)) {
      return letter + '-';
    }
    return '';
  }
  
  // Формат: Буква-Цифры
  if (/[А-ЯA-Z]/i.test(letter)) {
    return `${letter}-${digits}`;
  }
  
  return '';
};

/**
 * Фильтры для списка заказов
 */
export function OrderFilters({
  status,
  fulfillmentType,
  search,
  onStatusChange,
  onFulfillmentTypeChange,
  onSearchChange,
}: OrderFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Если строка похожа на номер заказа (начинается с буквы или буквы с дефисом)
    // то применяем форматирование
    if (/^[А-ЯA-Zа-яa-z]/.test(value)) {
      const formatted = formatOrderNumber(value);
      onSearchChange(formatted);
    } else {
      // Иначе это может быть поиск по телефону или имени
      onSearchChange(value);
    }
  };

  return (
    <div className="orders-filters">
      {/* Поиск */}
      <div className="orders-filter-search">
        <input
          type="text"
          className="orders-filter-input"
          placeholder="Поиск по номеру (А-123), телефону, имени..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* Статус */}
      <select
        className="orders-filter-select"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as OrderStatus | 'all')}
      >
        <option value="all">Все статусы</option>
        <option value="pending">Ожидают подтверждения</option>
        <option value="confirmed">Подтверждённые</option>
        <option value="preparing">Готовятся</option>
        <option value="ready">Готовы</option>
        <option value="in_delivery">В доставке</option>
        <option value="completed">Выполненные</option>
        <option value="cancelled">Отменённые</option>
      </select>

      {/* Тип получения */}
      <select
        className="orders-filter-select"
        value={fulfillmentType}
        onChange={(e) => onFulfillmentTypeChange(e.target.value as any)}
      >
        <option value="all">Все типы</option>
        <option value="delivery">Доставка</option>
        <option value="pickup">Самовывоз</option>
      </select>

      {/* Дата (пока статичная) */}
      <select className="orders-filter-select">
        <option value="today">Сегодня</option>
        <option value="yesterday">Вчера</option>
        <option value="week">Неделя</option>
        <option value="month">Месяц</option>
      </select>
    </div>
  );
}
