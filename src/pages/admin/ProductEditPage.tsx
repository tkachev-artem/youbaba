import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { updateProduct } from '../../lib/api/admin';
import { getProductById } from '../../lib/api/products';
import { ArrowLeft, Upload } from 'lucide-react';
import { CustomSelect } from '../../components/admin/CustomSelect';
import '../../styles/admin.css';

const categories = [
  'Салаты', 'Лапша/рис', 'Закуски', 'Супы', 'Роллы', 'Роллы холодные',
  'Роллы запеченые', 'Роллы жаренные', 'Пицца', 'Бургеры', 'Напитки',
  'Десерты', 'Соусы', 'Поке',
];

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    category: categories[0],
    gram: '',
    description: '',
    price: 0,
    isAvailable: true,
    isFeatured: false,
    order: 0,
  });
  
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    
    const loadProduct = async () => {
      try {
        const response = await getProductById(id);
        const product = response.data;
        
        setFormData({
          title: product.title,
          category: product.category,
          gram: product.gram,
          description: product.description || '',
          price: product.price,
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          order: product.order,
        });
        
        setCurrentImageUrl(product.image.original.url);
        setIsLoading(false);
      } catch (err) {
        setError('Не удалось загрузить товар');
        setIsLoading(false);
      }
    };
    
    loadProduct();
  }, [id]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !id) {
      setError('Не авторизован');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: any = { ...formData };
      if (imageFile) {
        updateData.image = imageFile;
      }
      
      await updateProduct(id, updateData, token);
      navigate('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления товара');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p className="admin-loading-text">Загрузка товара...</p>
      </div>
    );
  }

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
          {/* Image */}
          <div style={{ marginBottom: '24px' }}>
            <label className="admin-form-label">
              Изображение товара
            </label>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Current image */}
              <div>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Текущее изображение:
                </p>
                <img
                  src={currentImageUrl}
                  alt="Current"
                  style={{
                    width: '180px',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '2px solid #e0e0e0',
                  }}
                />
              </div>

              {/* New image upload */}
              <div>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Новое изображение (необязательно):
                </p>
                {imagePreview ? (
                  <div className="admin-image-preview">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '180px', height: '180px' }}
                    />
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
                  <label className="admin-image-upload" style={{ width: '180px', height: '180px' }}>
                    <Upload size={24} />
                    <span style={{ fontSize: '13px' }}>Загрузить</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>
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
              className="admin-form-textarea"
            />
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
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
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
