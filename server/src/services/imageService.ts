import sharp from 'sharp';
import path from 'path';
import { Buffer } from 'buffer';

// Конфигурация для конвертации изображений
const IMAGE_CONFIG = {
  original: {
    format: 'webp' as const,
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1920,
  },
  thumbnail: {
    format: 'webp' as const,
    quality: 80,
    width: 400,
    height: 400,
    fit: 'cover' as const,
  },
};

export interface ProcessedImage {
  original: {
    buffer: Buffer;
    filename: string;
    size: number;
    width: number;
    height: number;
    mimetype: string;
  };
  thumbnail: {
    buffer: Buffer;
    filename: string;
    size: number;
    width: number;
    height: number;
    mimetype: string;
  };
}

/**
 * Конвертирует изображение в WebP формат (оригинал и миниатюра)
 * @param inputBuffer - Буфер исходного изображения
 * @param originalFilename - Оригинальное имя файла
 * @returns Объект с обработанными изображениями
 */
export async function convertToWebP(
  inputBuffer: Buffer,
  originalFilename: string
): Promise<ProcessedImage> {
  try {
    // Получаем базовое имя файла без расширения
    const baseFilename = path.parse(originalFilename).name;
    
    // Обрабатываем оригинал
    const originalImage = sharp(inputBuffer);
    const originalMetadata = await originalImage.metadata();
    
    // Конвертируем оригинал в WebP с ограничением размера
    const originalBuffer = await originalImage
      .resize(IMAGE_CONFIG.original.maxWidth, IMAGE_CONFIG.original.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_CONFIG.original.quality })
      .toBuffer();
    
    const originalProcessed = await sharp(originalBuffer).metadata();
    const originalFilenameWebp = `${baseFilename}.webp`;
    
    // Создаем миниатюру
    const thumbnailBuffer = await sharp(inputBuffer)
      .resize(IMAGE_CONFIG.thumbnail.width, IMAGE_CONFIG.thumbnail.height, {
        fit: IMAGE_CONFIG.thumbnail.fit,
        position: 'center',
      })
      .webp({ quality: IMAGE_CONFIG.thumbnail.quality })
      .toBuffer();
    
    const thumbnailProcessed = await sharp(thumbnailBuffer).metadata();
    const thumbnailFilename = `${baseFilename}-thumb.webp`;
    
    return {
      original: {
        buffer: originalBuffer,
        filename: originalFilenameWebp,
        size: originalBuffer.length,
        width: originalProcessed.width || 0,
        height: originalProcessed.height || 0,
        mimetype: 'image/webp',
      },
      thumbnail: {
        buffer: thumbnailBuffer,
        filename: thumbnailFilename,
        size: thumbnailBuffer.length,
        width: thumbnailProcessed.width || IMAGE_CONFIG.thumbnail.width,
        height: thumbnailProcessed.height || IMAGE_CONFIG.thumbnail.height,
        mimetype: 'image/webp',
      },
    };
  } catch (error) {
    console.error('Error converting image to WebP:', error);
    throw new Error(`Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Проверяет, является ли файл изображением
 * @param mimetype - MIME тип файла
 * @returns true если файл является изображением
 */
export function isValidImageType(mimetype: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(mimetype.toLowerCase());
}

/**
 * Получает информацию об изображении
 * @param buffer - Буфер изображения
 * @returns Метаданные изображения
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    throw new Error('Invalid image file');
  }
}

/**
 * Оптимизирует существующее изображение
 * @param inputPath - Путь к исходному файлу
 * @param outputPath - Путь для сохранения результата
 */
export async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    await sharp(inputPath)
      .webp({ quality: IMAGE_CONFIG.original.quality })
      .toFile(outputPath);
    
    console.log(`✅ Image optimized: ${outputPath}`);
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw error;
  }
}
