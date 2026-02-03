import { Router, Request, Response } from 'express';
import { Order, OrderStatus, FulfillmentType, PaymentMethod } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { authenticate } from '../middleware/auth'; // Админ/оператор
import { optionalAuthenticateUser } from '../middleware/profileAuth'; // Пользователь (опционально)
import {
  determineInitialOrderStatus,
  calculateOrderPricing,
  checkPromos,
  generateOperatorNotification,
} from '../services/orderService';
import { sanitizeString } from '../utils/validators';

const router = Router();

/**
 * POST /api/orders
 * Создание нового заказа (для клиентов)
 */
router.post('/', optionalAuthenticateUser, async (req: Request, res: Response) => {
  try {
    const {
      customer,
      items,
      fulfillment,
      payment,
      cutleryCount = 0,
      comment = '',
    } = req.body;

    // Валидация обязательных полей
    if (!customer || !items || !fulfillment || !payment) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не все обязательные поля заполнены',
      });
    }

    if (!customer.name || !customer.phone) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указано имя или телефон',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Заказ должен содержать хотя бы один товар',
      });
    }

    if (fulfillment.type === FulfillmentType.DELIVERY && !fulfillment.address) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Для доставки необходимо указать адрес',
      });
    }

    // Проверка и обогащение товаров
    const enrichedItems = [];
    let productsTotal = 0;

    for (const item of items) {
      // Ищем товар по полю 'id' (slug), а не по _id (ObjectId)
      const product = await Product.findOne({ id: item.productId });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'product_not_found',
          message: `Товар ${item.productId} не найден`,
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          error: 'product_unavailable',
          message: `Товар "${product.title}" недоступен`,
        });
      }

      const itemTotal = product.price * item.quantity;
      productsTotal += itemTotal;

      enrichedItems.push({
        productId: product._id,
        title: product.title,
        image: product.image.thumbnail.url,
        price: product.price,
        quantity: item.quantity,
        gram: product.gram,
      });

      // Обновление статистики продаж
      product.sales += item.quantity;
      await product.save();
    }

    // Расчёт итоговой стоимости
    const pricingBase = await calculateOrderPricing({
      productsTotal,
      fulfillmentType: fulfillment.type,
      address: fulfillment.address,
    });

    // Проверка акций
    const appliedPromos = checkPromos(productsTotal);
    
    const pricing = {
      ...pricingBase,
      appliedPromos,
    };

    // Определение начального статуса
    const initialStatus = determineInitialOrderStatus(
      fulfillment.type,
      payment.method
    );

    // Подготовка данных клиента
    const customerData: any = {
      name: sanitizeString(customer.name),
      phone: customer.phone,
    };

    // Если пользователь авторизован, привязываем заказ
    if (req.user) {
      customerData.userId = req.user._id;
    }

    // Получение адреса самовывоза из настроек ресторана
    let pickupAddress: string | undefined;
    if (fulfillment.type === FulfillmentType.PICKUP) {
      const settings = await RestaurantSettings.findOne();
      pickupAddress = settings?.address || 'Адрес не указан';
    }

    // Генерация номера заказа (для клиентов с сайта)
    // S-001 - самовывоз, D-001 - доставка
    const orderTypePrefix = fulfillment.type === FulfillmentType.PICKUP ? 'S' : 'D';
    
    const lastOrder = await Order.findOne({
      orderNumber: new RegExp(`^${orderTypePrefix}-`),
    })
      .sort({ orderNumber: -1 })
      .limit(1);

    let orderNumber: string;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[1]);
      const newSequence = (lastSequence + 1).toString().padStart(3, '0');
      orderNumber = `${orderTypePrefix}-${newSequence}`;
    } else {
      orderNumber = `${orderTypePrefix}-001`;
    }

    // Создание заказа
    const order = await Order.create({
      orderNumber,
      customer: customerData,
      items: enrichedItems,
      fulfillment: {
        type: fulfillment.type,
        address: fulfillment.address ? sanitizeString(fulfillment.address) : undefined,
        ...(pricingBase.deliveryInfo && { deliveryInfo: pricingBase.deliveryInfo }),
        pickupAddress,
      },
      payment: {
        method: payment.method,
        status: 'pending',
      },
      cutleryCount,
      comment: sanitizeString(comment),
      pricing,
      status: initialStatus,
    });

    // Обновление статистики пользователя (если авторизован)
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user && typeof user.updateOrderStats === 'function') {
        await user.updateOrderStats(pricing.finalTotal);
      }
    }

    // TODO: Отправка уведомления оператору
    const notificationMessage = generateOperatorNotification(order);
    console.log('Notification:', notificationMessage);

    return res.status(201).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pricing: order.pricing,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка создания заказа',
    });
  }
});

