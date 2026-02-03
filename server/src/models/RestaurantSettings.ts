import mongoose, { Schema, Document } from 'mongoose';

// Интерфейс для часов работы одного дня
export interface IDaySchedule {
  open: string;      // Формат "HH:MM" (например, "12:00")
  close: string;     // Формат "HH:MM" (например, "22:30")
  isClosed: boolean; // Выходной день
}

// Интерфейс для всех часов работы
export interface IOpeningHours {
  monday: IDaySchedule;
  tuesday: IDaySchedule;
  wednesday: IDaySchedule;
  thursday: IDaySchedule;
  friday: IDaySchedule;
  saturday: IDaySchedule;
  sunday: IDaySchedule;
}

// Интерфейс для координат
export interface ICoordinates {
  lat: number;
  lng: number;
}

// Интерфейс документа RestaurantSettings
export interface IRestaurantSettings extends Document {
  // Основная информация
  name: string;
  address: string;
  phone: string;
  
  // Координаты
  coordinates: ICoordinates;
  
  // Часы работы
  openingHours: IOpeningHours;
  
  // Статус
  isActive: boolean; // Можно вручную закрыть ресторан
  
  // Метаданные
  updatedBy?: mongoose.Types.ObjectId; // Ссылка на Admin
  createdAt: Date;
  updatedAt: Date;
}

// Схема для расписания одного дня
const dayScheduleSchema = new Schema<IDaySchedule>(
  {
    open: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      default: '12:00',
    },
    close: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
      default: '22:30',
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Схема для координат
const coordinatesSchema = new Schema<ICoordinates>(
  {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
  },
  { _id: false }
);

// Схема для часов работы
const openingHoursSchema = new Schema<IOpeningHours>(
  {
    monday: { type: dayScheduleSchema, required: true },
    tuesday: { type: dayScheduleSchema, required: true },
    wednesday: { type: dayScheduleSchema, required: true },
    thursday: { type: dayScheduleSchema, required: true },
    friday: { type: dayScheduleSchema, required: true },
    saturday: { type: dayScheduleSchema, required: true },
    sunday: { type: dayScheduleSchema, required: true },
  },
  { _id: false }
);

// Основная схема настроек ресторана
const restaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^\+?[0-9\s\-\(\)]{10,20}$/,
    },
    coordinates: {
      type: coordinatesSchema,
      required: true,
    },
    openingHours: {
      type: openingHoursSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc: any, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Индекс не нужен, так как _id уже индексируется по умолчанию

// Экспорт модели
export const RestaurantSettings = mongoose.model<IRestaurantSettings>(
  'RestaurantSettings',
  restaurantSettingsSchema
);
