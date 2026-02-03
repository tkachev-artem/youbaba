import { Router, Request, Response } from 'express';
import { uploadSingle, handleMulterError, requireFile, generateUniqueFilename } from '../middleware/upload';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { convertToWebP, isValidImageType } from '../services/imageService';
import { uploadFile, deleteFile, fileExists } from '../services/minioService';

const router = Router();

/**
 * POST /api/upload/image
 * Загрузить изображение (ADMIN ONLY)
 * Конвертирует в WebP и загружает в MinIO
 */
router.post(
  '/image',
  authenticate,
  requireAdmin,
  uploadSingle,
  handleMulterError,
  requireFile,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // Проверка типа файла
    if (!isValidImageType(req.file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG and WebP are allowed');
    }

    // Генерируем уникальное имя файла
    const uniqueFilename = generateUniqueFilename(req.file.originalname);

    // Конвертируем в WebP
    const processedImages = await convertToWebP(req.file.buffer, uniqueFilename);

    // Загружаем оригинал и миниатюру
    const originalUrl = await uploadFile(
      processedImages.original.filename,
      processedImages.original.buffer,
      processedImages.original.mimetype
    );

    const thumbnailUrl = await uploadFile(
      processedImages.thumbnail.filename,
      processedImages.thumbnail.buffer,
      processedImages.thumbnail.mimetype
    );

    res.status(201).json({
      success: true,
      data: {
        original: {
          url: originalUrl,
          filename: processedImages.original.filename,
          size: processedImages.original.size,
          width: processedImages.original.width,
          height: processedImages.original.height,
        },
        thumbnail: {
          url: thumbnailUrl,
          filename: processedImages.thumbnail.filename,
          size: processedImages.thumbnail.size,
          width: processedImages.thumbnail.width,
          height: processedImages.thumbnail.height,
        },
      },
      message: 'Image uploaded successfully',
    });
  })
);

/**
 * DELETE /api/upload/:filename
 * Удалить изображение из MinIO (ADMIN ONLY)
 */
router.delete(
  '/:filename',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params;

    // Проверяем существование файла
    const exists = await fileExists(filename);
    if (!exists) {
      throw new NotFoundError('File not found');
    }

    // Удаляем файл
    await deleteFile(filename);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  })
);

/**
 * HEAD /api/upload/:filename
 * Проверить существование файла
 */
router.head(
  '/:filename',
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params;
    const exists = await fileExists(filename);

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }
  })
);

/**
 * POST /api/upload/test
 * Тестовый endpoint для проверки загрузки (ADMIN ONLY)
 */
router.post(
  '/test',
  authenticate,
  requireAdmin,
  uploadSingle,
  handleMulterError,
  requireFile,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    res.json({
      success: true,
      data: {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: `${req.file.buffer.length} bytes`,
      },
      message: 'File received successfully (not saved)',
    });
  })
);

export default router;
