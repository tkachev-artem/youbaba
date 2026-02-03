import * as Minio from 'minio';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin123';
const MINIO_BUCKET_PRODUCTS = process.env.MINIO_BUCKET_PRODUCTS || 'products';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

// Создаем клиент MinIO
export const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// Проверка и создание bucket при необходимости
export async function initMinIO(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_PRODUCTS);
    
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET_PRODUCTS, 'us-east-1');
      console.log(`✅ Bucket '${MINIO_BUCKET_PRODUCTS}' created`);
      
      // Устанавливаем публичный доступ для чтения
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${MINIO_BUCKET_PRODUCTS}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(MINIO_BUCKET_PRODUCTS, JSON.stringify(policy));
      console.log(`✅ Public read access set for '${MINIO_BUCKET_PRODUCTS}'`);
    } else {
      console.log(`✅ Bucket '${MINIO_BUCKET_PRODUCTS}' already exists`);
    }
    
    console.log('✅ MinIO initialized successfully');
  } catch (error) {
    console.error('❌ MinIO initialization error:', error);
    throw error;
  }
}

// Экспорт конфигурации
export const minioConfig = {
  endpoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  bucketProducts: MINIO_BUCKET_PRODUCTS,
  publicUrl: MINIO_PUBLIC_URL,
};

// Функция для генерации публичного URL файла
export function getPublicUrl(filename: string): string {
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET_PRODUCTS}/${filename}`;
}
