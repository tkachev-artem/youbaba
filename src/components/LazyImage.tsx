import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
}

/**
 * Компонент для ленивой загрузки изображений
 * Использует Intersection Observer для загрузки только видимых изображений
 */
export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
  onLoad
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    // Используем Intersection Observer для определения видимости
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Элемент стал видимым - начинаем загрузку
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        // Начинаем загрузку за 200px до того, как изображение попадёт в viewport
        rootMargin: '200px',
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'lazy-loaded' : 'lazy-loading'}`}
      onLoad={handleLoad}
      loading="lazy"
    />
  );
}
