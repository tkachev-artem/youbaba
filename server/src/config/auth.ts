import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const authConfig = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  bcryptRounds: 10,
};

// Типы для JWT payload
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'super';
  _id?: string; // Для обратной совместимости
  iat?: number;
  exp?: number;
}

// Генерация JWT токена
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Верификация JWT токена
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Извлечение токена из заголовка Authorization
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // Формат: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}
