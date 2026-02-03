import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../config/auth';

// Расширяем тип Request для добавления user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: JwtPayload;
    }
  }
}

// Экспортируем расширенный тип Request для использования в других модулях
export interface AuthRequest extends Request {
  admin?: JwtPayload;
  user?: JwtPayload;
}

/**
 * Middleware для проверки JWT токена
 * Добавляет user в request если токен валиден
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }
    
    // Верифицируем токен
    const payload = verifyToken(token);
    req.user = payload;
    req.admin = payload; // Для обратной совместимости
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Middleware для проверки роли админа
 * Должен использоваться после authenticate
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH',
    });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'super') {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }
  
  next();
}

/**
 * Middleware для проверки роли супер-админа
 * Должен использоваться после authenticate
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH',
    });
  }
  
  if (req.user.role !== 'super') {
    return res.status(403).json({
      success: false,
      error: 'Super admin privileges required',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }
  
  next();
}

/**
 * Опциональная аутентификация
 * Добавляет user в request если токен есть и валиден, но не требует его
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      const payload = verifyToken(token);
      req.user = payload;
    }
  } catch (error) {
    // Игнорируем ошибки токена для опциональной аутентификации
  }
  
  next();
}
