import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Config
import { connectDatabase } from './config/database';
import { initMinIO } from './config/minio';

// Routes
import deliveryRoutes from './routes/delivery';
import authRoutes from './routes/auth';
import productsRoutes from './routes/products';
import uploadRoutes from './routes/upload';
import settingsRoutes from './routes/settings';
import heroSlidesRoutes from './routes/heroSlides';
import ordersRoutes from './routes/orders';
import profileAuthRoutes from './routes/profileAuth';
import profileRoutes from './routes/profile';

// Middleware
import { errorHandler, notFoundHandler, requestLogger, timeoutHandler } from './middleware/errorHandler';
import { sanitizeStrings } from './middleware/validator';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Security middleware
app.use(helmet());

// CORS - поддержка нескольких origins
const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Разрешаем все Cloudflare туннели для разработки
    if (origin.endsWith('.trycloudflare.com')) {
      callback(null, true);
      return;
    }
    
    // Разрешаем все ngrok туннели для разработки
    if (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.io')) {
      callback(null, true);
      return;
    }
    
    // Разрешаем из списка allowedOrigins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // 1000 запросов на IP
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 попыток входа
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/profile/auth/send-code', authLimiter);
app.use('/api/profile/auth/verify-code', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware
app.use(requestLogger);
app.use(timeoutHandler(30000)); // 30 секунд timeout
app.use(sanitizeStrings);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/delivery', deliveryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/hero-slides', heroSlidesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profile/auth', profileAuthRoutes);
app.use('/api/profile', profileRoutes);

// 404 handler (должен быть после всех routes)
app.use(notFoundHandler);

// Error handler (должен быть последним middleware)
app.use(errorHandler);

// Инициализация и запуск сервера
async function startServer() {
  try {
    // Подключаемся к MongoDB
    await connectDatabase();
    
    // Инициализируем MinIO
    await initMinIO();
    
    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📊 MongoDB: Connected`);
      console.log(`🖼️  MinIO: Connected`);
      console.log(`🔒 CORS: ${CORS_ORIGIN}`);
      console.log(`📍 Координаты ресторана: ${process.env.RESTAURANT_LAT}, ${process.env.RESTAURANT_LNG}`);
      console.log(`🗺️  Yandex Maps API: ${process.env.YANDEX_MAPS_API_KEY ? '✓ настроен' : '✗ не настроен'}`);
      console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
