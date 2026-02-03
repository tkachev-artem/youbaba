import mongoose, { Schema, Document } from 'mongoose';

// Статусы заказа
export enum OrderStatus {
  PENDING = 'pending',           // Ожидает подтверждения (самовывоз + наличные)
  CONFIRMED = 'confirmed',       // Подтверждён
  PREPARING = 'preparing',       // Готовится
  READY = 'ready',              // Готов к выдаче/доставке
  IN_DELIVERY = 'in_delivery',  // В доставке
  COMPLETED = 'completed',      // Выполнен
  CANCELLED = 'cancelled',      // Отменён
}

// Тип получения заказа
export enum FulfillmentType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

// Способы оплаты
export enum PaymentMethod {
  CARD_ONLINE = 'card_online',   // Карта онлайн (предоплата)
  CASH = 'cash',                 // Наличные
  CARD_ONSITE = 'card_onsite',   // Карта при получении
}

// Статус оплаты
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// Интерфейс товара в заказе
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  title: string;
  image: string;
  price: number;
  quantity: number;
  gram: string;
}

// Интерфейс изменения статуса
export interface IOrderStatusChange {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId;  // ID оператора
  comment?: string;
}

// Интерфейс клиента
export interface IOrderCustomer {
  userId?: mongoose.Types.ObjectId;  // Если авторизован
  name: string;
  phone: string;
}

// Интерфейс получения
export interface IOrderFulfillment {
  type: FulfillmentType;
  address?: string;              // Только для delivery
  deliveryCost: number;
  pickupAddress?: string;        // Адрес ресторана для pickup
}

// Интерфейс оплаты
export interface IOrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: Date;
}

// Интерфейс расчётов
export interface IOrderPricing {
  productsTotal: number;         // Сумма товаров
  deliveryCost: number;          // Стоимость доставки
  pickupDiscount: number;        // Скидка за самовывоз (10%)
  finalTotal: number;            // Итого к оплате
  appliedPromos: string[];       // Применённые акции
}

// Интерфейс оператора
export interface IOrderOperator {
  id: mongoose.Types.ObjectId;
  name: string;
  confirmedAt: Date;
}

// Методы для документа Order
export interface IOrderMethods {
  changeStatus(
    newStatus: OrderStatus,
    changedBy?: mongoose.Types.ObjectId,
    comment?: string
  ): void;
}

// Интерфейс документа Order
export interface IOrder extends Document, IOrderMethods {
  orderNumber: string;
  customer: IOrderCustomer;
  items: IOrderItem[];
  fulfillment: IOrderFulfillment;
  payment: IOrderPayment;
  cutleryCount: number;
  comment?: string;
  pricing: IOrderPricing;
  status: OrderStatus;
  statusHistory: IOrderStatusChange[];
  operator?: IOrderOperator;
  createdAt: Date;
  updatedAt: Date;
}

// Схема товара в заказе
const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    gram: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Схема изменения статуса
const statusChangeSchema = new Schema<IOrderStatusChange>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    comment: {
      type: String,
    },
  },
  { _id: false }
);

// Схема клиента
const customerSchema = new Schema<IOrderCustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// Схема получения
const fulfillmentSchema = new Schema<IOrderFulfillment>(
  {
    type: {
      type: String,
      enum: Object.values(FulfillmentType),
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
    deliveryCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    pickupAddress: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Схема оплаты
const paymentSchema = new Schema<IOrderPayment>(
  {
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paidAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Схема расчётов
const pricingSchema = new Schema<IOrderPricing>(
  {
    productsTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    pickupDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    appliedPromos: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

// Схема оператора
const operatorSchema = new Schema<IOrderOperator>(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// Схема Order
const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item',
      },
    },
    fulfillment: {
      type: fulfillmentSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    cutleryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    comment: {
      type: String,
      trim: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    statusHistory: {
      type: [statusChangeSchema],
      default: [],
    },
    operator: {
      type: operatorSchema,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc: any, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Индексы для оптимизации запросов
// orderNumber и status уже имеют index: true, не нужно дублировать их одиночные индексы
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'fulfillment.type': 1, status: 1 });

// Инициализация истории статусов при создании
orderSchema.pre('save', function () {
  // Инициализация истории статусов
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory = [
      {
        status: this.status,
        changedAt: new Date(),
      } as IOrderStatusChange,
    ];
  }
});

// Метод для изменения статуса
orderSchema.methods.changeStatus = function (
  newStatus: OrderStatus,
  changedBy?: mongoose.Types.ObjectId,
  comment?: string
) {
  this.status = newStatus;
  
  // Устанавливаем confirmedAt когда заказ подтверждается
  if (newStatus === OrderStatus.CONFIRMED && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  
  // Устанавливаем completedAt когда заказ завершается
  if (newStatus === OrderStatus.COMPLETED && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy,
    comment,
  });
};

// Экспорт модели
export const Order = mongoose.model<IOrder>('Order', orderSchema);
