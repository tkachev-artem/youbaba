import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

// Кастомный класс ошибки приложения
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Специфичные ошибки приложения
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Главный обработчик ошибок Express
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Логируем ошибку
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  // Проверяем тип ошибки и формируем ответ
  
  // 1. Наши кастомные ошибки AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 2. Ошибки валидации Mongoose
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    });
  }

  // 3. Ошибки дублирования MongoDB (unique constraint)
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: `${field} already exists`,
      code: 'DUPLICATE_KEY',
      field,
    });
  }

  // 4. Ошибки CastError Mongoose (неверный ID)
  if (err instanceof MongooseError.CastError) {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_ID',
    });
  }

  // 5. JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // 6. Multer ошибки (уже обработаны в upload middleware, но на всякий случай)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  // 7. Общая внутренняя ошибка сервера
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Обработчик для несуществующих маршрутов (404)
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

/**
 * Wrapper для async функций в route handlers
 * Автоматически передает ошибки в errorHandler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware для логирования запросов
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Логируем после отправки ответа
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    
    // Цветной вывод в зависимости от статуса
    if (res.statusCode >= 500) {
      console.error('❌', log);
    } else if (res.statusCode >= 400) {
      console.warn('⚠️', log);
    } else {
      console.log('✅', log);
    }
  });
  
  next();
}

/**
 * Middleware для обработки timeout запросов
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT',
        });
      }
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
}
