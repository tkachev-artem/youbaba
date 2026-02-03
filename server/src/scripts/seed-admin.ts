import 'dotenv/config';
import { connectDatabase } from '../config/database';
import { Admin, AdminRole } from '../models/Admin';
import mongoose from 'mongoose';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@youbaba.ru';

async function seedAdmin() {
  try {
    console.log('🌱 Seeding admin user...\n');

    // Подключаемся к MongoDB
    await connectDatabase();

    // Проверяем, существует ли уже админ
    const existingAdmin = await Admin.findOne({ username: ADMIN_USERNAME });

    if (existingAdmin) {
      console.log(`⚠️  Admin user '${ADMIN_USERNAME}' already exists`);
      console.log(`ℹ️  User ID: ${existingAdmin._id}`);
      console.log(`ℹ️  Role: ${existingAdmin.role}`);
      console.log(`ℹ️  Created: ${existingAdmin.createdAt}`);
      
      // Спрашиваем пользователя, нужно ли обновить пароль
      console.log('\n💡 Tip: To reset password, delete the user first or update manually in MongoDB\n');
      process.exit(0);
    }

    // Создаем нового админа
    const admin = new Admin({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD, // Будет автоматически хеширован в pre-save hook
      email: ADMIN_EMAIL,
      role: AdminRole.ADMIN,
      isActive: true,
    });

    await admin.save();

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Credentials:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin._id}`);
    console.log(`   Created: ${admin.createdAt}\n`);
    
    console.log('🔐 Use these credentials to login via API:');
    console.log(`   POST http://localhost:3001/api/auth/login`);
    console.log(`   Body: { "username": "${admin.username}", "password": "${ADMIN_PASSWORD}" }\n`);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

seedAdmin();
