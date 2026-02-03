import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { createProduct } from '../../lib/api/admin';
import { ArrowLeft, Upload } from 'lucide-react';
import { CustomSelect } from '../../components/admin/CustomSelect';
import '../../styles/admin.css';

const categories = [
  'Салаты', 'Лапша/рис', 'Закуски', 'Супы', 'Роллы', 'Роллы холодные',
  'Роллы запеченые', 'Роллы жаренные', 'Пицца', 'Бургеры', 'Напитки',
  'Десерты', 'Соусы', 'Поке',
];

export function ProductNewPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    category: categories[0],
    gram: '',
    description: '',
    price: 0,
    isAvailable: true,
    isFeatured: false,
    order: 0,
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateId = (title: string, category: string) => {
    // Транслитерация кириллицы в латиницу
    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    const translit = (text: string) => {
      return text.toLowerCase().split('').map(char => translitMap[char] || char).join('');
    };
    
    return `${translit(category)}-${translit(title)}`
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!imageFile) {
      setError('Необходимо загрузить изображение');
      return;
    }

    if (!token) {
      setError('Не авторизован');
      return;
    }

    setIsSubmitting(true);

    try {
      const id = formData.id || generateId(formData.title, formData.category);
      
      await createProduct({
        ...formData,
        id,
        image: imageFile,
      }, token);

      navigate('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания товара');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Back button */}
      <div className="admin-mb-2">
        <button 
          onClick={() => navigate('/admin/products')} 
          className="admin-btn admin-btn-secondary"
          type="button"
        >
          <ArrowLeft size={18} />
          Назад к товарам
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="admin-form-card">
          {/* Image upload */}
          <div style={{ marginBottom: '24px' }}>
            <label className="admin-form-label">
              Изображение товара *
            </label>
            
            {imagePreview ? (
              <div className="admin-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="admin-image-remove"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <label className="admin-image-upload">
                <Upload size={32} />
                <span>Загрузить изображение</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  required
                />
              </label>
            )}
            <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              PNG, JPG, WebP. Рекомендуемый размер: 800x800px
            </p>
          </div>

          <div className="admin-form-grid">
            {/* Title */}
            <div>
              <label className="admin-form-label">Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Салат Цезарь"
                className="admin-form-input"
              />
            </div>

            {/* Category */}
            <div>
              <CustomSelect
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={categories.map(cat => ({
                  value: cat,
                  label: cat,
                }))}
                label="Категория"
                required
              />
            </div>

            {/* Gram */}
            <div>
              <label className="admin-form-label">Вес/Объем (гр. или шт.) *</label>
              <input
                type="text"
                value={formData.gram}
                onChange={(e) => setFormData({ ...formData, gram: e.target.value })}
                required
                placeholder="Например: 350 гр. или 8 шт."
                className="admin-form-input"
              />
            </div>

            {/* Price */}
            <div>
              <label className="admin-form-label">Цена (₽) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
                min="0"
                placeholder="500"
                className="admin-form-input"
              />
            </div>
          </div>

          {/* Description */}
          <div className="admin-form-full" style={{ marginTop: '20px' }}>
            <label className="admin-form-label">Описание (состав)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Состав: помидоры, огурцы, салат..."
              className="admin-form-textarea"
            />
          </div>

          {/* ID (optional) */}
          <div className="admin-form-full" style={{ marginTop: '20px' }}>
            <label className="admin-form-label">
              ID (необязательно, генерируется автоматически)
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="салаты-цезарь или salaty-tsezar"
              className="admin-form-input"
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Можно использовать как латиницу, так и кириллицу. Если не указан, будет сгенерирован автоматически.
            </p>
          </div>

          {/* Checkboxes */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>Товар доступен</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>Популярный товар</span>
            </label>
          </div>

          {/* Submit buttons */}
          <div className="admin-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn admin-btn-primary"
            >
              {isSubmitting ? 'Создание...' : 'Создать товар'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              disabled={isSubmitting}
              className="admin-btn admin-btn-secondary"
            >
              Отмена
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
