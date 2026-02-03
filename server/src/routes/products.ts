import { Router, Request, Response } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleAvailability,
  toggleFeatured,
  getProductStats,
} from '../services/productService';
import {
  validateGetProductsQuery,
  validateProductId,
  validateCreateProduct,
  validateUpdateProduct,
  parseQueryBooleans,
  parseQueryNumbers,
} from '../middleware/validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadSingle, handleMulterError, requireFile } from '../middleware/upload';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/products
 * Получить все товары с фильтрацией и пагинацией (PUBLIC)
 */
router.get(
  '/',
  parseQueryBooleans,
  parseQueryNumbers,
  validateGetProductsQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getProducts(req.query);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * GET /api/products/stats
 * Получить статистику по товарам (PUBLIC или ADMIN)
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await getProductStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/products/category/:category
 * Получить товары по категории (PUBLIC)
 */
router.get(
  '/category/:category',
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const products = await getProductsByCategory(category);

    res.json({
      success: true,
      data: products,
    });
  })
);

/**
 * GET /api/products/:id
 * Получить товар по ID (PUBLIC)
 */
router.get(
  '/:id',
  validateProductId,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await getProductById(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * POST /api/products
 * Создать новый товар (ADMIN ONLY)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadSingle,
  handleMulterError,
  requireFile,
  validateCreateProduct,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new Error('Image file is required');
    }

    const product = await createProduct({
      ...req.body,
      imageBuffer: req.file.buffer,
      imageFilename: req.file.originalname,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  })
);

/**
 * PUT /api/products/:id
 * Обновить товар (ADMIN ONLY)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadSingle,
  handleMulterError,
  validateProductId,
  validateUpdateProduct,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const updateData: any = { ...req.body };
    
    // Если загружено новое изображение
    if (req.file) {
      updateData.imageBuffer = req.file.buffer;
      updateData.imageFilename = req.file.originalname;
    }

    const product = await updateProduct(id, updateData);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  })
);

/**
 * DELETE /api/products/:id
 * Удалить товар (ADMIN ONLY)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateProductId,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await deleteProduct(id);

    if (!deleted) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  })
);

/**
 * PATCH /api/products/:id/availability
 * Переключить доступность товара (ADMIN ONLY)
 */
router.patch(
  '/:id/availability',
  authenticate,
  requireAdmin,
  validateProductId,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await toggleAvailability(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product,
      message: `Product is now ${product.isAvailable ? 'available' : 'unavailable'}`,
    });
  })
);

/**
 * PATCH /api/products/:id/featured
 * Переключить статус "рекомендуемое" (ADMIN ONLY)
 */
router.patch(
  '/:id/featured',
  authenticate,
  requireAdmin,
  validateProductId,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await toggleFeatured(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product,
      message: `Product is now ${product.isFeatured ? 'featured' : 'not featured'}`,
    });
  })
);

export default router;
