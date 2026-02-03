import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { User } from '../models/User';

// Определяем отдельный тип для user профиля
export interface ProfileUser {
  _id: string;
  phone: string;
  name?: string;
  email?: string;
}

// Расширяем типы Express
declare global {
  namespace Express {
    interface Request {
      profileUser?: ProfileUser;
    }
  }
}

/**
 * Middleware для проверки JWT токена пользователя
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Токен не предоставлен',
      });
    }

    const token = authHeader.substring(7); // Убираем "Bearer "

    // Верифицируем токен
    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Неверный или истёкший токен',
      });
    }

    // Проверяем тип токена
    if (decoded.type !== 'user') {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Доступ запрещён',
      });
    }

    // Получаем пользователя из БД
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    // Добавляем пользователя в request
    req.profileUser = {
      _id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      email: user.email,
    };
    
    // Для обратной совместимости
    req.user = req.profileUser as any;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
};

/**
 * Опциональная аутентификация (не требуется токен, но если есть - проверяем)
 */
export const optionalAuthenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Токена нет - продолжаем без аутентификации
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);

      if (decoded.type === 'user') {
        const user = await User.findById(decoded.userId);

        if (user) {
          req.profileUser = {
            _id: user._id.toString(),
            phone: user.phone,
            name: user.name,
            email: user.email,
          };
          req.user = req.profileUser as any;
        }
      }
    } catch (error) {
      // Игнорируем ошибки - просто не добавляем пользователя
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
