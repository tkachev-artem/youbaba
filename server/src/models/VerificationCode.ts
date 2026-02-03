import mongoose, { Schema, Document } from 'mongoose';

// Методы отправки кода
export enum VerificationMethod {
  VK = 'vk',
  TELEGRAM = 'telegram',
  SMS = 'sms',
}

// Методы для документа VerificationCode
export interface IVerificationCodeMethods {
  isExpired(): boolean;
  isAttemptsExceeded(): boolean;
  incrementAttempts(): Promise<IVerificationCode>;
  markAsUsed(): Promise<IVerificationCode>;
}

// Статические методы модели
export interface IVerificationCodeModel extends mongoose.Model<IVerificationCode> {
  cleanupOldCodes(phone: string): Promise<void>;
  generateSessionId(): string;
}

// Интерфейс документа VerificationCode
export interface IVerificationCode extends Document, IVerificationCodeMethods {
  sessionId: string;           // Уникальный ID сессии
  phone: string;               // Телефон
  code: string;                // 6-значный код (хешированный)
  method: VerificationMethod;  // Способ отправки
  attempts: number;            // Количество попыток ввода
  used: boolean;               // Код использован
  createdAt: Date;
  expiresAt: Date;             // Время истечения (5 минут)
}

// Схема VerificationCode
const verificationCodeSchema = new Schema<IVerificationCode>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+7\d{10}$/, 'Invalid phone format'],
      index: true,
    },
    code: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 100,        // Для хешированного кода
    },
    method: {
      type: String,
      enum: Object.values(VerificationMethod),
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,                // Максимум 5 попыток
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,       // Используем кастомный createdAt
  }
);

// TTL Index - автоматическое удаление истёкших кодов
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Индексы для оптимизации
// sessionId, phone, used, createdAt, expiresAt уже имеют index: true, не нужно дублировать одиночные индексы
verificationCodeSchema.index({ phone: 1, used: 1 });

// Метод для проверки, истёк ли код
verificationCodeSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

// Метод для проверки, превышен ли лимит попыток
verificationCodeSchema.methods.isAttemptsExceeded = function (): boolean {
  return this.attempts >= 5;
};

// Метод для инкремента попыток
verificationCodeSchema.methods.incrementAttempts = function () {
  this.attempts += 1;
  return this.save();
};

// Метод для пометки кода как использованного
verificationCodeSchema.methods.markAsUsed = function () {
  this.used = true;
  return this.save();
};

// Статический метод для очистки старых кодов пользователя
verificationCodeSchema.statics.cleanupOldCodes = async function (phone: string) {
  await this.deleteMany({
    phone,
    $or: [
      { used: true },
      { expiresAt: { $lt: new Date() } },
    ],
  });
};

// Статический метод для генерации sessionId
verificationCodeSchema.statics.generateSessionId = function (): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Экспорт модели
export const VerificationCode = mongoose.model<IVerificationCode, IVerificationCodeModel>(
  'VerificationCode',
  verificationCodeSchema
);
