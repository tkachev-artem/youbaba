import multer from 'multer';
import { Request } from 'express';
import path from 'path';

// Конфигурация для хранения файлов в памяти
const storage = multer.memoryStorage();

// Фильтр для проверки типа файла
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Разрешенные MIME типы
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed'));
  }
};

// Ограничения для загрузки
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB максимум
  files: 1, // Один файл за раз
};

// Основной multer middleware для одного изображения
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits,
}).single('image');

// Multer middleware для множественных изображений
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    ...limits,
    files: 10, // До 10 файлов
  },
}).array('images', 10);

// Обработчик ошибок multer
export function handleMulterError(err: any, req: Request, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    // Ошибки Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File is too large. Maximum size is 10MB',
        code: 'FILE_TOO_LARGE',
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files',
        code: 'TOO_MANY_FILES',
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field in form data',
        code: 'UNEXPECTED_FIELD',
      });
    }
    
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }
  
  if (err) {
    // Другие ошибки (например, из fileFilter)
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'INVALID_FILE',
    });
  }
  
  next();
}

// Middleware для проверки наличия файла
export function requireFile(req: Request, res: any, next: any) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      code: 'NO_FILE',
    });
  }
  
  next();
}

// Middleware для проверки наличия файлов (множественная загрузка)
export function requireFiles(req: Request, res: any, next: any) {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded',
      code: 'NO_FILES',
    });
  }
  
  next();
}

// Утилита для генерации уникального имени файла
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  
  // Очищаем имя файла от небезопасных символов
  const safeName = basename
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
  
  return `${timestamp}-${randomString}-${safeName}${ext}`;
}

// Утилита для валидации размера изображения
export function validateImageDimensions(
  width: number,
  height: number,
  maxWidth: number = 5000,
  maxHeight: number = 5000
): { valid: boolean; error?: string } {
  if (width > maxWidth || height > maxHeight) {
    return {
      valid: false,
      error: `Image dimensions too large. Maximum is ${maxWidth}x${maxHeight}px`,
    };
  }
  
  if (width < 100 || height < 100) {
    return {
      valid: false,
      error: 'Image dimensions too small. Minimum is 100x100px',
    };
  }
  
  return { valid: true };
}