/**
 * POST /api/orders/operator
 * Создание заказа оператором (с возможностью установить любой статус)
 */
router.post('/operator', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('=== Create order (operator) request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      customer,
      items,
      fulfillment,
      payment,
      cutleryCount = 0,
      comment = '',
      status = 'pending',
      paymentStatus = 'pending',
    } = req.body;

    // Валидация обязательных полей
    if (!customer || !items || !fulfillment || !payment) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не все обязательные поля заполнены',
      });
    }

    if (!customer.name || !customer.phone) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указано имя или телефон',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Заказ должен содержать хотя бы один товар',
      });
    }

    if (fulfillment.type === FulfillmentType.DELIVERY && !fulfillment.address) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Для доставки необходимо указать адрес',
      });
    }

    // Проверка и обогащение товаров
    const enrichedItems = [];
    let productsTotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ id: item.productId });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'product_not_found',
          message: `Товар ${item.productId} не найден`,
        });
      }

      const itemTotal = product.price * item.quantity;
      productsTotal += itemTotal;

      enrichedItems.push({
        productId: product._id,
        title: product.title,
        image: product.image.thumbnail.url,
        price: product.price,
        quantity: item.quantity,
        gram: product.gram,
      });
    }

    // Расчет стоимости
    const pricing = await calculateOrderPricing({
      productsTotal,
      fulfillmentType: fulfillment.type,
      address: fulfillment.address,
    });

    // Получение адреса самовывоза из настроек ресторана
    let pickupAddress: string | undefined;
    if (fulfillment.type === FulfillmentType.PICKUP) {
      const settings = await RestaurantSettings.findOne();
      pickupAddress = settings?.address || 'Адрес не указан';
    }

    // Генерация номера заказа (для операторов)
    // X-001 - заказы созданные оператором
    const orderTypePrefix = 'X';
    
    const lastOrder = await Order.findOne({
      orderNumber: new RegExp(`^${orderTypePrefix}-`),
    })
      .sort({ orderNumber: -1 })
      .limit(1);

    let orderNumber: string;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[1]);
      const newSequence = (lastSequence + 1).toString().padStart(3, '0');
      orderNumber = `${orderTypePrefix}-${newSequence}`;
    } else {
      orderNumber = `${orderTypePrefix}-001`;
    }

    // Создание заказа с указанным статусом
    const order = new Order({
      orderNumber,
      customer: {
        name: sanitizeString(customer.name),
        phone: sanitizeString(customer.phone),
      },
      items: enrichedItems,
      fulfillment: {
        type: fulfillment.type,
        ...(fulfillment.type === FulfillmentType.DELIVERY && {
          address: sanitizeString(fulfillment.address),
          deliveryInfo: pricing.deliveryInfo,
        }),
        ...(fulfillment.type === FulfillmentType.PICKUP && {
          pickupAddress,
        }),
      },
      payment: {
        method: payment.method,
        status: paymentStatus, // Устанавливаем статус оплаты
      },
      pricing: {
        productsTotal,
        deliveryCost: pricing.deliveryCost,
        pickupDiscount: pricing.pickupDiscount,
        finalTotal: pricing.finalTotal,
      },
      status, // Устанавливаем указанный статус
      cutleryCount: Number(cutleryCount),
      comment: comment ? sanitizeString(comment) : undefined,
    });

    // Устанавливаем временные метки в зависимости от статуса
    const now = new Date();
    if (status === 'confirmed' || status === 'preparing' || status === 'ready' || status === 'in_delivery' || status === 'completed') {
      order.confirmedAt = now;
    }
    if (status === 'preparing' || status === 'ready' || status === 'in_delivery' || status === 'completed') {
      order.preparingAt = now;
    }
    if (status === 'ready' || status === 'in_delivery' || status === 'completed') {
      order.readyAt = now;
    }
    if (status === 'in_delivery' || status === 'completed') {
      order.inDeliveryAt = now;
    }
    if (status === 'completed') {
      order.completedAt = now;
    }
    if (status === 'cancelled') {
      order.cancelledAt = now;
    }

    await order.save();

    return res.status(201).json({
      success: true,
      message: 'Заказ успешно создан',
      order,
    });
  } catch (error: any) {
    console.error('Create order (operator) error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message || 'Ошибка создания заказа',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/orders
 * Получение списка заказов (для операторов)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      status,
      fulfillmentType,
      date,
      search,
      limit = 50,
      skip = 0,
    } = req.query;

    // Построение фильтра
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (fulfillmentType) {
      filter['fulfillment.type'] = fulfillmentType;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      filter.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    if (search) {
      // Экранируем специальные символы regex для безопасного поиска
      const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: escapedSearch, $options: 'i' } },
        { 'customer.phone': { $regex: escapedSearch, $options: 'i' } },
        { 'customer.name': { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // Получение заказов
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const total = await Order.countDocuments(filter);

    // Логирование для дебага
    console.log('Orders response sample:', orders.length > 0 ? {
      orderNumber: orders[0].orderNumber,
      status: orders[0].status,
      confirmedAt: orders[0].confirmedAt,
      createdAt: orders[0].createdAt,
    } : 'No orders');

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
      message: 'Ошибка получения заказов',
    });
  }
});

