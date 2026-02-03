# 🚀 План миграции YouBaBa на MongoDB + MinIO + Express

## 📋 Общая информация

**Дата создания:** 2026-01-29  
**Статус:** Готов к реализации  

### Цели проекта:
1. Перенести все товары из статического `products.ts` в MongoDB
2. Переместить изображения (62 PNG, ~136MB) в MinIO с конвертацией в WebP
3. Создать REST API на Express + TypeScript для работы с товарами
4. Разработать админ-панель в стиле сайта для управления товарами
5. Реализовать защиту админ-панели (JWT аутентификация)
6. Все сервисы в Docker контейнерах (локальная разработка)

---

## 🎨 Дизайн система сайта

### Основные цвета:
- **Основной (бренд):** `#B43F20` - красно-коричневый (кнопки, акценты)
- **Фон:** `#fff` - белый
- **Текст:** `#333`, `#666` - темно-серый
- **Границы:** `#e0e0e0` - светло-серый

### Шрифты:
- **Основной:** "Montserrat", sans-serif
- **Размеры:** 14px-18px (body), 24px-32px (заголовки)

### UI элементы:
- **Border-radius:** 8px-25px (округлые углы)
- **Shadows:** мягкие тени для карточек
- **Transitions:** 0.3s ease

---

## 🏗️ Архитектура системы

### Компоненты:
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│   http://localhost:5173 (Vite Dev Server)               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST API
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Express Backend (TypeScript)                │
│              http://localhost:3001/api                   │
│                                                          │
│  Routes: /products, /upload, /auth, /delivery           │
└──────────┬──────────────────────────────┬───────────────┘
           │                               │
           │ Mongoose                      │ MinIO SDK
           ▼                               ▼
┌────────────────────────┐    ┌──────────────────────────┐
│   MongoDB Container    │    │    MinIO Container       │
│   Port: 27017          │    │    Port: 9000 (API)      │
│   DB: youbaba_db       │    │    Port: 9001 (Console)  │
│   Collection: products │    │    Bucket: products      │
└────────────────────────┘    └──────────────────────────┘
```

---

## 📦 Docker Setup

### docker-compose.yml структура:

**Сервисы:**
1. **mongodb** - База данных
2. **minio** - Объектное хранилище

### Volumes:
- `mongodb_data` - данные MongoDB
- `minio_data` - файлы MinIO

### Networks:
- `youbaba-network` - внутренняя сеть для сервисов

### Порты:
- MongoDB: `27017`
- MinIO API: `9000`
- MinIO Console: `9001`

---

## 🗄️ MongoDB структура

### База данных: `youbaba_db`

### Коллекция: `products`

#### Схема документа (Mongoose):

```typescript
{
  _id: ObjectId,
  id: string,                       // Уникальный slug: "салаты-салат-юбаба"
  title: string,                    // "Салат Юбаба"
  category: string,                 // "Салаты" | "Лапша/рис" | ...
  gram: string,                     // "200 гр." | "350 мл."
  description: string,              // Состав товара
  price: number,                    // 800
  image: {
    original: {
      url: string,                  // "http://localhost:9000/products/image1.webp"
      bucket: string,               // "products"
      filename: string,             // "product-image1.webp"
      size: number,                 // размер в байтах
      width: number,                // ширина в пикселях
      height: number                // высота в пикселях
    },
    thumbnail: {
      url: string,                  // URL миниатюры
      filename: string,             // "product-image1-thumb.webp"
      size: number,
      width: 400,
      height: 400
    }
  },
  isAvailable: boolean,             // наличие товара
  isFeatured: boolean,              // рекомендуемое
  order: number,                    // порядок сортировки
  views: number,                    // просмотры
  sales: number,                    // продажи
  createdAt: Date,
  updatedAt: Date
}
```

#### Индексы:
- `id` - уникальный
- `category` - для фильтрации
- `isAvailable` - для фильтрации
- `price` - для сортировки
- `order` - для сортировки

#### Категории:
```
Салаты | Лапша/рис | Закуски | Супы | Роллы | Пицца | Бургеры | Напитки | Десерты
```

---

## 🖼️ MinIO структура

### Bucket: `products`

#### Структура файлов:
```
products/
├── product-image1.webp              (оригинал, ~250KB)
├── product-image1-thumb.webp        (400x400, ~80KB)
├── product-image2.webp
├── product-image2-thumb.webp
...
```

### Конвертация изображений (Sharp):

**Оригинал:**
- Формат: WebP
- Качество: 85%
- Размер: ~250-350KB (было 1.5MB PNG)

**Thumbnail:**
- Формат: WebP
- Качество: 80%
- Размер: 400x400px (cover fit)
- Размер файла: ~80KB

**Экономия места:**
- Было: 62 PNG × 1.5MB = ~93MB
- Стало: 62 WebP × 330KB = ~20.5MB
- **Экономия: 78%**

### Настройки:
- Access Policy: Public read
- Public URL: `http://localhost:9000/products/{filename}`

