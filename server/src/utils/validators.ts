/**
 * Валидация номера телефона (формат: +7XXXXXXXXXX)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+7\d{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Валидация email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

/**
 * Валидация кода верификации (6 цифр)
 */
export const isValidVerificationCode = (code: string): boolean => {
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
};

/**
 * Форматирование телефона (убираем все кроме цифр и добавляем +7)
 */
export const formatPhone = (phone: string): string => {
  // Убираем все символы кроме цифр
  const digits = phone.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  if (digits.startsWith('8')) {
    return `+7${digits.substring(1)}`;
  }
  
  // Если начинается с 7, добавляем +
  if (digits.startsWith('7')) {
    return `+${digits}`;
  }
  
  // Иначе добавляем +7
  return `+7${digits}`;
};

/**
 * Санитизация строки (удаление HTML тегов)
 */
export const sanitizeString = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};
