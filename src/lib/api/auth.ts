// API клиент для аутентификации

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'super';
  lastLogin?: string;
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Вход в систему
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

/**
 * Получить информацию о текущем пользователе
 */
export async function getCurrentUser(token: string): Promise<ApiResponse<AuthUser>> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get user info');
  }

  return data;
}

/**
 * Выход из системы
 */
export async function logout(token: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}

/**
 * Проверить валидность токена
 */
export async function checkToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.success && data.data.valid;
  } catch (error) {
    return false;
  }
}

/**
 * Обновить токен
 */
export async function refreshToken(token: string): Promise<ApiResponse<{ token: string }>> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to refresh token');
  }

  return data;
}
