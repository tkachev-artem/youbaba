import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { VerificationCode, VerificationMethod } from '../models/VerificationCode';
import { generateVerificationCode, generateSessionId, hashCode, verifyCode } from '../utils/codeGenerator';
import { generateUserToken } from '../utils/jwt';
import { formatPhone, isValidPhone, isValidVerificationCode } from '../utils/validators';
import { sendVerificationCode } from '../services/verificationService';

const router = Router();

/**
 * POST /api/profile/auth/send-code
 * Отправка кода верификации
 */
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { phone, method } = req.body;

    // Валидация входных данных
    if (!phone || !method) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указан номер телефона или метод отправки',
      });
    }

    // Форматирование и валидация телефона
    const formattedPhone = formatPhone(phone);
    if (!isValidPhone(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_phone',
        message: 'Неверный формат номера телефона',
      });
    }

    // Проверка метода отправки
    if (!['vk', 'telegram', 'sms'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_method',
        message: 'Неверный метод отправки',
      });
    }

    // Очистка старых кодов пользователя
    await VerificationCode.cleanupOldCodes(formattedPhone);

    // Проверка на spam (не более 3 запросов за последние 10 минут)
    const recentCodes = await VerificationCode.countDocuments({
      phone: formattedPhone,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (recentCodes >= 3) {
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message: 'Слишком много запросов. Попробуйте позже.',
      });
    }

    // Генерация кода и session ID
    const code = generateVerificationCode();
    const sessionId = generateSessionId();
    const hashedCodeValue = hashCode(code);

    // Сохранение кода в БД
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут
    await VerificationCode.create({
      sessionId,
      phone: formattedPhone,
      code: hashedCodeValue,
      method: method as VerificationMethod,
      attempts: 0,
      used: false,
      expiresAt,
    });

    // Отправка кода
    const sendResult = await sendVerificationCode(formattedPhone, code, method);

    if (!sendResult.success) {
      return res.status(500).json({
        success: false,
        error: sendResult.error || 'send_failed',
        message: 'Не удалось отправить код. Попробуйте другой метод.',
      });
    }

    // Возвращаем session ID (НЕ возвращаем код!)
    return res.status(200).json({
      success: true,
      sessionId,
      expiresIn: 300, // 5 минут в секундах
      message: `Код отправлен через ${
        method === 'vk' ? 'VK' : method === 'telegram' ? 'Telegram' : 'SMS'
      }`,
    });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * POST /api/profile/auth/verify-code
 * Проверка кода и авторизация
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { sessionId, code } = req.body;

    // Валидация входных данных
    if (!sessionId || !code) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указан session ID или код',
      });
    }

    // Валидация кода
    if (!isValidVerificationCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_code_format',
        message: 'Код должен состоять из 6 цифр',
      });
    }

    // Поиск кода верификации
    const verification = await VerificationCode.findOne({ sessionId });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'session_not_found',
        message: 'Сессия не найдена',
      });
    }

    // Проверка, не истёк ли код
    if (verification.isExpired()) {
      return res.status(400).json({
        success: false,
        error: 'code_expired',
        message: 'Код истёк. Запросите новый код.',
      });
    }

    // Проверка, не использован ли код
    if (verification.used) {
      return res.status(400).json({
        success: false,
        error: 'code_used',
        message: 'Код уже использован',
      });
    }

    // Проверка, не превышен ли лимит попыток
    if (verification.isAttemptsExceeded()) {
      return res.status(400).json({
        success: false,
        error: 'too_many_attempts',
        message: 'Превышен лимит попыток. Запросите новый код.',
      });
    }

    // Проверка кода
    const isCodeValid = verifyCode(code, verification.code);

    if (!isCodeValid) {
      // Инкремент попыток
      await verification.incrementAttempts();

      const attemptsLeft = 5 - verification.attempts;

      return res.status(400).json({
        success: false,
        error: 'invalid_code',
        message: `Неверный код. Осталось попыток: ${attemptsLeft}`,
      });
    }

    // Код верный - помечаем как использованный
    await verification.markAsUsed();

    // Находим или создаём пользователя
    let user = await User.findOne({ phone: verification.phone });

    if (!user) {
      // Создаём нового пользователя
      user = await User.create({
        phone: verification.phone,
        lastLoginAt: new Date(),
      });
    } else {
      // Обновляем время последнего входа
      await user.updateLastLogin();
    }

    // Генерация JWT токена
    const token = generateUserToken(user._id, user.phone);

    // Возвращаем токен и данные пользователя
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        addresses: user.addresses,
        totalOrders: user.totalOrders,
        totalSpent: user.totalSpent,
      },
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

export default router;
