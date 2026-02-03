import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Product';

// Схема валидации для создания товара
export const createProductSchema = Joi.object({
  id: Joi.string()
    .required()
    .min(3)
    .max(100)
    .pattern(/^[a-zа-яё0-9-]+$/i)
    .messages({
      'string.pattern.base': 'ID must contain only letters (latin or cyrillic), numbers and hyphens',
    }),
  title: Joi.string().required().min(3).max(200),
  category: Joi.string()
    .required()
    .valid(...Object.values(Category)),
  gram: Joi.string().required().min(1).max(50),
  description: Joi.string().allow('').optional().max(1000),
  price: Joi.number().required().min(0).max(100000),
  isAvailable: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
});

// Схема валидации для обновления товара
export const updateProductSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  category: Joi.string()
    .valid(...Object.values(Category))
    .optional(),
  gram: Joi.string().min(1).max(50).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  price: Joi.number().min(0).max(100000).optional(),
  isAvailable: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1); // Хотя бы одно поле должно быть указано

// Схема валидации для query параметров получения товаров
export const getProductsQuerySchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(Category))
    .optional(),
  available: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  search: Joi.string().min(2).max(100).optional(),
  sort: Joi.string()
    .valid('title', 'price', 'order', 'createdAt', 'views', 'sales')
    .optional(),
  order: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

// Схема валидации для ID товара
export const productIdSchema = Joi.object({
  id: Joi.string()
    .required()
    .min(3)
    .max(100)
    .pattern(/^[a-zа-яё0-9-]+$/i),
});

// Схема валидации для входа админа
export const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6).max(100),
});

// Схема валидации для создания админа
export const createAdminSchema = Joi.object({
  username: Joi.string()
    .required()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .messages({
      'string.pattern.base': 'Username must contain only lowercase letters, numbers and underscores',
    }),
  password: Joi.string()
    .required()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    }),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'super').optional(),
});

/**
 * Generic middleware для валидации данных
 */
function validate(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params') {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Возвращаем все ошибки, а не только первую
      stripUnknown: true, // Удаляем неизвестные поля
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    // Заменяем данные валидированными и очищенными значениями
    req[property] = value;
    next();
  };
}

// Экспортируем middleware для разных случаев
export const validateBody = (schema: Joi.ObjectSchema) => validate(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) => validate(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) => validate(schema, 'params');

// Готовые middleware для часто используемых валидаций
export const validateCreateProduct = validateBody(createProductSchema);
export const validateUpdateProduct = validateBody(updateProductSchema);
export const validateGetProductsQuery = validateQuery(getProductsQuerySchema);
export const validateProductId = validateParams(productIdSchema);
export const validateLogin = validateBody(loginSchema);
export const validateCreateAdmin = validateBody(createAdminSchema);

/**
 * Middleware для санитизации строк (защита от XSS)
 */
export function sanitizeStrings(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Удаляем потенциально опасные символы
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
}

/**
 * Middleware для конвертации булевых query параметров
 */
export function parseQueryBooleans(req: Request, res: Response, next: NextFunction) {
  if (req.query) {
    for (const key in req.query) {
      const value = req.query[key];
      if (value === 'true') {
        (req.query as any)[key] = true;
      } else if (value === 'false') {
        (req.query as any)[key] = false;
      }
    }
  }
  next();
}

/**
 * Middleware для конвертации числовых query параметров
 */
export function parseQueryNumbers(req: Request, res: Response, next: NextFunction) {
  if (req.query) {
    const numericFields = ['page', 'limit', 'price', 'order'];
    
    for (const field of numericFields) {
      if (req.query[field]) {
        const value = req.query[field];
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            (req.query as any)[field] = num;
          }
        }
      }
    }
  }
  next();
}
