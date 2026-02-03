import { useEffect } from 'react';
import type { Product } from '../lib/api/products';
import { useCartStore } from '../store/cartStore';
import { addToast } from './Toast';
import { LazyImage } from './LazyImage';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount(product.id));
  const imageUrl = product.image?.original?.url || product.image?.thumbnail?.url || '';

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Блокируем скролл body
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleAddToCart = () => {
    addItem({ id: product.id, title: product.title, price: product.price }, 1);
    addToast(
      <span>
        <strong>{product.title}</strong> добавлено в корзину
      </span>,
      'success'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Кнопка закрытия */}
        <button className="product-modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="product-modal-layout">
          {/* Левая часть - изображение */}
          <div className="product-modal-image">
            <LazyImage src={imageUrl} alt={product.title} className="modal-image" />
          </div>

          {/* Правая часть - информация */}
          <div className="product-modal-info">
            <div className="product-modal-header">
              <h2 className="product-modal-title">{product.title}</h2>
              <span className="product-modal-gram">{product.gram}</span>
            </div>

            {product.description && (
              <div className="product-modal-description">
                <h3 className="product-modal-subtitle">Состав:</h3>
                <p className="product-modal-text">{product.description}</p>
              </div>
            )}

            <div className="product-modal-footer">
              <button
                className="product-modal-btn"
                onClick={handleAddToCart}
                type="button"
              >
                <span>{product.price} ₽</span>
                {itemCount === 0 && <span style={{ marginLeft: '6px' }}>+</span>}
                {itemCount > 0 && (
                  <div className="number-container show">
                    <p className="number">{itemCount}</p>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
