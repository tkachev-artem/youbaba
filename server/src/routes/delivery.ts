import { Router, Request, Response } from 'express';
import {
  geocodeAddress,
  searchAddresses,
  calculateDistance,
  calculateDeliveryCost,
  Coordinates
} from '../services/geocoder';

const router = Router();

// Координаты ресторана из .env
const RESTAURANT_COORDS: Coordinates = {
  lat: parseFloat(process.env.RESTAURANT_LAT || '47.225970'),
  lng: parseFloat(process.env.RESTAURANT_LNG || '39.686114')
};

/**
 * POST /api/delivery/calculate
 * Расчет стоимости доставки по адресу
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Адрес обязателен' });
    }

    // Геокодируем адрес
    const coords = await geocodeAddress(address);

    if (!coords) {
      return res.status(404).json({ error: 'Адрес не найден' });
    }

    // Рассчитываем расстояние
    const distance = calculateDistance(RESTAURANT_COORDS, coords);

    // Рассчитываем стоимость
    const cost = calculateDeliveryCost(distance);

    res.json({
      address,
      coordinates: coords,
      distance,
      cost,
      isFree: cost === 0
    });
  } catch (error) {
    console.error('Ошибка расчета доставки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/delivery/suggestions?q=query
 * Получение подсказок адресов
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 3) {
      return res.json([]);
    }

    const suggestions = await searchAddresses(query);

    res.json(suggestions);
  } catch (error) {
    console.error('Ошибка поиска подсказок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/delivery/restaurant
 * Получение координат ресторана
 */
router.get('/restaurant', (req: Request, res: Response) => {
  res.json(RESTAURANT_COORDS);
});

export default router;
