# Деплой YouBaBa на Vercel + Railway

## Шаг 1: Деплой бэкенда на Railway

1. Зайдите на https://railway.app/
2. Войдите через GitHub
3. Нажмите **"New Project"**
4. Выберите **"Deploy from GitHub repo"**
5. Выберите репозиторий `tkachev-artem/youbaba`
6. Railway автоматически обнаружит Node.js проект

### Настройка Railway:

1. **Root Directory**: Установите `server` (чтобы Railway смотрел в папку server/)
2. **Start Command**: `npm start`
3. **Build Command**: `npm run build`

### Добавьте переменные окружения в Railway:

```
NODE_ENV=production
PORT=3001
MONGODB_URI=<ваш MongoDB URI>
JWT_SECRET=<сгенерируйте случайный ключ>
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://ваш-домен.vercel.app
YANDEX_MAPS_API_KEY=<ваш ключ>
RESTAURANT_LAT=47.225970
RESTAURANT_LNG=39.686114
MINIO_ENDPOINT=<будет позже>
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<будет позже>
MINIO_SECRET_KEY=<будет позже>
MINIO_BUCKET_PRODUCTS=products
MINIO_PUBLIC_URL=<будет позже>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<придумайте пароль>
```

### Добавьте MongoDB:

1. В Railway нажмите **"+ New"** → **"Database"** → **"MongoDB"**
2. Railway автоматически создаст переменную `MONGODB_URI`
3. Используйте эту переменную в настройках

### Добавьте MinIO (хранилище изображений):

**Вариант A: Railway MinIO**
1. В Railway нажмите **"+ New"** → **"Empty Service"**
2. Deploy Docker: `minio/minio:latest`
3. Настройте переменные

**Вариант B: Используйте Cloudflare R2 / AWS S3**
- Более стабильно и бесплатно до 10GB

### После деплоя:

Скопируйте URL вашего Railway бэкенда (например: `https://youbaba-production.railway.app`)

---

## Шаг 2: Деплой фронтенда на Vercel

1. Зайдите на https://vercel.com/
2. Войдите через GitHub
3. Нажмите **"Add New"** → **"Project"**
4. Выберите репозиторий `tkachev-artem/youbaba`
5. Vercel автоматически обнаружит Vite проект

### Настройка Vercel:

1. **Framework Preset**: Vite
2. **Root Directory**: оставьте `.` (корень проекта)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Добавьте переменную окружения:

```
VITE_API_URL=https://youbaba-production.railway.app/api
```

(замените на ваш Railway URL)

### Нажмите **"Deploy"**

---

## Шаг 3: Обновите CORS на бэкенде

Вернитесь в Railway и обновите переменную `CORS_ORIGIN`:

```
CORS_ORIGIN=https://ваш-домен.vercel.app
```

Перезапустите сервис в Railway.

---

## Готово! 🎉

Ваш сайт доступен по адресу:
- Фронтенд: `https://ваш-домен.vercel.app`
- Бэкенд: `https://youbaba-production.railway.app`

## Следующие шаги:

1. Запустите seed скрипты для создания админа:
   ```bash
   npm run seed:admin
   npm run seed:settings
   ```

2. Загрузите продукты через админ панель

3. Настройте custom домен на Vercel (опционально)
