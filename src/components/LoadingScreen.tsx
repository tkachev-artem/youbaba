import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Ждём загрузки критических ресурсов
    const checkLoaded = () => {
      if (document.readyState === 'complete') {
        // Небольшая задержка для плавности
        setTimeout(() => {
          setIsLoaded(true);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 500); // Время на fade-out анимацию
        }, 300);
      }
    };

    if (document.readyState === 'complete') {
      checkLoaded();
    } else {
      window.addEventListener('load', checkLoaded);
      return () => window.removeEventListener('load', checkLoaded);
    }
  }, [onLoadingComplete]);

  if (isLoaded) {
    return null;
  }

  return (
    <div className={`loading-screen ${isLoaded ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="logo-container">
          <img 
            src="/Images/Icons/LOGO.png" 
            alt="YouBaBa Logo" 
            className="loading-logo"
          />
        </div>
        <div className="loading-spinner">
          <LoaderCircle className="spinner-icon" />
        </div>
        <p className="loading-text">Загружаем вкусности...</p>
      </div>
    </div>
  );
}
