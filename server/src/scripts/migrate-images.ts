import 'dotenv/config';
import { connectDatabase } from '../config/database';
import { initMinIO } from '../config/minio';
import { Product } from '../models/Product';
import { convertToWebP } from '../services/imageService';
import { uploadFile } from '../services/minioService';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Путь к папке с изображениями
const IMAGES_DIR = path.join(__dirname, '../../../Images/product-images');

async function migrateImages() {
  try {
    console.log('🖼️  Migrating product images to MinIO...\n');

    // Подключаемся к MongoDB и MinIO
    await connectDatabase();
    await initMinIO();

    // Получаем все товары из БД
    const products = await Product.find();
    console.log(`📦 Found ${products.length} products in database\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found. Run migrate-products.ts first!');
      process.exit(1);
    }

    // Получаем список PNG файлов
    const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.png'));
    console.log(`📁 Found ${imageFiles.length} PNG images in ${IMAGES_DIR}\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalOriginalSize = 0;
    let totalConvertedSize = 0;

    for (const product of products) {
      try {
        // Извлекаем базовое имя файла из URL товара
        const originalFilename = path.basename(product.image.original.filename, '.webp');
        const pngFilename = `${originalFilename}.png`;
        const imagePath = path.join(IMAGES_DIR, pngFilename);

        // Проверяем существование файла
        if (!fs.existsSync(imagePath)) {
          console.log(`⚠️  Image not found for ${product.title}: ${pngFilename}`);
          skippedCount++;
          continue;
        }

        // Читаем изображение
        const imageBuffer = fs.readFileSync(imagePath);
        const originalSize = imageBuffer.length;
        totalOriginalSize += originalSize;

        console.log(`\n📸 Processing: ${product.title}`);
        console.log(`   Original: ${pngFilename} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);

        // Конвертируем в WebP
        const processedImages = await convertToWebP(imageBuffer, pngFilename);
        
        console.log(`   Converted: ${processedImages.original.filename} (${(processedImages.original.size / 1024).toFixed(0)} KB)`);
        console.log(`   Thumbnail: ${processedImages.thumbnail.filename} (${(processedImages.thumbnail.size / 1024).toFixed(0)} KB)`);
        
        totalConvertedSize += processedImages.original.size + processedImages.thumbnail.size;

        // Загружаем оригинал в MinIO
        const originalUrl = await uploadFile(
          processedImages.original.filename,
          processedImages.original.buffer,
          processedImages.original.mimetype
        );

        // Загружаем миниатюру в MinIO
        const thumbnailUrl = await uploadFile(
          processedImages.thumbnail.filename,
          processedImages.thumbnail.buffer,
          processedImages.thumbnail.mimetype
        );

        // Обновляем товар в MongoDB с реальными данными изображений
        product.image = {
          original: {
            url: originalUrl,
            bucket: 'products',
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
        };

        await product.save();
        
        console.log(`   ✅ Uploaded to MinIO and updated in MongoDB`);
        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Error processing ${product.title}:`, error);
        errorCount++;
      }
    }

    // Итоговая статистика
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!\n');
    console.log('📊 Statistics:');
    console.log(`   Products processed: ${products.length}`);
    console.log(`   Images migrated: ${migratedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n💾 Size comparison:`);
    console.log(`   Original (PNG): ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Converted (WebP): ${(totalConvertedSize / 1024 / 1024).toFixed(2)} MB`);
    
    const savings = ((1 - totalConvertedSize / totalOriginalSize) * 100);
    console.log(`   Savings: ${savings.toFixed(1)}% 🎉`);

  } catch (error) {
    console.error('❌ Error migrating images:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

migrateImages();
