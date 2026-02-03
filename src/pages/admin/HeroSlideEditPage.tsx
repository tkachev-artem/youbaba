import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  getHeroSlideById,
  createHeroSlide,
  updateHeroSlide,
  HeroSlide,
} from '../../lib/api/heroSlides';
import { 
  ArrowLeft, 
  Upload, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Settings,
  Save,
  X
} from 'lucide-react';
import '../../styles/admin.css';

export function HeroSlideEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const isEditMode = !!id && id !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    hashtag: '',
    title: '',
    text: '',
    mobileTitle: '',
    mobileText: '',
    order: 0,
    isActive: true,
    positionX: 50, // позиция в процентах (0-100)
    positionY: 50, // позиция в процентах (0-100)
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingSlide, setExistingSlide] = useState<HeroSlide | null>(null);
  
  // Для drag & drop позиционирования
  const [isDragging, setIsDragging] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditMode && token) {
      loadSlide();
    }
  }, [id, isEditMode, token]);

  const loadSlide = async () => {
    if (!id || !token) return;

    setLoading(true);
    try {
      const slide = await getHeroSlideById(id, token);
      setExistingSlide(slide);
      setFormData({
        hashtag: slide.hashtag,
        title: slide.title,
        text: slide.text || '',
        mobileTitle: slide.mobileTitle || '',
        mobileText: slide.mobileText || '',
        order: slide.order,
        isActive: slide.isActive,
        positionX: slide.imagePosition?.positionX ?? 50,
        positionY: slide.imagePosition?.positionY ?? 50,
      });
      setImagePreview(slide.bgImage.url);
    } catch (err) {
      console.error('Failed to load slide:', err);
      setError('Не удалось загрузить слайд');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setImageFile(file);

    // Создаем preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Обработчики для перемещения изображения
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updatePositionTouch(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePositionTouch(e);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const updatePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setFormData({
      ...formData,
      positionX: Math.max(0, Math.min(100, x)),
      positionY: Math.max(0, Math.min(100, y)),
    });
  };

  const updatePositionTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !e.touches[0]) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
    const y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
    
    setFormData({
      ...formData,
      positionX: Math.max(0, Math.min(100, x)),
      positionY: Math.max(0, Math.min(100, y)),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Валидация
    if (!formData.hashtag || !formData.title) {
      setError('Хештег и заголовок обязательны');
      return;
    }

    if (!isEditMode && !imageFile) {
      setError('Изображение обязательно при создании слайда');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const slideData = {
        hashtag: formData.hashtag,
        title: formData.title,
        text: formData.text,
        mobileTitle: formData.mobileTitle || undefined,
        mobileText: formData.mobileText || undefined,
        order: formData.order,
        isActive: formData.isActive,
        imagePosition: {
          positionX: formData.positionX,
          positionY: formData.positionY,
        },
      };

      if (isEditMode && id) {
        await updateHeroSlide(
          id,
          {
            ...slideData,
            image: imageFile || undefined,
          },
          token
        );
      } else {
        if (!imageFile) {
          setError('Изображение обязательно');
          setSaving(false);
          return;
        }
        await createHeroSlide(
          {
            ...slideData,
            image: imageFile,
          },
          token
        );
      }

      navigate('/admin/hero-slides');
    } catch (err) {
      console.error('Failed to save slide:', err);
      setError('Ошибка при сохранении слайда');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p className="admin-loading-text">Загрузка слайда...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-info">
          <h1 className="admin-page-title">
            {isEditMode ? 'Редактирование слайда' : 'Новый слайд'}
          </h1>
          <p className="admin-page-subtitle">
            {isEditMode ? 'Измените параметры hero-слайда' : 'Создайте новый баннер для главной страницы'}
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/hero-slides')} 
          className="admin-btn admin-btn-secondary"
          type="button"
          style={{ marginLeft: 'auto' }}
        >
          <ArrowLeft size={18} />
          Назад
        </button>
      </div>

      {/* Alert */}
      {error && (
        <div className="admin-alert admin-alert-error">
          <X size={20} />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="admin-content">
        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '24px',
            maxWidth: '1400px'
          }}>
            
            {/* LEFT COLUMN - Image & Positioning */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Image Upload Section */}
              <div className="admin-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <ImageIcon size={24} style={{ color: '#B43F20' }} />
                  <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Изображение</h3>
                </div>

                {imagePreview ? (
                  <div>
                    {/* Preview */}
                    <div
                      ref={imageContainerRef}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '400px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: isDragging ? 'grabbing' : 'crosshair',
                        border: '3px solid #B43F20',
                        userSelect: 'none',
                        boxShadow: '0 4px 20px rgba(180, 63, 32, 0.2)',
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        draggable={false}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: `${formData.positionX}% ${formData.positionY}%`,
                          pointerEvents: 'none',
                        }}
                      />
                      {/* Focus Point Crosshair */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${formData.positionX}%`,
                          top: `${formData.positionY}%`,
                          width: '40px',
                          height: '40px',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '3px',
                          background: '#fff',
                          top: '50%',
                          left: 0,
                          transform: 'translateY(-50%)',
                          boxShadow: '0 0 8px rgba(0,0,0,0.8)',
                        }} />
                        <div style={{
                          position: 'absolute',
                          width: '3px',
                          height: '100%',
                          background: '#fff',
                          left: '50%',
                          top: 0,
                          transform: 'translateX(-50%)',
                          boxShadow: '0 0 8px rgba(0,0,0,0.8)',
                        }} />
                        <div style={{
                          position: 'absolute',
                          width: '12px',
                          height: '12px',
                          background: '#B43F20',
                          borderRadius: '50%',
                          border: '3px solid #fff',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 0 8px rgba(0,0,0,0.8)',
                        }} />
                      </div>
                      
                      {/* Info Overlay */}
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span>💡 Кликните для установки фокусной точки</span>
                        <span style={{ 
                          background: 'rgba(180, 63, 32, 0.9)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                        }}>
                          X: {formData.positionX.toFixed(0)}% • Y: {formData.positionY.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Change Image Button */}
                    <label 
                      htmlFor="image" 
                      className="admin-btn admin-btn-secondary"
                      style={{ 
                        marginTop: '16px',
                        width: '100%',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={18} />
                      {isEditMode ? 'Загрузить новое изображение' : 'Изменить изображение'}
                    </label>
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <label 
                    htmlFor="image"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      height: '400px',
                      border: '3px dashed #ddd',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      background: '#fafafa',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#B43F20';
                      e.currentTarget.style.background = 'rgba(180, 63, 32, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.background = '#fafafa';
                    }}
                  >
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(180, 63, 32, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Upload size={36} style={{ color: '#B43F20' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ 
                        fontSize: '16px', 
                        fontWeight: '700', 
                        color: '#000',
                        marginBottom: '8px'
                      }}>
                        Загрузите изображение баннера
                      </p>
                      <p style={{ fontSize: '13px', color: '#888' }}>
                        Рекомендуемый размер: 1920x1080px • Макс. 10MB
                      </p>
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                        Форматы: JPG, PNG, WebP
                      </p>
                    </div>
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Settings Section */}
              <div className="admin-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <Settings size={24} style={{ color: '#B43F20' }} />
                  <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Настройки</h3>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="order" className="admin-form-label">Порядок отображения</label>
                  <input
                    type="number"
                    id="order"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="admin-form-input"
                    min={0}
                    style={{ maxWidth: '150px' }}
                  />
                  <small style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '6px' }}>
                    Меньшее число = выше в списке
                  </small>
                </div>

                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: formData.isActive ? 'rgba(76, 175, 80, 0.08)' : 'rgba(158, 158, 158, 0.08)',
                    borderRadius: '12px',
                    border: `2px solid ${formData.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(158, 158, 158, 0.3)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    {formData.isActive ? <Eye size={24} style={{ color: '#4caf50' }} /> : <EyeOff size={24} style={{ color: '#999' }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontWeight: '700', 
                        fontSize: '15px',
                        color: formData.isActive ? '#2e7d32' : '#666',
                        marginBottom: '2px'
                      }}>
                        {formData.isActive ? 'Слайд активен' : 'Слайд скрыт'}
                      </p>
                      <p style={{ fontSize: '13px', color: '#888' }}>
                        {formData.isActive ? 'Отображается на главной странице' : 'Не показывается посетителям'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#4caf50' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Desktop Content */}
              <div className="admin-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <Monitor size={24} style={{ color: '#B43F20' }} />
                  <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Контент для десктопа</h3>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="hashtag" className="admin-form-label">Хештег *</label>
                  <input
                    type="text"
                    id="hashtag"
                    value={formData.hashtag}
                    onChange={(e) => setFormData({ ...formData, hashtag: e.target.value })}
                    className="admin-form-input"
                    maxLength={50}
                    required
                    placeholder="#новинка"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="title" className="admin-form-label">Заголовок *</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="admin-form-input"
                    maxLength={200}
                    required
                    placeholder="Скидка 20% на все роллы"
                  />
                  <small style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '6px' }}>
                    {formData.title.length}/200 символов
                  </small>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="text" className="admin-form-label">Описание</label>
                  <textarea
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="admin-form-textarea"
                    maxLength={500}
                    rows={4}
                    placeholder="Дополнительная информация об акции или предложении..."
                  />
                  <small style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '6px' }}>
                    {formData.text.length}/500 символов
                  </small>
                </div>
              </div>

              {/* Mobile Content */}
              <div className="admin-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <Smartphone size={24} style={{ color: '#B43F20' }} />
                  <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Контент для мобильных</h3>
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(33, 150, 243, 0.08)',
                  borderRadius: '12px',
                  border: '2px solid rgba(33, 150, 243, 0.2)',
                  marginBottom: '20px',
                }}>
                  <p style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600', margin: 0 }}>
                    💡 Если не заполнено, будет использован контент для десктопа
                  </p>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="mobileTitle" className="admin-form-label">Мобильный заголовок</label>
                  <input
                    type="text"
                    id="mobileTitle"
                    value={formData.mobileTitle}
                    onChange={(e) => setFormData({ ...formData, mobileTitle: e.target.value })}
                    className="admin-form-input"
                    maxLength={200}
                    placeholder="Более короткий заголовок для мобильных..."
                  />
                  <small style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '6px' }}>
                    {formData.mobileTitle.length}/200 символов
                  </small>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="mobileText" className="admin-form-label">Мобильное описание</label>
                  <textarea
                    id="mobileText"
                    value={formData.mobileText}
                    onChange={(e) => setFormData({ ...formData, mobileText: e.target.value })}
                    className="admin-form-textarea"
                    maxLength={500}
                    rows={4}
                    placeholder="Краткое описание для мобильных устройств..."
                  />
                  <small style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '6px' }}>
                    {formData.mobileText.length}/500 символов
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div style={{
            position: 'sticky',
            bottom: '0',
            marginTop: '24px',
            padding: '20px 24px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            zIndex: 100,
          }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => navigate('/admin/hero-slides')}
              disabled={saving}
            >
              <X size={18} />
              Отмена
            </button>
            <button 
              type="submit" 
              className="admin-btn admin-btn-primary" 
              disabled={saving || (!imagePreview && !imageFile)}
            >
              <Save size={18} />
              {saving ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать слайд'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
