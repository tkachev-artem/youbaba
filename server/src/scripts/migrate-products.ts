import 'dotenv/config';
import { connectDatabase } from '../config/database';
import { Product, Category } from '../models/Product';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Импортируем products из исходного файла
const productsPath = path.join(__dirname, '../../../src/data/products.ts');

interface SourceProduct {
  id: string;
  title: string;
  gram: string;
  description: string;
  price: number;
  image: string;
}

interface CategoryData {
  title: string;
  items: SourceProduct[];
}

// Парсим TypeScript файл products.ts
function parseProductsFile(): CategoryData[] {
  const content = fs.readFileSync(productsPath, 'utf-8');
  
  // Извлекаем массив productCategories
  const match = content.match(/export const productCategories[^=]*=\s*(\[[\s\S]*\]);/);
  
  if (!match) {
    throw new Error('Could not parse products file');
  }
  
  // Очищаем от TypeScript синтаксиса и комментариев
  let dataStr = match[1]
    .replace(/\/\/.*/g, '') // Удаляем однострочные комментарии
    .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем многострочные комментарии
    .replace(/,(\s*[}\]])/g, '$1'); // Удаляем trailing commas
  
  return JSON.parse(dataStr);
}

async function migrateProducts() {
  try {
    console.log('📦 Migrating products from products.ts to MongoDB...\n');

    // Подключаемся к MongoDB
    await connectDatabase();

    // Парсим файл products.ts
    console.log('📖 Reading products.ts...');
    const productCategories = parseProductsFile();
    console.log(`✅ Found ${productCategories.length} categories\n`);

    // Подсчет товаров
    let totalProducts = 0;
    productCategories.forEach(cat => {
      totalProducts += cat.items.length;
    });
    console.log(`📊 Total products to migrate: ${totalProducts}\n`);

    // Очищаем существующие товары (опционально)
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing products in database`);
      console.log('🗑️  Deleting existing products...');
      await Product.deleteMany({});
      console.log('✅ Existing products deleted\n');
    }

    // Мигрируем товары
    let migratedCount = 0;
    let order = 0;

    for (const categoryData of productCategories) {
      console.log(`\n📂 Category: ${categoryData.title}`);
      console.log(`   Products: ${categoryData.items.length}`);

      for (const product of categoryData.items) {
        try {
          // Извлекаем имя файла изображения из пути
          const imageFilename = path.basename(product.image);
          const imageBasename = path.parse(imageFilename).name;

          // Создаем временный документ товара с placeholder изображением
          // Реальные изображения будут загружены в migrate-images.ts
          const newProduct = new Product({
            id: product.id,
            title: product.title,
            category: categoryData.title as Category,
            gram: product.gram,
            description: product.description,
            price: product.price,
            image: {
              original: {
                url: `http://localhost:9000/products/${imageBasename}.webp`,
                bucket: 'products',
                filename: `${imageBasename}.webp`,
                size: 0, // Будет обновлено при миграции изображений
                width: 0,
                height: 0,
              },
              thumbnail: {
                url: `http://localhost:9000/products/${imageBasename}-thumb.webp`,
                filename: `${imageBasename}-thumb.webp`,
                size: 0,
                width: 400,
                height: 400,
              },
            },
            isAvailable: true,
            isFeatured: false,
            order: order++,
            views: 0,
            sales: 0,
          });

          await newProduct.save();
          migratedCount++;
          process.stdout.write(`   ✓ ${product.title.substring(0, 40)}...\n`);
        } catch (error) {
          console.error(`   ✗ Failed to migrate: ${product.title}`, error);
        }
      }
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Products migrated: ${migratedCount}/${totalProducts}\n`);

    // Статистика по категориям
    const stats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log('📈 Products by category:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

  } catch (error) {
    console.error('❌ Error migrating products:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

migrateProducts();
