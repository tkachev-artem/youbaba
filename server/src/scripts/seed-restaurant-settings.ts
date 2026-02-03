import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { RestaurantSettings } from '../models/RestaurantSettings';

// Загружаем переменные окружения
dotenv.config();

/**
 * Seed скрипт для инициализации настроек ресторана
 * 
 * Запуск: npx ts-node src/scripts/seed-restaurant-settings.ts
 */
async function seedRestaurantSettings() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await connectDatabase();

    // Проверяем, существуют ли уже настройки
    const existingSettings = await RestaurantSettings.findOne();

    if (existingSettings) {
      console.log('⚠️  Настройки ресторана уже существуют:');
      console.log(`   Название: ${existingSettings.name}`);
      console.log(`   Адрес: ${existingSettings.address}`);
      console.log(`   Телефон: ${existingSettings.phone}`);
      console.log('');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Хотите перезаписать существующие настройки? (yes/no): ', resolve);
      });
      
      rl.close();

      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ Операция отменена');
        process.exit(0);
      }

      // Удаляем существующие настройки
      await RestaurantSettings.deleteOne({ _id: existingSettings._id });
      console.log('🗑️  Старые настройки удалены');
    }

    // Получаем координаты из .env или используем дефолтные
    const restaurantLat = parseFloat(process.env.RESTAURANT_LAT || '47.225970');
    const restaurantLng = parseFloat(process.env.RESTAURANT_LNG || '39.686114');

    // Создаем настройки по умолчанию
    const defaultSettings = {
      name: 'Юбаба',
      address: 'Ростов-на-Дону, ул. Эстонская 49А',
      phone: '+7 938 138-99-09',
      coordinates: {
        lat: restaurantLat,
        lng: restaurantLng,
      },
      openingHours: {
        monday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        tuesday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        wednesday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        thursday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        friday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        saturday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
        sunday: {
          open: '12:00',
          close: '22:30',
          isClosed: false,
        },
      },
      isActive: true,
    };

    const settings = await RestaurantSettings.create(defaultSettings);

    console.log('');
    console.log('✅ Настройки ресторана успешно созданы!');
    console.log('');
    console.log('📋 Сохраненные данные:');
    console.log(`   Название: ${settings.name}`);
    console.log(`   Адрес: ${settings.address}`);
    console.log(`   Телефон: ${settings.phone}`);
    console.log(`   Координаты: ${settings.coordinates.lat}, ${settings.coordinates.lng}`);
    console.log(`   Часы работы: Пн-Вс ${settings.openingHours.monday.open} - ${settings.openingHours.monday.close}`);
    console.log(`   Статус: ${settings.isActive ? 'Активен' : 'Закрыт'}`);
    console.log('');
    console.log('🎉 Готово! Теперь можно запускать приложение.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании настроек:', error);
    process.exit(1);
  }
}

// Запуск скрипта
seedRestaurantSettings();
