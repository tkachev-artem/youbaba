import { useCartStore } from '../store/cartStore';
import type { Product } from '../lib/api/products';
import { useEffect, useRef, useState } from 'react';
import { addToast } from './Toast';
import { LazyImage } from './LazyImage';
import { ProductModal } from './ProductModal';
import { Search, Zap } from 'lucide-react';

export function ProductCard({ product }: { product: Product }) {
  // Получаем URL изображения (используем thumbnail для каталога)
  const imageUrl = product.image?.thumbnail?.url || product.image?.original?.url || '';
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount(product.id));
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOneLine, setIsOneLine] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!titleRef.current) return;

    const checkLineCount = () => {
      const element = titleRef.current;
      if (!element) return;

      // Создаем временный клон элемента без ограничений для проверки
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.pointerEvents = 'none';
      clone.style.top = '0';
      clone.style.left = '0';
      // Убираем -webkit-line-clamp и overflow для истинной высоты
      clone.style.display = 'block';
      clone.style.whiteSpace = 'normal';
      clone.style.overflow = 'visible';
      clone.style.webkitLineClamp = 'unset';
      clone.style.maxHeight = 'none';
      
      // Устанавливаем width как у оригинального элемента
      clone.style.width = element.offsetWidth + 'px';
      
      document.body.appendChild(clone);

      // Получаем высоту строки более надежным способом
      let lineHeight = parseInt(window.getComputedStyle(clone).lineHeight);
      if (isNaN(lineHeight)) {
        // Если lineHeight = "normal", вычисляем на основе font-size
        const fontSize = parseInt(window.getComputedStyle(clone).fontSize);
        lineHeight = Math.ceil(fontSize * 1.2); // 1.2 - типичный коэффициент для normal
      }

      const actualHeight = clone.scrollHeight;
      
      // Определяем количество строк по соотношению высоты к высоте одной строки
      const calculatedLineCount = Math.round(actualHeight / lineHeight);
      // Если только одна строка
      if (calculatedLineCount === 1) {
        setIsOneLine(true);
      } else {
        setIsOneLine(false);
      }

      // Удаляем клон
      document.body.removeChild(clone);
    };

    // Проверяем после небольшой задержки для загрузки шрифтов
    const timer = setTimeout(checkLineCount, 100);

    return () => clearTimeout(timer);
  }, [product.title]);

  const handleAddToCart = () => {
    // Добавляем товар в корзину
    addItem({ id: product.id, title: product.title, price: product.price, image: imageUrl }, 1);

    // Показываем toast уведомление с жирным названием продукта
    addToast(
      <span>
        <strong>{product.title}</strong> добавлено в корзину
      </span>,
      'success'
    );

    // Запускаем анимацию пульса на кнопке
    const button = buttonRef.current;
    if (button) {
      // Добавляем класс для анимации
      button.classList.add('added');
      
      // Удаляем класс после окончания анимации
      setTimeout(() => {
        button.classList.remove('added');
      }, 500);
    }

    // Создаём ripple эффект
    if (button) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.position = 'absolute';
      ripple.style.top = '50%';
      ripple.style.left = '50%';
      ripple.style.width = '0';
      ripple.style.height = '0';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.5)';
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.pointerEvents = 'none';
      ripple.style.animation = 'rippleEffect 0.6s ease-out';
      
      button.appendChild(ripple);
      
      // Удаляем ripple после анимации
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  };

  return (
    <>
      <div className="product-panel">
        {/* Бейдж для популярных товаров */}
        {product.isFeatured && (
          <div className="featured-badge">
            <Zap size={16} fill="white" color="white" />
          </div>
        )}
        
        <div className="product-panel-image" onClick={() => setIsModalOpen(true)}>
          <LazyImage src={imageUrl} alt={product.title} className="product-image" />
          <div className="product-image-overlay">
            <div className="product-image-icon">
              <Search size={24} />
            </div>
          </div>
        </div>
      <div className="product-panel-info">
        <div 
          className={`product-panel-title-container ${isOneLine ? 'one-line' : ''}`}
          ref={containerRef}
        >
          <h1 className="product-panel-title" ref={titleRef}>{product.title}</h1>
          <p className="product-panel-gram">{product.gram}</p>
        </div>
        <p className="procut-text">{product.description}</p>
        <div className="product-btn-container">
          {/* 1-в-1: внешне кнопка такая же как в HTML */}
          <button
            className="product-btn"
            data-price={product.price}
            data-product={product.title}
            onClick={handleAddToCart}
            type="button"
            ref={buttonRef}
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

      {/* Модальное окно */}
      <ProductModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
