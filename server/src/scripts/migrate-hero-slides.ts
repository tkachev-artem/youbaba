import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { HeroSlide } from '../models/HeroSlide';
import { uploadToMinio } from '../services/minioService';
import { convertToWebP } from '../services/imageService';
import { connectDatabase } from '../config/database';
import { initMinIO } from '../config/minio';

// Загружаем переменные окружения
dotenv.config();

// Данные из heroSlides.ts
const existingSlides = [
  {
    bgImage: '/Images/27daf6067b7793727c9185f9b8fbf01a_1765394980.png',
    hashtag: 'Супер!',
    title: 'Бессмертная классика',
    text: 'Том Ям. Филадельфия с лососем',
    mobileTitle: 'Бессмертная классика',
    mobileText: 'Том Ям. Филадельфия с лососем',
    order: 0,
  },
  {
    bgImage: '/Images/d7ca9d44-aa21-4df2-a6b5-f4079c7a7013.jpg',
    hashtag: 'Качество!',
    title: 'Качество',
    text: 'Используем только свежую, охлажденную рыбу',
    mobileTitle: 'Качество',
    mobileText: 'Используем только свежую, охлажденную рыбу',
    order: 1,
  },
  {
    bgImage: '/Images/d3a5d950-62c7-4eae-ad21-fc50cc3f5736.jpg',
    hashtag: 'Много!',
    title: 'Большие порции',
    text: '',
    mobileTitle: 'Большие порции',
    mobileText: '',
    order: 2,
  },
  {
    bgImage: '/Images/f1c3434c187eaefafd20c2fd09928b38_1765384588.png',
    hashtag: 'Минимум!',
    title: 'Минимальный заказ от 1700р',
    text: '',
    mobileTitle: 'Минимальный заказ от 1700р',
    mobileText: '',
    order: 3,
  },
  {
    bgImage: '/Images/1765401963504-t0k710cecnd.png',
    hashtag: 'Подарок!',
    title: 'Ролл в подарок!',
    text: 'При заказе от 2500р, ролл запеченый с лососем в подарок!',
    mobileTitle: 'Ролл в подарок!',
    mobileText: 'При заказе от 2500р, ролл запеченый с лососем в подарок!',
    order: 4,
  },
  {
    bgImage: '/Images/ebc994a0-505d-45ee-8c3d-d41aa0132661.jpg',
    hashtag: 'Снеки!',
    title: 'Азиатские снеки',
    text: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18',
    mobileTitle: 'Азиатские снеки',
    mobileText: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18',
    order: 5,
  },
  {
    bgImage: '/Images/bg-hero.jpg',
    hashtag: 'Магия!',
    title: 'Попробуй магию на вкус!',
    text: '',
    mobileTitle: 'Попробуй магию на вкус!',
    mobileText: '',
    order: 6,
  },
];

async function migrateHeroSlides() {
  console.log('🚀 Начало миграции Hero-слайдов...\n');

  try {
    // Подключаемся к MongoDB
    await connectDatabase();
    console.log('✅ Подключено к MongoDB\n');

    // Инициализируем MinIO
    await initMinIO();
    console.log('✅ MinIO инициализирован\n');

    // Проверяем, есть ли уже слайды в БД
    const existingCount = await HeroSlide.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  В базе уже есть ${existingCount} слайдов.`);
      console.log('Хотите удалить существующие и продолжить миграцию? (y/n)');
      
      // В production лучше использовать readline, но для простоты используем env переменную
      const forceDelete = process.env.FORCE_DELETE === 'true';
      
      if (forceDelete) {
        await HeroSlide.deleteMany({});
        console.log('✅ Существующие слайды удалены\n');
      } else {
        console.log('❌ Миграция отменена. Установите FORCE_DELETE=true для удаления существующих слайдов.');
        process.exit(0);
      }
    }

    const publicDir = path.join(__dirname, '../../../public');
    console.log(`📁 Директория с изображениями: ${publicDir}\n`);

    let successCount = 0;
    let errorCount = 0;

    // Мигрируем каждый слайд
    for (const [index, slide] of existingSlides.entries()) {
      try {
        console.log(`[${index + 1}/${existingSlides.length}] Обработка: ${slide.title}`);

        // Путь к изображению
        const imagePath = path.join(publicDir, slide.bgImage);
        console.log(`  📷 Загрузка изображения: ${imagePath}`);

        // Проверяем существование файла
        try {
          await fs.access(imagePath);
        } catch (error) {
          console.error(`  ❌ Файл не найден: ${imagePath}`);
          errorCount++;
          continue;
        }

        // Читаем файл
        const imageBuffer = await fs.readFile(imagePath);
        const fileName = path.basename(slide.bgImage);

        // Конвертируем в WebP
        console.log('  🔄 Конвертация в WebP...');
        const processedImages = await convertToWebP(imageBuffer, fileName);

        // Загружаем оригинал в MinIO
        console.log('  ☁️  Загрузка в MinIO...');
        const originalUpload = await uploadToMinio(
          processedImages.original.buffer,
          processedImages.original.filename,
          processedImages.original.mimetype,
          'hero-slides'
        );

        // Загружаем миниатюру
        const thumbnailUpload = await uploadToMinio(
          processedImages.thumbnail.buffer,
          processedImages.thumbnail.filename,
          processedImages.thumbnail.mimetype,
          'hero-slides/thumbnails'
        );

        // Создаем слайд в БД
        const newSlide = new HeroSlide({
          bgImage: {
            url: originalUpload.url,
            thumbnailUrl: thumbnailUpload.url,
            width: processedImages.original.width,
            height: processedImages.original.height,
            size: processedImages.original.size,
            objectName: originalUpload.objectName,
          },
          imagePosition: {
            objectPosition: 'center',
            backgroundPosition: 'center',
          },
          hashtag: slide.hashtag,
          title: slide.title,
          text: slide.text || '',
          mobileTitle: slide.mobileTitle || undefined,
          mobileText: slide.mobileText || undefined,
          order: slide.order,
          isActive: true,
        });

        await newSlide.save();
        console.log(`  ✅ Слайд сохранен (ID: ${newSlide._id})`);
        console.log(`  🌐 URL: ${originalUpload.url}\n`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Ошибка при обработке слайда "${slide.title}":`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Результаты миграции:');
    console.log(`  ✅ Успешно: ${successCount}`);
    console.log(`  ❌ Ошибок: ${errorCount}`);
    console.log(`  📝 Всего: ${existingSlides.length}\n`);

    if (successCount > 0) {
      console.log('🎉 Миграция завершена успешно!');
    } else {
      console.log('⚠️  Миграция завершена с ошибками.');
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при миграции:', error);
    process.exit(1);
  } finally {
    // Закрываем соединение с MongoDB
    await mongoose.connection.close();
    console.log('\n✅ Соединение с MongoDB закрыто');
  }
}

// Запуск миграции
migrateHeroSlides()
  .then(() => {
    console.log('\n✨ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Непредвиденная ошибка:', error);
    process.exit(1);
  });
