import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeroSlidesStore } from '../store/heroSlidesStore';

const AUTOPLAY_MS = 15000; // реже, чтобы не раздражало
const TRANSITION_MS = 600;

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpointPx);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpointPx);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpointPx]);

  return isMobile;
}

export function HeroSlider() {
  const isMobile = useIsMobile(768);
  const { slides, loading, fetchSlides } = useHeroSlidesStore();
  
  const [index, setIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Фоновые слои
  const [currentBg, setCurrentBg] = useState<string>('');
  const [nextBg, setNextBg] = useState<string>('');
  const [showNext, setShowNext] = useState(false);

  // Инициализация слайдов при первой загрузке
  useEffect(() => {
    if (slides.length > 0 && !isInitialized) {
      setIndex(0);
      setCurrentBg(slides[0]?.bgImage?.url ?? '');
      setIsInitialized(true);
    }
  }, [slides, isInitialized]);

  // Загружаем слайды при монтировании компонента
  useEffect(() => {
    fetchSlides();
    
    // Периодическая проверка обновлений каждые 5 минут
    const intervalId = setInterval(() => {
      fetchSlides(true);
    }, 5 * 60 * 1000);
    
    // Проверка обновлений при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSlides(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускаем только один раз при монтировании

  const autoplayRef = useRef<number | null>(null);
  const nextLayerRef = useRef<HTMLDivElement | null>(null);

  const resolved = useMemo(() => {
    const s = slides[index];
    if (!s) {
      return { bgImage: '', hashtag: '', title: '', text: '', imagePosition: { positionX: 50, positionY: 50 } };
    }
    return {
      bgImage: s.bgImage?.url || '',
      hashtag: s.hashtag,
      title: isMobile ? s.mobileTitle ?? s.title : s.title,
      text: isMobile ? s.mobileText ?? s.text : s.text,
      imagePosition: s.imagePosition || { positionX: 50, positionY: 50 }
    };
  }, [index, isMobile, slides]);

  // Прогрессивная загрузка: текущая + следующая сразу, остальные в idle
  // Добавлена поддержка низкокачественных placeholder'ов для крупных изображений
  useEffect(() => {
    if (slides.length === 0) return;

    const preload = (src: string, priority: 'high' | 'low' = 'low') => {
      if (!src) return;
      
      // Для больших изображений используем progressive loading
      const img = new Image();
      img.decoding = 'async';
      
      // Высокоприоритетные изображения загружаем немедленно
      if (priority === 'high') {
        img.fetchPriority = 'high' as any;
      } else {
        img.fetchPriority = 'low' as any;
      }
      
      img.src = src;
    };

    // Текущее изображение - высокий приоритет
    preload(slides[index]?.bgImage?.url, 'high');
    // Следующее - средний приоритет
    preload(slides[(index + 1) % slides.length]?.bgImage?.url, 'high');

    const rest = slides
      .map((s) => s.bgImage?.url)
      .filter((src) => src && src !== slides[index]?.bgImage?.url && src !== slides[(index + 1) % slides.length]?.bgImage?.url);

    let cancelled = false;
    let i = 0;

    const schedule = (cb: () => void) => {
      const ric = (window as any).requestIdleCallback as undefined | ((fn: () => void) => number);
      if (ric) return ric(cb);
      return window.setTimeout(cb, 250);
    };

    const tick = () => {
      if (cancelled) return;
      const src = rest[i++];
      if (src) preload(src, 'low');
      if (i < rest.length) schedule(tick);
    };

    schedule(tick);

    return () => {
      cancelled = true;
    };
  }, [slides, index]);

  const startAutoplay = () => {
    if (slides.length <= 1) return;
    if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    autoplayRef.current = window.setInterval(() => {
      setIndex((prev) => {
        // Используем callback чтобы получить актуальную длину
        const slidesCount = useHeroSlidesStore.getState().slides.length;
        return (prev + 1) % slidesCount;
      });
    }, AUTOPLAY_MS);
  };

  useEffect(() => {
    if (!isInitialized || slides.length === 0) return;
    
    startAutoplay();
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // Когда меняется index — запускаем fade фона
  useEffect(() => {
    if (!isInitialized || slides.length === 0) return;
    
    const target = slides[index]?.bgImage?.url ?? '';
    if (!target) return;

    // если первый рендер
    if (!currentBg) {
      setCurrentBg(target);
      return;
    }

    if (target === currentBg) return;

    setNextBg(target);
    setShowNext(false);

    // В следующий кадр включаем видимость next слоя, чтобы transition гарантированно сработал
    requestAnimationFrame(() => {
      setShowNext(true);
    });
  }, [index, slides, currentBg, isInitialized]);

  const onNextTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return;
    if (!showNext) return;

    // Закрепляем фон
    setCurrentBg(nextBg);
    setNextBg('');
    setShowNext(false);
  };

  const goPrev = () => {
    if (slides.length <= 1) return;
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    if (slides.length <= 1) return;
    setIndex((prev) => (prev + 1) % slides.length);
  };

  // Свайп для мобильных
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goNext();
    }
    if (isRightSwipe) {
      goPrev();
    }
  };

  // Показываем лоадер пока загружаются слайды
  if (loading) {
    return (
      <>
        <div className="hero-bg-container" aria-hidden>
          <div className="hero-bg" style={{ backgroundColor: '#1a1a1a' }}>
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '18px'
            }}>
              Загрузка слайдов...
            </div>
          </div>
        </div>
        <div className="hero-text-container">
          <div className="hero-text-inner">
            <div className="hero-heshtag-container">
              <p className="hero-heshtag">Загрузка...</p>
            </div>
            <h1 className="hero-title">Загрузка слайдов</h1>
            <p className="hero-text">Пожалуйста, подождите</p>
          </div>
        </div>
      </>
    );
  }

  // Если слайдов нет после загрузки
  if (slides.length === 0) {
    return (
      <>
        <div className="hero-bg-container" aria-hidden>
          <div className="hero-bg" style={{ backgroundColor: '#1a1a1a' }} />
        </div>
        <div className="hero-text-container">
          <div className="hero-text-inner">
            <div className="hero-heshtag-container">
              <p className="hero-heshtag">YouBaBa</p>
            </div>
            <h1 className="hero-title">Добро пожаловать!</h1>
            <p className="hero-text">Слайды в процессе настройки</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div 
        className="hero-bg-container" 
        aria-hidden
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="hero-bg" style={{ ['--hero-fade-ms' as any]: `${TRANSITION_MS}ms` }}>
          <div 
            className="hero-bg-layer hero-bg-layer--current" 
            style={{ 
              backgroundImage: `url('${currentBg}')`,
              backgroundPosition: `${resolved.imagePosition.positionX ?? 50}% ${resolved.imagePosition.positionY ?? 50}%`
            }} 
          />
          <div
            ref={nextLayerRef}
            className={'hero-bg-layer hero-bg-layer--next' + (showNext ? ' is-visible' : '')}
            style={{ 
              backgroundImage: `url('${nextBg || currentBg}')`,
              backgroundPosition: `${resolved.imagePosition.positionX ?? 50}% ${resolved.imagePosition.positionY ?? 50}%`
            }}
            onTransitionEnd={onNextTransitionEnd}
          />
        </div>
      </div>

      <div 
        className="hero-text-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="hero-text-inner">
          <div className="hero-heshtag-container">
            <p className="hero-heshtag">{resolved.hashtag}</p>
            <div className="hero-nav-container">
              <button className="hero-nav-btn" type="button" aria-label="Предыдущий слайд" onClick={goPrev}>
                <img src="/Images/Icons/Chevron_Left.png" alt="" className="hero-nav-image" />
              </button>
              <button className="hero-nav-btn" id="right-arrow" type="button" aria-label="Следующий слайд" onClick={goNext}>
                <img src="/Images/Icons/Chevron_Left.png" alt="" className="hero-nav-image" />
              </button>
            </div>
          </div>

          <h1 className="hero-title">{resolved.title}</h1>
          <p className="hero-text">{resolved.text}</p>
        </div>
        
        {/* Индикаторы слайдов (точки) - в самом низу */}
        {slides.length > 1 && (
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hero-dot ${i === index ? 'hero-dot--active' : ''}`}
                aria-label={`Перейти к слайду ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
