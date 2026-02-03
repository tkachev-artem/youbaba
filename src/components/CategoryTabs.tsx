import { useEffect, useRef, useState } from 'react';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function CategoryTabs({ categories, selectedCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const rafRef = useRef<number>();

  // Проверяем, нужен ли скролл-бар
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const needsScroll = container.scrollWidth > container.clientWidth;
      setShowScrollbar(needsScroll);
      setScrollWidth(container.scrollWidth);
      setClientWidth(container.clientWidth);
    };

    // Проверяем сразу и с небольшой задержкой для надёжности
    checkScroll();
    const timeoutId = setTimeout(checkScroll, 100);
    
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timeoutId);
    };
  }, [categories]);

  // Отслеживаем скролл с оптимизацией через RAF
  const handleScroll = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      setScrollLeft(container.scrollLeft);
    });
  };

  // Очистка RAF при размонтировании
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Вычисляем позицию и ширину скролл-бара (уменьшен в 2 раза)
  const scrollbarWidth = clientWidth > 0 ? ((clientWidth / scrollWidth) * 100) / 2 : 0;
  const scrollbarLeft = scrollWidth > clientWidth ? (scrollLeft / (scrollWidth - clientWidth)) * (100 - scrollbarWidth) : 0;

  return (
    <div className="category-tabs-container">
      <div className="category-tabs-panel">
        <div 
          className="category-tabs-scroll" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className="category-tabs-buttons">
            <button
              className={`category-tab-btn ${selectedCategory === null ? 'active' : ''}`}
              type="button"
              onClick={() => onCategoryChange(null)}
            >
              Все товары
            </button>

            {categories.map((category) => (
              <button
                key={category}
                className={`category-tab-btn ${selectedCategory === category ? 'active' : ''}`}
                type="button"
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Кастомный скролл-бар */}
        {showScrollbar && (
          <div className="category-tabs-scrollbar">
            <div 
              className="category-tabs-scrollbar-thumb"
              style={{
                width: `${scrollbarWidth}%`,
                left: `${scrollbarLeft}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