---

## 🔌 Express Backend API

### Структура проекта:

```
server/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts              # MongoDB подключение
│   │   ├── minio.ts                 # MinIO клиент
│   │   └── auth.ts                  # JWT настройки
│   ├── models/
│   │   ├── Product.ts               # Mongoose модель
│   │   └── Admin.ts                 # Модель админа
│   ├── routes/
│   │   ├── products.ts              # CRUD товаров
│   │   ├── upload.ts                # Загрузка изображений
│   │   ├── auth.ts                  # Аутентификация
│   │   └── delivery.ts              # (существует)
│   ├── services/
│   │   ├── productService.ts
│   │   ├── minioService.ts
│   │   ├── imageService.ts          # Sharp конвертация
│   │   └── geocoder.ts              # (существует)
│   ├── middleware/
│   │   ├── auth.ts                  # JWT проверка
│   │   ├── upload.ts                # Multer
│   │   ├── errorHandler.ts
│   │   └── validator.ts
│   ├── utils/
│   │   ├── slugify.ts
│   │   └── response.ts
│   └── scripts/
│       ├── migrate-products.ts      # Миграция из products.ts
│       ├── migrate-images.ts        # Загрузка в MinIO
│       └── seed-admin.ts            # Создание админа
├── .env
├── docker-compose.yml
└── package.json
```

### API Endpoints:

#### **Public (без аутентификации):**

```
GET    /api/products                 # Все товары (пагинация)
GET    /api/products/:id             # Один товар
GET    /api/products/category/:cat   # По категории
GET    /api/categories               # Список категорий
```

#### **Query параметры:**
```
GET /api/products?
  category=Салаты
  &available=true
  &featured=true
  &sort=price
  &order=asc
  &page=1
  &limit=20
  &search=лосось
```

#### **Admin (требуют JWT):**

```
# Аутентификация
POST   /api/auth/login               # Вход
GET    /api/auth/me                  # Проверка токена

# CRUD
POST   /api/admin/products           # Создать
PUT    /api/admin/products/:id       # Обновить
DELETE /api/admin/products/:id       # Удалить
PATCH  /api/admin/products/:id/availability
PATCH  /api/admin/products/:id/featured

# Загрузка
POST   /api/admin/upload/image       # Загрузить изображение
DELETE /api/admin/upload/:filename   # Удалить изображение

# Статистика
GET    /api/admin/stats              # Статистика
```

### Response Format:

```json
{
  "success": true,
  "data": { /* данные */ },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 62,
    "pages": 4
  }
}
```

---

## 🔐 Система безопасности

### JWT Аутентификация:

**Процесс:**
1. Админ вводит username + password
2. Backend проверяет в MongoDB (bcrypt)
3. Генерируется JWT токен (expires: 24h)
4. Токен в localStorage
5. Каждый запрос: `Authorization: Bearer {token}`
6. Middleware проверяет токен

