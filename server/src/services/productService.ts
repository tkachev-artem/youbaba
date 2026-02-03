import { Product, IProduct, Category } from '../models/Product';
import { uploadFile, deleteFile, deleteMultipleFiles } from './minioService';
import { convertToWebP } from './imageService';
import type { SortOrder } from 'mongoose';

// Интерфейсы для запросов
export interface CreateProductInput {
  id: string;
  title: string;
  category: Category;
  gram: string;
  description: string;
  price: number;
  imageBuffer: Buffer;
  imageFilename: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  order?: number;
}

export interface UpdateProductInput {
  title?: string;
  category?: Category;
  gram?: string;
  description?: string;
  price?: number;
  imageBuffer?: Buffer;
  imageFilename?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  order?: number;
}

export interface GetProductsQuery {
  category?: string;
  available?: boolean;
  featured?: boolean;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Создает новый товар с загрузкой изображения
 */
export async function createProduct(input: CreateProductInput): Promise<IProduct> {
  try {
    // Конвертируем изображение в WebP
    const processedImages = await convertToWebP(input.imageBuffer, input.imageFilename);
    
    // Загружаем оба изображения в MinIO
    const originalUrl = await uploadFile(
      processedImages.original.filename,
      processedImages.original.buffer,
      processedImages.original.mimetype
    );
    
    const thumbnailUrl = await uploadFile(
      processedImages.thumbnail.filename,
      processedImages.thumbnail.buffer,
      processedImages.thumbnail.mimetype
    );
    
    // Создаем документ товара
    const product = new Product({
      id: input.id,
      title: input.title,
      category: input.category,
      gram: input.gram,
      description: input.description,
      price: input.price,
      image: {
        original: {
          url: originalUrl,
          bucket: 'products',
          filename: processedImages.original.filename,
          size: processedImages.original.size,
          width: processedImages.original.width,
          height: processedImages.original.height,
        },
        thumbnail: {
          url: thumbnailUrl,
          filename: processedImages.thumbnail.filename,
          size: processedImages.thumbnail.size,
          width: processedImages.thumbnail.width,
          height: processedImages.thumbnail.height,
        },
      },
      isAvailable: input.isAvailable ?? true,
      isFeatured: input.isFeatured ?? false,
      order: input.order ?? 0,
    });
    
    await product.save();
    console.log(`✅ Product created: ${product.title}`);
    
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Получает все товары с фильтрацией, сортировкой и пагинацией
 */
export async function getProducts(query: GetProductsQuery): Promise<PaginatedResult<IProduct>> {
  try {
    const {
      category,
      available,
      featured,
      search,
      sort = 'order',
      order = 'asc',
      page = 1,
      limit = 20,
    } = query;
    
    // Строим фильтры
    const filter: Record<string, any> = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (available !== undefined) {
      filter.isAvailable = available;
    }
    
    if (featured !== undefined) {
      filter.isFeatured = featured;
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Сортировка
    const sortOrder: SortOrder = order === 'asc' ? 1 : -1;
    const sortObj: { [key: string]: SortOrder } = { [sort]: sortOrder };
    
    // Подсчет общего количества
    const total = await Product.countDocuments(filter);
    
    // Получаем товары с пагинацией
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();
    
    return {
      data: products as IProduct[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * Получает товар по ID (slug)
 */
export async function getProductById(id: string): Promise<IProduct | null> {
  try {
    const product = await Product.findOne({ id });
    
    if (product) {
      // Увеличиваем счетчик просмотров
      product.views += 1;
      await product.save();
    }
    
    return product;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    throw error;
  }
}

/**
 * Получает товары по категории
 */
export async function getProductsByCategory(category: string): Promise<IProduct[]> {
  try {
    return await Product.find({ category, isAvailable: true })
      .sort({ order: 1 })
      .lean();
  } catch (error) {
    console.error('Error getting products by category:', error);
    throw error;
  }
}

/**
 * Обновляет товар
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<IProduct | null> {
  try {
    const product = await Product.findOne({ id });
    
    if (!product) {
      return null;
    }
    
    // Если есть новое изображение, загружаем его
    if (input.imageBuffer && input.imageFilename) {
      // Удаляем старые изображения
      await deleteMultipleFiles([
        product.image.original.filename,
        product.image.thumbnail.filename,
      ]);
      
      // Конвертируем и загружаем новые
      const processedImages = await convertToWebP(input.imageBuffer, input.imageFilename);
      
      const originalUrl = await uploadFile(
        processedImages.original.filename,
        processedImages.original.buffer,
        processedImages.original.mimetype
      );
      
      const thumbnailUrl = await uploadFile(
        processedImages.thumbnail.filename,
        processedImages.thumbnail.buffer,
        processedImages.thumbnail.mimetype
      );
      
      product.image = {
        original: {
          url: originalUrl,
          bucket: 'products',
          filename: processedImages.original.filename,
          size: processedImages.original.size,
          width: processedImages.original.width,
          height: processedImages.original.height,
        },
        thumbnail: {
          url: thumbnailUrl,
          filename: processedImages.thumbnail.filename,
          size: processedImages.thumbnail.size,
          width: processedImages.thumbnail.width,
          height: processedImages.thumbnail.height,
        },
      };
    }
    
    // Обновляем остальные поля
    if (input.title !== undefined) product.title = input.title;
    if (input.category !== undefined) product.category = input.category;
    if (input.gram !== undefined) product.gram = input.gram;
    if (input.description !== undefined) product.description = input.description;
    if (input.price !== undefined) product.price = input.price;
    if (input.isAvailable !== undefined) product.isAvailable = input.isAvailable;
    if (input.isFeatured !== undefined) product.isFeatured = input.isFeatured;
    if (input.order !== undefined) product.order = input.order;
    
    await product.save();
    console.log(`✅ Product updated: ${product.title}`);
    
    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Удаляет товар
 */
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const product = await Product.findOne({ id });
    
    if (!product) {
      return false;
    }
    
    // Удаляем изображения из MinIO
    await deleteMultipleFiles([
      product.image.original.filename,
      product.image.thumbnail.filename,
    ]);
    
    // Удаляем документ из MongoDB
    await Product.deleteOne({ id });
    console.log(`✅ Product deleted: ${product.title}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Изменяет доступность товара
 */
export async function toggleAvailability(id: string): Promise<IProduct | null> {
  try {
    const product = await Product.findOne({ id });
    
    if (!product) {
      return null;
    }
    
    product.isAvailable = !product.isAvailable;
    await product.save();
    
    console.log(`✅ Product availability toggled: ${product.title} (${product.isAvailable})`);
    
    return product;
  } catch (error) {
    console.error('Error toggling availability:', error);
    throw error;
  }
}

/**
 * Изменяет статус "рекомендуемое"
 */
export async function toggleFeatured(id: string): Promise<IProduct | null> {
  try {
    const product = await Product.findOne({ id });
    
    if (!product) {
      return null;
    }
    
    product.isFeatured = !product.isFeatured;
    await product.save();
    
    console.log(`✅ Product featured toggled: ${product.title} (${product.isFeatured})`);
    
    return product;
  } catch (error) {
    console.error('Error toggling featured:', error);
    throw error;
  }
}

/**
 * Получает статистику по товарам
 */
export async function getProductStats() {
  try {
    const total = await Product.countDocuments();
    const available = await Product.countDocuments({ isAvailable: true });
    const featured = await Product.countDocuments({ isFeatured: true });
    
    // Статистика по категориям
    const byCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          availableCount: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
    
    return {
      total,
      available,
      unavailable: total - available,
      featured,
      byCategory,
    };
  } catch (error) {
    console.error('Error getting product stats:', error);
    throw error;
  }
}

/**
 * Увеличивает счетчик продаж товара
 */
export async function incrementSales(id: string): Promise<void> {
  try {
    await Product.updateOne({ id }, { $inc: { sales: 1 } });
  } catch (error) {
    console.error('Error incrementing sales:', error);
  }
}
