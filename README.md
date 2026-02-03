# YouBaBa

Сайт доставки еды YouBaBa с интеграцией оплаты и системой заказов.

## Технологии

### Frontend
- React + TypeScript
- Vite
- Zustand (state management)
- React Router
- Lucide Icons

### Backend
- Node.js + Express + TypeScript
- MongoDB
- MinIO (хранилище изображений)
- JWT аутентификация

## Установка

### Frontend
```bash
cd YouBaBa
npm install
npm run dev
```

### Backend
```bash
cd YouBaBa/server
npm install
npm run dev
```

## Переменные окружения

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (server/.env)
Скопируйте `server/.env.example` в `server/.env` и настройте переменные.

## Разработка

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- MongoDB: mongodb://localhost:27017
- MinIO: http://localhost:9000
