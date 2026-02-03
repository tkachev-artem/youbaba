import mongoose, { Schema, Document } from 'mongoose';

// Интерфейс для изображения слайда
export interface ISlideImage {
  url: string;           // URL изображения в MinIO
  thumbnailUrl: string;  // URL миниатюры
  width: number;         // Ширина изображения
  height: number;        // Высота изображения
  size: number;          // Размер файла в байтах
  objectName: string;    // Имя объекта в MinIO для удаления
}

// Интерфейс для позиционирования изображения
export interface IImagePosition {
  positionX?: number; // Позиция X в процентах (0-100)
  positionY?: number; // Позиция Y в процентах (0-100)
  // Legacy поля для обратной совместимости
  objectPosition?: string; // CSS object-position (например, "center", "top", "bottom", "50% 30%")
  backgroundPosition?: string; // CSS background-position для фонового слоя
}

// Интерфейс документа HeroSlide
export interface IHeroSlide extends Document {
  // Изображение
  bgImage: ISlideImage;
  
  // Позиционирование изображения
  imagePosition: IImagePosition;
  
  // Контент слайда
  hashtag: string;
  title: string;
  text: string;
  
  // Мобильная версия контента
  mobileTitle?: string;
  mobileText?: string;
  
  // Порядок отображения
  order: number;
  
  // Активность слайда
  isActive: boolean;
  
  // Метаданные
  createdBy?: mongoose.Types.ObjectId; // Ссылка на Admin
  updatedBy?: mongoose.Types.ObjectId; // Ссылка на Admin
  createdAt: Date;
  updatedAt: Date;
}

// Схема для изображения
const slideImageSchema = new Schema<ISlideImage>(
  {
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
      min: 0,
    },
    height: {
      type: Number,
      required: true,
      min: 0,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    objectName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Схема для позиционирования
const imagePositionSchema = new Schema<IImagePosition>(
  {
    positionX: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    positionY: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    // Legacy поля для обратной совместимости
    objectPosition: {
      type: String,
    },
    backgroundPosition: {
      type: String,
    },
  },
  { _id: false }
);

// Основная схема слайда
const heroSlideSchema = new Schema<IHeroSlide>(
  {
    bgImage: {
      type: slideImageSchema,
      required: true,
    },
    imagePosition: {
      type: imagePositionSchema,
      default: () => ({
        positionX: 50,
        positionY: 50,
      }),
    },
    hashtag: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    mobileTitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    mobileText: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
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

// Индекс для сортировки по порядку
heroSlideSchema.index({ order: 1 });

// Индекс для фильтрации активных слайдов
heroSlideSchema.index({ isActive: 1, order: 1 });

// Экспорт модели
export const HeroSlide = mongoose.model<IHeroSlide>(
  'HeroSlide',
  heroSlideSchema
);
