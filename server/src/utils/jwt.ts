import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  phone: string;
  type: 'user' | 'admin';
}

/**
 * Генерация JWT токена для пользователя
 */
export const generateUserToken = (userId: Types.ObjectId, phone: string): string => {
  const payload: JWTPayload = {
    userId: userId.toString(),
    phone,
    type: 'user',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

/**
 * Генерация JWT токена для админа/оператора
 */
export const generateAdminToken = (adminId: Types.ObjectId, username: string): string => {
  const payload = {
    userId: adminId.toString(),
    username,
    type: 'admin',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

/**
 * Верификация JWT токена
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Декодирование JWT токена без верификации
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
