import mongoose, { Schema, Document } from 'mongoose';

// Типы категорий
export enum Category {
  SALADS = 'Салаты',
  NOODLES_RICE = 'Лапша/рис',
  SNACKS = 'Закуски',
  SOUPS = 'Супы',
  ROLLS = 'Роллы',
  ROLLS_COLD = 'Роллы холодные',
  ROLLS_BAKED = 'Роллы запеченые',
  ROLLS_FRIED = 'Роллы жаренные',
  PIZZA = 'Пицца',
  BURGERS = 'Бургеры',
  DRINKS = 'Напитки',
  DESSERTS = 'Десерты',
  SAUCES = 'Соусы',
  POKE = 'Поке',
}

// Интерфейс для изображения
export interface IProductImage {
  original: {
    url: string;
    bucket: string;
    filename: string;
    size: number;
    width: number;
    height: number;
  };
  thumbnail: {
    url: string;
    filename: string;
    size: number;
    width: number;
    height: number;
  };
}

// Интерфейс документа Product
export interface IProduct extends Document {
  id: string;
  title: string;
  category: Category;
  gram: string;
  description: string;
  price: number;
  image: IProductImage;
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
  views: number;
  sales: number;
  createdAt: Date;
  updatedAt: Date;
}

// Схема для изображения
const imageSchema = new Schema(
  {
    original: {
      url: { type: String, required: true },
      bucket: { type: String, required: true },
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    thumbnail: {
      url: { type: String, required: true },
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      width: { type: Number, required: true, default: 400 },
      height: { type: Number, required: true, default: 400 },
    },
  },
  { _id: false }
);

// Схема Product
const productSchema = new Schema<IProduct>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(Category),
      index: true,
    },
    gram: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    image: {
      type: imageSchema,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
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
productSchema.index({ category: 1, isAvailable: 1, order: 1 });
productSchema.index({ isFeatured: 1, isAvailable: 1, order: 1 });
productSchema.index({ title: 'text', description: 'text' });

// Виртуальное поле для совместимости с фронтендом
productSchema.virtual('imageUrl').get(function () {
  return this.image.original.url;
});

// Экспорт модели
export const Product = mongoose.model<IProduct>('Product', productSchema);
