import crypto from 'crypto';

/**
 * Генерация 6-значного числового кода
 */
export const generateVerificationCode = (): string => {
  // Генерируем случайное число от 100000 до 999999
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
};

/**
 * Генерация уникального session ID
 */
export const generateSessionId = (): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
};

/**
 * Хеширование кода для безопасного хранения
 */
export const hashCode = (code: string): string => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Проверка кода с хешем
 */
export const verifyCode = (code: string, hashedCode: string): boolean => {
  const hash = hashCode(code);
  return hash === hashedCode;
};