/**
 * GET /api/orders/:id
 * Получение детальной информации о заказе (для операторов)
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

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
      message: 'Ошибка получения заказа',
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Изменение статуса заказа (для операторов)
 */
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Не указан новый статус',
      });
    }

    // Проверка валидности статуса
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_status',
        message: 'Неверный статус',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'order_not_found',
        message: 'Заказ не найден',
      });
    }

    // Изменение статуса с добавлением в историю
    if (req.admin && req.admin._id) {
      const adminId = new (require('mongoose').Types.ObjectId)(req.admin._id);
      
      order.changeStatus(
        status,
        adminId, // ID оператора из middleware
        comment ? sanitizeString(comment) : undefined
      );

      // Если статус confirmed и оператор еще не установлен
      if (status === OrderStatus.CONFIRMED && !order.operator) {
        order.operator = {
          id: adminId,
          name: req.admin.username || 'Unknown',
          confirmedAt: new Date(),
        } as any;
      }
      
      // Если статус completed - фиксируем оплату
      if (status === OrderStatus.COMPLETED) {
        order.payment.status = 'paid';
        order.payment.paidAt = new Date();
        order.markModified('payment');
      }
    } else {
      order.changeStatus(
        status,
        undefined,
        comment ? sanitizeString(comment) : undefined
      );
      
      // Если статус completed - фиксируем оплату
      if (status === OrderStatus.COMPLETED) {
        order.payment.status = 'paid';
        order.payment.paidAt = new Date();
        order.markModified('payment');
      }
    }

    // Помечаем confirmedAt и completedAt как изменённые поля для Mongoose
    order.markModified('confirmedAt');
    order.markModified('completedAt');
    
    await order.save();

    // Перезагружаем документ из БД чтобы убедиться что всё сохранилось
    const updatedOrder = await Order.findById(order._id);

    // Логирование для дебага
    console.log('Order after status update:', {
      orderNumber: updatedOrder?.orderNumber,
      status: updatedOrder?.status,
      confirmedAt: updatedOrder?.confirmedAt,
      operator: updatedOrder?.operator,
    });

    // TODO: Отправка уведомления клиенту

    return res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка обновления статуса',
    });
  }
});

/**
 * DELETE /api/orders/:id
 * Удаление заказа (для операторов, только в статусе cancelled)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'order_not_found',
        message: 'Заказ не найден',
      });
    }

    // Можно удалять только отменённые заказы
    if (order.status !== OrderStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: 'cannot_delete',
        message: 'Можно удалить только отменённые заказы',
      });
    }

    await order.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Заказ удалён',
    });
  } catch (error) {
    console.error('Delete order error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка удаления заказа',
    });
  }
});

/**
 * POST /api/orders/track
 * Отслеживание заказа по номеру и телефону (публичный endpoint)
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { orderNumber, phone } = req.body;

    if (!orderNumber || !phone) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'Укажите номер заказа и телефон',
      });
    }

    // Убираем все нечисловые символы из телефона для поиска
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ищем заказ по номеру и телефону (поддерживаем разные форматы)
    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
      $or: [
        { 'customer.phone': phone.trim() },
        { 'customer.phone': cleanPhone },
        { 'customer.phone': `+${cleanPhone}` },
        { 'customer.phone': `+7${cleanPhone.substring(1)}` },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Заказ не найден',
      });
    }

    // Возвращаем информацию о заказе
    return res.status(200).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: {
          name: order.customer.name,
          phone: order.customer.phone,
        },
        items: order.items,
        fulfillment: order.fulfillment,
        payment: order.payment,
        pricing: order.pricing,
        cutleryCount: order.cutleryCount,
        comment: order.comment,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Track order error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка при поиске заказа',
    });
  }
});

export default router;
