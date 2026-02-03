import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { authenticateUser } from '../middleware/profileAuth';
import { sanitizeString } from '../utils/validators';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticateUser);

/**
 * GET /api/profile/me
 * Получение данных профиля текущего пользователя
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        vkId: user.vkId,
        telegramId: user.telegramId,
        addresses: user.addresses,
        totalOrders: user.totalOrders,
        totalSpent: user.totalSpent,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * PATCH /api/profile/me
 * Обновление данных профиля
 */
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    // Обновление имени
    if (name !== undefined) {
      user.name = sanitizeString(name);
    }

    // Обновление email
    if (email !== undefined) {
      user.email = email.trim().toLowerCase();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * GET /api/profile/addresses
 * Получение всех адресов пользователя
 */
router.get('/addresses', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    return res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * POST /api/profile/addresses
 * Добавление нового адреса
 */
router.post('/addresses', async (req: Request, res: Response) => {
  try {
    const { label, address, coordinates, isDefault } = req.body;

    // Валидация
    if (!label || !address) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указан label или address',
      });
    }

    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    // Добавление адреса
    await user.addAddress({
      label: sanitizeString(label),
      address: sanitizeString(address),
      coordinates,
      isDefault: isDefault || false,
    });

    return res.status(201).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    console.error('Add address error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * PATCH /api/profile/addresses/:id
 * Обновление адреса
 */
router.patch('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    // Санитизация данных
    if (updates.label) {
      updates.label = sanitizeString(updates.label);
    }
    if (updates.address) {
      updates.address = sanitizeString(updates.address);
    }

    // Обновление адреса
    await user.updateAddress(id, updates);

    return res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error: any) {
    console.error('Update address error:', error);
    
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        error: 'address_not_found',
        message: 'Адрес не найден',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * DELETE /api/profile/addresses/:id
 * Удаление адреса
 */
router.delete('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Пользователь не найден',
      });
    }

    // Удаление адреса
    await user.deleteAddress(id);

    return res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error: any) {
    console.error('Delete address error:', error);
    
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        error: 'address_not_found',
        message: 'Адрес не найден',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * GET /api/profile/orders
 * Получение заказов пользователя
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;

    // Построение фильтра
    const filter: any = {
      'customer.userId': req.user!._id,
    };

    if (status) {
      filter.status = status;
    }

    // Получение заказов
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: Number(skip) + orders.length < total,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

/**
 * GET /api/profile/orders/:id
 * Получение детальной информации о заказе
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      'customer.userId': req.user!._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'order_not_found',
        message: 'Заказ не найден',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка сервера',
    });
  }
});

export default router;
