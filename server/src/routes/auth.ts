import { Router, Request, Response } from 'express';
import { Admin } from '../models/Admin';
import { generateToken } from '../config/auth';
import { validateLogin } from '../middleware/validator';
import { authenticate } from '../middleware/auth';
import { asyncHandler, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/login
 * Вход админа в систему
 */
router.post(
  '/login',
  validateLogin,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Находим админа по username
    const admin = await Admin.findOne({ username, isActive: true });

    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Проверяем пароль
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Обновляем время последнего входа
    admin.lastLogin = new Date();
    await admin.save();

    // Генерируем JWT токен
    const token = generateToken({
      userId: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          lastLogin: admin.lastLogin,
        },
      },
      message: 'Login successful',
    });
  })
);

/**
 * GET /api/auth/me
 * Получить информацию о текущем пользователе
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const admin = await Admin.findById(req.user.userId);

    if (!admin) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Выход из системы (опционально, токен удаляется на клиенте)
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  // В JWT нет серверного состояния сессии,
  // поэтому выход происходит на клиенте (удаление токена из localStorage)
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * POST /api/auth/refresh
 * Обновление токена (опционально, можно реализовать refresh token логику)
 */
router.post(
  '/refresh',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    // Генерируем новый токен
    const token = generateToken({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: { token },
      message: 'Token refreshed',
    });
  })
);

/**
 * GET /api/auth/check
 * Проверка валидности токена (быстрая проверка без обращения к БД)
 */
router.get('/check', authenticate, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      valid: true,
      user: req.user,
    },
  });
});

export default router;
