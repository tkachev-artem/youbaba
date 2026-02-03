import { Router, Request, Response } from 'express';
import { HeroSlide, IHeroSlide } from '../models/HeroSlide';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { convertToWebP, isValidImageType } from '../services/imageService';
import { uploadToMinio, deleteFromMinio } from '../services/minioService';

const router = Router();

/**
 * GET /api/hero-slides
 * Получить все активные слайды (публичный доступ)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const slides = await HeroSlide.find({ isActive: true })
      .sort({ order: 1 })
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: slides,
    });
  } catch (error) {
    console.error('Error fetching hero slides:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero slides',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/hero-slides/admin
 * Получить все слайды (включая неактивные) - только для админов
 */
router.get('/admin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const slides = await HeroSlide.find()
      .sort({ order: 1 })
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: slides,
    });
  } catch (error) {
    console.error('Error fetching all hero slides:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero slides',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/hero-slides/:id
 * Получить конкретный слайд по ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Hero slide not found',
      });
    }

    res.json({
      success: true,
      data: slide,
    });
  } catch (error) {
    console.error('Error fetching hero slide:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero slide',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/hero-slides
 * Создать новый слайд
 */
router.post(
  '/',
  authenticate,
  uploadSingle,
  async (req: AuthRequest, res: Response) => {
    try {
      const { hashtag, title, text, mobileTitle, mobileText, order, isActive, imagePosition } = req.body;

      // Валидация обязательных полей
      if (!hashtag || !title) {
        return res.status(400).json({
          success: false,
          message: 'Hashtag and title are required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required',
        });
      }

      // Проверка типа файла
      if (!isValidImageType(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image type. Only JPEG, PNG, and WebP are allowed',
        });
      }

      // Конвертируем изображение в WebP
      const processedImages = await convertToWebP(req.file.buffer, req.file.originalname);

      // Загружаем оригинал в MinIO
      const originalUpload = await uploadToMinio(
        processedImages.original.buffer,
        processedImages.original.filename,
        processedImages.original.mimetype,
        'hero-slides'
      );

      // Загружаем миниатюру в MinIO
      const thumbnailUpload = await uploadToMinio(
        processedImages.thumbnail.buffer,
        processedImages.thumbnail.filename,
        processedImages.thumbnail.mimetype,
        'hero-slides/thumbnails'
      );

      // Парсим imagePosition если передан как строка
      let parsedImagePosition;
      if (imagePosition) {
        try {
          parsedImagePosition = typeof imagePosition === 'string' 
            ? JSON.parse(imagePosition) 
            : imagePosition;
        } catch (e) {
          console.error('Error parsing imagePosition:', e);
          parsedImagePosition = {
            positionX: 50,
            positionY: 50,
          };
        }
      }

      // Создаем слайд в БД
      const newSlide = new HeroSlide({
        bgImage: {
          url: originalUpload.url,
          thumbnailUrl: thumbnailUpload.url,
          width: processedImages.original.width,
          height: processedImages.original.height,
          size: processedImages.original.size,
          objectName: originalUpload.objectName,
        },
        imagePosition: parsedImagePosition || {
          positionX: 50,
          positionY: 50,
        },
        hashtag,
        title,
        text: text || '',
        mobileTitle: mobileTitle || undefined,
        mobileText: mobileText || undefined,
        order: order ? parseInt(order) : 0,
        isActive: isActive === 'true' || isActive === true,
        createdBy: req.admin?._id as any,
        updatedBy: req.admin?._id as any,
      });

      await newSlide.save();

      res.status(201).json({
        success: true,
        message: 'Hero slide created successfully',
        data: newSlide,
      });
    } catch (error) {
      console.error('Error creating hero slide:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create hero slide',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /api/hero-slides/:id
 * Обновить слайд
 */
router.put(
  '/:id',
  authenticate,
  uploadSingle,
  async (req: AuthRequest, res: Response) => {
    try {
      const { hashtag, title, text, mobileTitle, mobileText, order, isActive, imagePosition } = req.body;

      const slide = await HeroSlide.findById(req.params.id);

      if (!slide) {
        return res.status(404).json({
          success: false,
          message: 'Hero slide not found',
        });
      }

      // Если загружено новое изображение
      if (req.file) {
        // Проверка типа файла
        if (!isValidImageType(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image type. Only JPEG, PNG, and WebP are allowed',
          });
        }

        // Удаляем старые изображения из MinIO
        try {
          await deleteFromMinio(slide.bgImage.objectName);
          // Также удаляем миниатюру (предполагаем стандартное именование)
          const thumbnailObjectName = slide.bgImage.objectName.replace('.webp', '-thumb.webp');
          await deleteFromMinio(thumbnailObjectName);
        } catch (error) {
          console.error('Error deleting old images from MinIO:', error);
        }

        // Конвертируем новое изображение
        const processedImages = await convertToWebP(req.file.buffer, req.file.originalname);

        // Загружаем новые изображения
        const originalUpload = await uploadToMinio(
          processedImages.original.buffer,
          processedImages.original.filename,
          processedImages.original.mimetype,
          'hero-slides'
        );

        const thumbnailUpload = await uploadToMinio(
          processedImages.thumbnail.buffer,
          processedImages.thumbnail.filename,
          processedImages.thumbnail.mimetype,
          'hero-slides/thumbnails'
        );

        slide.bgImage = {
          url: originalUpload.url,
          thumbnailUrl: thumbnailUpload.url,
          width: processedImages.original.width,
          height: processedImages.original.height,
          size: processedImages.original.size,
          objectName: originalUpload.objectName,
        };
      }

      // Обновляем остальные поля
      if (hashtag !== undefined) slide.hashtag = hashtag;
      if (title !== undefined) slide.title = title;
      if (text !== undefined) slide.text = text;
      if (mobileTitle !== undefined) slide.mobileTitle = mobileTitle || undefined;
      if (mobileText !== undefined) slide.mobileText = mobileText || undefined;
      if (order !== undefined) slide.order = parseInt(order);
      if (isActive !== undefined) slide.isActive = isActive === 'true' || isActive === true;
      
      // Обновляем imagePosition если передан
      if (imagePosition !== undefined) {
        try {
          const parsedImagePosition = typeof imagePosition === 'string' 
            ? JSON.parse(imagePosition) 
            : imagePosition;
          slide.imagePosition = parsedImagePosition;
        } catch (e) {
          console.error('Error parsing imagePosition:', e);
        }
      }

      slide.updatedBy = req.admin?._id as any;

      await slide.save();

      res.json({
        success: true,
        message: 'Hero slide updated successfully',
        data: slide,
      });
    } catch (error) {
      console.error('Error updating hero slide:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update hero slide',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/hero-slides/:id
 * Удалить слайд
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Hero slide not found',
      });
    }

    // Удаляем изображения из MinIO
    try {
      await deleteFromMinio(slide.bgImage.objectName);
      // Также удаляем миниатюру
      const thumbnailObjectName = slide.bgImage.objectName.replace('.webp', '-thumb.webp');
      await deleteFromMinio(thumbnailObjectName);
    } catch (error) {
      console.error('Error deleting images from MinIO:', error);
    }

    // Удаляем слайд из БД
    await HeroSlide.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Hero slide deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting hero slide:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hero slide',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/hero-slides/reorder
 * Изменить порядок слайдов
 */
router.patch('/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { slides } = req.body; // Array of { id, order }

    if (!Array.isArray(slides)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Expected array of slides',
      });
    }

    // Обновляем порядок для каждого слайда
    const updatePromises = slides.map(({ id, order }) =>
      HeroSlide.findByIdAndUpdate(
        id,
        { order, updatedBy: req.admin?._id as any },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Slides reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering slides:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder slides',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
