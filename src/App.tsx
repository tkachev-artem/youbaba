import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { OrderPage } from './pages/OrderPage';
import { SuccessPage } from './pages/SuccessPage';
import { FailedPage } from './pages/FailedPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './pages/admin/LoginPage';
import { ProductsListPage } from './pages/admin/ProductsListPage';
import { ProductNewPage } from './pages/admin/ProductNewPage';
import { ProductEditPage } from './pages/admin/ProductEditPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { HeroSlidesPage } from './pages/admin/HeroSlidesPage';
import { HeroSlideEditPage } from './pages/admin/HeroSlideEditPage';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { OrdersListPage } from './pages/orders/OrdersListPage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';

// Стили
import './styles/order.css';
import './styles/orders.css';

export function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/orders" element={<OrderTrackingPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/failed" element={<FailedPage />} />
        
        {/* Admin login (public) */}
        <Route path="/admin/login" element={<LoginPage />} />
        
        {/* Protected admin routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="products" element={<ProductsListPage />} />
            <Route path="products/new" element={<ProductNewPage />} />
            <Route path="products/:id/edit" element={<ProductEditPage />} />
            <Route path="hero-slides" element={<HeroSlidesPage />} />
            <Route path="hero-slides/new" element={<HeroSlideEditPage />} />
            <Route path="hero-slides/edit/:id" element={<HeroSlideEditPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        
        {/* Orders panel - требует авторизации через /admin/login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/ord" element={<OrdersListPage />} />
          <Route path="/ord/:id" element={<OrderDetailPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