**JWT Payload:**
```json
{
  "userId": "admin_id",
  "username": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Модель Admin:

```typescript
{
  _id: ObjectId,
  username: string,           // уникальный
  password: string,           // bcrypt hash
  email: string,
  role: "admin" | "super",
  isActive: boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Защита:

1. **Rate Limiting:**
   - 100 запросов/15 мин для API
   - 5 попыток входа/15 мин

2. **Helmet.js:**
   - XSS, CSRF protection

3. **CORS:**
   - Только `http://localhost:5173`

4. **Валидация:**
   - `joi` или `express-validator`
   - Санитизация данных

5. **Bcrypt:**
   - 10 rounds для паролей

---

## 🎨 Админ-панель (Frontend)

### Маршруты:

```
/admin/login              # Вход
/admin/dashboard          # Главная (статистика)
/admin/products           # Список товаров
/admin/products/new       # Создание
/admin/products/:id/edit  # Редактирование
```

### Компоненты:

```
src/
├── pages/admin/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProductsListPage.tsx
│   ├── ProductEditPage.tsx
│   └── ProductNewPage.tsx
├── components/admin/
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── ProductForm.tsx
│   ├── ProductTable.tsx
│   ├── ImageUploader.tsx          # Drag & drop
│   ├── CategoryFilter.tsx
│   └── StatsCard.tsx
├── lib/api/
│   ├── auth.ts
│   ├── products.ts
│   └── upload.ts
└── store/
    └── authStore.ts
```

### Дизайн:

**Цвета:**
- Основной: `#B43F20` (акценты)
- Sidebar: `#2c3e50` (темный)
- Background: `#f5f5f5`
- Cards: `#fff`

**Layout:**
```
┌───────────────────────────────────────┐
│ Header (белый, лого, выход)           │
├──────┬────────────────────────────────┤
│      │                                 │
│ Side │  Content                        │
│ bar  │  (карточки, таблицы, формы)    │
│      │                                 │
└──────┴────────────────────────────────┘
```

**UI элементы:**
- Кнопки: border-radius 8px, #B43F20
- Таблица: zebra, hover, сортировка
- Формы: real-time валидация
- Drag & drop загрузка изображений

---

## 📝 NPM пакеты

### Backend (server/):

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "minio": "^7.1.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.11.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

### Frontend добавить:

```json
{
  "dependencies": {
    "react-dropzone": "^14.2.3"
  }
}
```

---

## 🐳 Docker Compose

### docker-compose.yml:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: youbaba-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: youbaba_db
    volumes:
      - mongodb_data:/data/db
    networks:
      - youbaba-network

  minio:
    image: minio/minio:latest
    container_name: youbaba-minio
    restart: always
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - youbaba-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mongodb_data:
    driver: local
  minio_data:
    driver: local

networks:
  youbaba-network:
    driver: bridge
```

---

## ⚙️ .env конфигурация

### server/.env:

```env
# Server
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/youbaba_db?authSource=admin

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_PRODUCTS=products
MINIO_PUBLIC_URL=http://localhost:9000

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
JWT_EXPIRES_IN=24h

# Admin (первый админ)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecurePassword123!

# CORS
CORS_ORIGIN=http://localhost:5173

# Yandex Maps (существует)
YANDEX_MAPS_API_KEY=your_key
RESTAURANT_LAT=47.225970
RESTAURANT_LNG=39.686114
```

---

## 🚀 План выполнения (поэтапно)

### Этап 1: Инфраструктура (Docker)
- [ ] Создать `docker-compose.yml`
- [ ] Запустить MongoDB и MinIO контейнеры
- [ ] Проверить доступность сервисов
- [ ] Создать bucket `products` в MinIO

### Этап 2: Backend - База
- [ ] Установить npm пакеты
- [ ] Создать config файлы (database.ts, minio.ts)
- [ ] Создать модели (Product.ts, Admin.ts)
- [ ] Настроить подключение к MongoDB
- [ ] Настроить MinIO клиент

### Этап 3: Backend - Services
- [ ] Создать imageService (Sharp конвертация)
- [ ] Создать minioService (загрузка/удаление)
- [ ] Создать productService (бизнес-логика)

### Этап 4: Backend - API
- [ ] Создать routes/products.ts (CRUD)
- [ ] Создать routes/upload.ts
- [ ] Создать routes/auth.ts
- [ ] Создать middleware (auth, upload, validator)
- [ ] Интегрировать в index.ts

### Этап 5: Миграция данных
- [ ] Создать скрипт migrate-products.ts
- [ ] Создать скрипт migrate-images.ts
- [ ] Создать скрипт seed-admin.ts
- [ ] Запустить миграцию товаров
- [ ] Запустить миграцию изображений
- [ ] Создать первого админа

### Этап 6: Frontend - API интеграция
- [ ] Создать lib/api/products.ts
- [ ] Создать lib/api/auth.ts
- [ ] Создать lib/api/upload.ts
- [ ] Обновить ProductCatalog для загрузки через API
- [ ] Обновить типы Product

### Этап 7: Админ-панель - Аутентификация
- [ ] Создать authStore (Zustand)
- [ ] Создать LoginPage
- [ ] Создать ProtectedRoute
- [ ] Реализовать логику входа/выхода

### Этап 8: Админ-панель - Layout
- [ ] Создать AdminLayout
- [ ] Создать AdminSidebar
- [ ] Создать AdminHeader
- [ ] Настроить роутинг

### Этап 9: Админ-панель - Товары
- [ ] Создать DashboardPage (статистика)
- [ ] Создать ProductsListPage (таблица)
- [ ] Создать ProductForm (создание/редактирование)
- [ ] Создать ImageUploader (drag & drop)

### Этап 10: Тестирование
- [ ] Тестировать API endpoints
- [ ] Тестировать загрузку изображений
- [ ] Тестировать CRUD операции
- [ ] Тестировать аутентификацию
- [ ] Тестировать админ-панель
- [ ] Проверить безопасность

---

## 📚 Документация

### Команды запуска:

```bash
# Запуск Docker контейнеров
cd server
docker-compose up -d

# Проверка статуса
docker-compose ps

# Логи
docker-compose logs -f

# Остановка
docker-compose down

# Полная очистка (с данными!)
docker-compose down -v

# Backend
cd server
npm install
npm run dev

# Миграция
npm run migrate:products
npm run migrate:images
npm run seed:admin

# Frontend
cd ..
npm run dev
```

### Доступ к сервисам:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- MongoDB: mongodb://localhost:27017
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)
- MinIO API: http://localhost:9000
- Админ-панель: http://localhost:5173/admin

---

## ✅ Чеклист готовности

### До начала:
- [ ] Docker установлен и запущен
- [ ] Node.js 18+ установлен
- [ ] Порты 3001, 9000, 9001, 27017 свободны
- [ ] Git commit текущих изменений

### После завершения:
- [ ] Все 62 товара в MongoDB
- [ ] Все изображения в MinIO (WebP)
- [ ] API работает и отдает товары
- [ ] Frontend загружает товары из API
- [ ] Админ-панель доступна и работает
- [ ] Аутентификация работает
- [ ] CRUD операции работают
- [ ] Изображения отображаются корректно

---

## 🔄 Rollback план

Если что-то пойдет не так:

1. **Остановить Docker:** `docker-compose down`
2. **Вернуть код:** `git reset --hard HEAD` или checkout
3. **Старый код работает:** Frontend использует `products.ts`
4. **Удалить данные:** `docker-compose down -v`

**Исходные файлы сохранить:**
- `src/data/products.ts` - не удалять до полного тестирования
- `Images/product-images/` - не удалять PNG до проверки

---

## 📝 Примечания

### Оптимизация:
- Кэширование запросов на фронтенде (React Query)
- Индексы MongoDB для быстрого поиска
- Lazy loading изображений
- Пагинация для больших списков

### Масштабирование:
- MongoDB репликация (позже)
- MinIO кластер (позже)
- Redis для кэша (опционально)
- Elasticsearch для поиска (опционально)

### Мониторинг:
- Логирование запросов (winston/pino)
- Мониторинг ошибок (Sentry)
- Метрики производительности

---

**Документ готов к использованию! 🎉**
