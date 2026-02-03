import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  getAllHeroSlides,
  deleteHeroSlide,
  reorderHeroSlides,
  HeroSlide,
} from '../../lib/api/heroSlides';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import '../../styles/admin.css';

export function HeroSlidesPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    slideId: string;
    slideTitle: string;
  }>({
    isOpen: false,
    slideId: '',
    slideTitle: '',
  });

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getAllHeroSlides(token);
      setSlides(data);
    } catch (err) {
      console.error('Failed to load slides:', err);
      setError('Не удалось загрузить слайды');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      slideId: id,
      slideTitle: title,
    });
  };

  const handleDeleteConfirm = async () => {
    const { slideId } = confirmDialog;
    if (!token) return;
    
    setConfirmDialog({ isOpen: false, slideId: '', slideTitle: '' });
    
    try {
      await deleteHeroSlide(slideId, token);
      setSlides(slides.filter((s) => s._id !== slideId));
    } catch (err) {
      console.error('Failed to delete slide:', err);
      setError('Ошибка при удалении слайда');
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDialog({ isOpen: false, slideId: '', slideTitle: '' });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !token) return;

    const newSlides = [...slides];
    [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];

    // Обновляем order
    const updates = newSlides.map((slide, idx) => ({
      id: slide._id,
      order: idx,
    }));

    try {
      await reorderHeroSlides(updates, token);
      setSlides(newSlides);
    } catch (err) {
      console.error('Failed to reorder slides:', err);
      alert('Ошибка при изменении порядка');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === slides.length - 1 || !token) return;

    const newSlides = [...slides];
    [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];

    const updates = newSlides.map((slide, idx) => ({
      id: slide._id,
      order: idx,
    }));

    try {
      await reorderHeroSlides(updates, token);
      setSlides(newSlides);
    } catch (err) {
      console.error('Failed to reorder slides:', err);
      alert('Ошибка при изменении порядка');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p className="admin-loading-text">Загрузка слайдов...</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      <div className="admin-flex-between">
        <p style={{ color: '#666', fontSize: '14px' }}>
          Всего слайдов: <strong>{slides.length}</strong>
        </p>
        <Link
          to="/admin/hero-slides/new"
          className="admin-btn admin-btn-primary"
        >
          <Plus size={18} />
          Добавить слайд
        </Link>
      </div>

      {slides.length === 0 ? (
        <div className="admin-section" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#999', fontSize: '16px', marginBottom: '20px' }}>
            Нет слайдов. Создайте первый слайд!
          </p>
          <Link
            to="/admin/hero-slides/new"
            className="admin-btn admin-btn-primary"
          >
            <Plus size={18} />
            Добавить первый слайд
          </Link>
        </div>
      ) : (
        <div className="admin-grid">
          {slides.map((slide, index) => (
            <div key={slide._id} className="admin-hero-card" style={{
              border: !slide.isActive ? '2px solid #f44336' : 'none',
            }}>
              <img
                src={slide.bgImage.thumbnailUrl}
                alt={slide.title}
                className="admin-hero-card-image"
                style={{
                  objectPosition: slide.imagePosition?.objectPosition || 'center',
                }}
              />

              <div className="admin-hero-card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#888', fontWeight: '600' }}>
                    Порядок: {index + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(index);
                      }}
                      disabled={index === 0}
                      className="admin-btn-icon"
                      style={{ width: '32px', height: '32px' }}
                      title="Переместить вверх"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(index);
                      }}
                      disabled={index === slides.length - 1}
                      className="admin-btn-icon"
                      style={{ width: '32px', height: '32px' }}
                      title="Переместить вниз"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#B43F20', fontWeight: '700', marginBottom: '6px' }}>
                  {slide.hashtag}
                </div>
                <h3 className="admin-hero-card-title">{slide.title}</h3>
                {slide.text && (
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', lineHeight: '1.4' }}>
                    {slide.text}
                  </p>
                )}

                <div className={`admin-badge ${slide.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`} style={{ marginBottom: '12px' }}>
                  {slide.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  {slide.isActive ? 'Активен' : 'Скрыт'}
                </div>

                <div className="admin-hero-card-actions">
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => navigate(`/admin/hero-slides/edit/${slide._id}`)}
                    style={{ flex: 1 }}
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button
                    className="admin-btn-icon delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(slide._id, slide.title);
                    }}
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Удаление слайда"
        message={`Вы уверены, что хотите удалить слайд "${confirmDialog.slideTitle}"? Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
      />
    </>
  );
}
