import { minioClient, minioConfig, getPublicUrl } from '../config/minio';
import { Readable } from 'stream';

/**
 * Загружает файл в MinIO bucket с поддержкой подкаталогов
 * @param buffer - Буфер файла
 * @param filename - Имя файла
 * @param mimetype - MIME тип файла
 * @param folder - Опциональная папка (например, 'hero-slides')
 * @returns Объект с URL и objectName
 */
export async function uploadToMinio(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  folder?: string
): Promise<{ url: string; objectName: string }> {
  try {
    const bucketName = minioConfig.bucketProducts;
    const objectName = folder ? `${folder}/${filename}` : filename;
    
    // Создаем readable stream из буфера
    const stream = Readable.from(buffer);
    
    // Загружаем файл
    await minioClient.putObject(
      bucketName,
      objectName,
      stream,
      buffer.length,
      {
        'Content-Type': mimetype,
      }
    );
    
    console.log(`✅ File uploaded to MinIO: ${objectName}`);
    
    // Возвращаем публичный URL и objectName
    return {
      url: getPublicUrl(objectName),
      objectName: objectName,
    };
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Удаляет файл из MinIO bucket по objectName
 * @param objectName - Полное имя объекта (включая путь)
 */
export async function deleteFromMinio(objectName: string): Promise<void> {
  try {
    const bucketName = minioConfig.bucketProducts;
    
    await minioClient.removeObject(bucketName, objectName);
    console.log(`✅ File deleted from MinIO: ${objectName}`);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Загружает файл в MinIO bucket (старая сигнатура для обратной совместимости)
 * @param filename - Имя файла
 * @param buffer - Буфер файла
 * @param mimetype - MIME тип файла
 * @returns URL загруженного файла
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  try {
    const bucketName = minioConfig.bucketProducts;
    
    // Создаем readable stream из буфера
    const stream = Readable.from(buffer);
    
    // Загружаем файл
    await minioClient.putObject(
      bucketName,
      filename,
      stream,
      buffer.length,
      {
        'Content-Type': mimetype,
      }
    );
    
    console.log(`✅ File uploaded to MinIO: ${filename}`);
    
    // Возвращаем публичный URL
    return getPublicUrl(filename);
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Загружает несколько файлов одновременно
 * @param files - Массив файлов для загрузки
 * @returns Массив URL загруженных файлов
 */
export async function uploadMultipleFiles(
  files: Array<{ filename: string; buffer: Buffer; mimetype: string }>
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadFile(file.filename, file.buffer, file.mimetype)
    );
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
}

/**
 * Удаляет файл из MinIO bucket
 * @param filename - Имя файла для удаления
 */
export async function deleteFile(filename: string): Promise<void> {
  try {
    const bucketName = minioConfig.bucketProducts;
    
    await minioClient.removeObject(bucketName, filename);
    console.log(`✅ File deleted from MinIO: ${filename}`);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Удаляет несколько файлов одновременно
 * @param filenames - Массив имен файлов для удаления
 */
export async function deleteMultipleFiles(filenames: string[]): Promise<void> {
  try {
    const deletePromises = filenames.map((filename) => deleteFile(filename));
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${filenames.length} files from MinIO`);
  } catch (error) {
    console.error('Error deleting multiple files:', error);
    throw error;
  }
}

/**
 * Проверяет существование файла в bucket
 * @param filename - Имя файла
 * @returns true если файл существует
 */
export async function fileExists(filename: string): Promise<boolean> {
  try {
    const bucketName = minioConfig.bucketProducts;
    await minioClient.statObject(bucketName, filename);
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Получает информацию о файле
 * @param filename - Имя файла
 * @returns Метаданные файла
 */
export async function getFileInfo(filename: string) {
  try {
    const bucketName = minioConfig.bucketProducts;
    return await minioClient.statObject(bucketName, filename);
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error(`File not found: ${filename}`);
  }
}

/**
 * Получает список всех файлов в bucket
 * @returns Массив имен файлов
 */
export async function listFiles(): Promise<string[]> {
  try {
    const bucketName = minioConfig.bucketProducts;
    const files: string[] = [];
    
    return new Promise((resolve, reject) => {
      const stream = minioClient.listObjects(bucketName, '', true);
      
      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name);
        }
      });
      
      stream.on('end', () => {
        resolve(files);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Скачивает файл из MinIO
 * @param filename - Имя файла
 * @returns Буфер файла
 */
export async function downloadFile(filename: string): Promise<Buffer> {
  try {
    const bucketName = minioConfig.bucketProducts;
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      minioClient.getObject(bucketName, filename).then((stream: any) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        stream.on('error', (err: Error) => {
          reject(err);
        });
      }).catch((err: Error) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${filename}`);
  }
}

/**
 * Копирует файл внутри bucket
 * @param sourceFilename - Исходный файл
 * @param destFilename - Целевой файл
 */
export async function copyFile(sourceFilename: string, destFilename: string): Promise<void> {
  try {
    const bucketName = minioConfig.bucketProducts;
    const source = `/${bucketName}/${sourceFilename}`;
    
    await minioClient.copyObject(bucketName, destFilename, source);
    console.log(`✅ File copied: ${sourceFilename} → ${destFilename}`);
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
}
