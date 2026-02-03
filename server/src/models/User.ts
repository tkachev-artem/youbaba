import mongoose, { Schema, Document } from 'mongoose';

// Интерфейс адреса
export interface IAddress {
  _id: mongoose.Types.ObjectId;
  label: string;               // "Дом", "Работа", etc.
  address: string;             // Полный адрес
  coordinates?: {
    lat: number;
    lng: number;
  };
  isDefault: boolean;
}

// Методы для документа User
export interface IUserMethods {
  updateLastLogin(): Promise<IUser>;
  addAddress(addressData: Omit<IAddress, '_id'>): Promise<IUser>;
  updateAddress(addressId: string, updates: Partial<IAddress>): Promise<IUser>;
  deleteAddress(addressId: string): Promise<IUser>;
  getDefaultAddress(): IAddress | null;
  updateOrderStats(orderTotal: number): Promise<IUser>;
}

// Интерфейс документа User
export interface IUser extends Document, IUserMethods {
  phone: string;               // Уникальный идентификатор
  name?: string;
  email?: string;
  
  // Связь с социальными сетями
  vkId?: string;
  telegramId?: string;
  telegramChatId?: string;     // Chat ID для отправки сообщений
  
  // Адреса
  addresses: IAddress[];
  
  // Статистика
  totalOrders: number;
  totalSpent: number;
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Схема адреса
const addressSchema = new Schema<IAddress>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// Схема User
const userSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      match: [/^\+7\d{10}$/, 'Invalid phone format'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    vkId: {
      type: String,
      trim: true,
      sparse: true,              // Уникальный, но может быть null
      index: true,
    },
    telegramId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    telegramChatId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLoginAt: {
      type: Date,
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
// phone, vkId, telegramId, telegramChatId уже имеют index: true, не нужно дублировать
userSchema.index({ createdAt: -1 });

// Метод для обновления времени последнего входа
userSchema.methods.updateLastLogin = function () {
  this.lastLoginAt = new Date();
  return this.save();
};

// Метод для добавления адреса
userSchema.methods.addAddress = function (addressData: Omit<IAddress, '_id'>) {
  // Если это первый адрес или помечен как default, сбросить остальные
  if (addressData.isDefault || this.addresses.length === 0) {
    this.addresses.forEach((addr: IAddress) => {
      addr.isDefault = false;
    });
    addressData.isDefault = true;
  }
  
  this.addresses.push(addressData as IAddress);
  return this.save();
};

// Метод для обновления адреса
userSchema.methods.updateAddress = function (
  addressId: string,
  updates: Partial<IAddress>
) {
  const address = this.addresses.id(addressId);
  
  if (!address) {
    throw new Error('Address not found');
  }
  
  // Если устанавливаем как default, сбросить остальные
  if (updates.isDefault) {
    this.addresses.forEach((addr: IAddress) => {
      addr.isDefault = false;
    });
  }
  
  Object.assign(address, updates);
  return this.save();
};

// Метод для удаления адреса
userSchema.methods.deleteAddress = function (addressId: string) {
  const address = this.addresses.id(addressId);
  
  if (!address) {
    throw new Error('Address not found');
  }
  
  const wasDefault = address.isDefault;
  address.deleteOne();
  
  // Если удалили default адрес и есть другие, сделать первый default
  if (wasDefault && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }
  
  return this.save();
};

// Метод для получения default адреса
userSchema.methods.getDefaultAddress = function (): IAddress | null {
  return this.addresses.find((addr: IAddress) => addr.isDefault) || null;
};

// Метод для обновления статистики после заказа
userSchema.methods.updateOrderStats = function (orderTotal: number) {
  this.totalOrders += 1;
  this.totalSpent += orderTotal;
  return this.save();
};

// Экспорт модели
export const User = mongoose.model<IUser>('User', userSchema);
