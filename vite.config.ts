import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Важно: CSS/Images должны быть доступны по абсолютным путям /Css, /Images
// поэтому переносим их в public/ (см. шаги миграции).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    hmr: {
      protocol: 'wss',
      clientPort: 443
    },
    proxy: {
      // Основной backend (python-backend), чтобы можно было ходить на /api/*
      '/api': {
        target: 'http://localhost:5007',
        changeOrigin: true
      },
      // Отдельный сервис (если используется) на 5001
      '/delivery-api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/delivery-api/, '/api')
      }
    }
  },
  build: {
    // Оптимизация сборки
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделяем vendor код
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'store': ['zustand'],
          'icons': ['lucide-react']
        }
      }
    },
    // Увеличиваем лимит для предупреждений о больших chunk
    chunkSizeWarningLimit: 1000,
    // Минимизация (используем esbuild, т.к. terser не установлен)
    minify: 'esbuild',
    target: 'esnext'
  },
  // Оптимизация dev сервера
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'lucide-react']
  }
});
