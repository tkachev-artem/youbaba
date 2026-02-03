import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Route, Coins } from 'lucide-react';
import { searchAddressSuggestions, calculateDelivery, type AddressSuggestion, type DeliveryResult } from '../lib/deliveryService';
import { addToast } from './Toast';

interface AddressSearchProps {
  onAddressSelect: (result: DeliveryResult) => void;
  initialValue?: string;
}

export function AddressSearch({ onAddressSelect, initialValue = '' }: AddressSearchProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userInteracted = useRef(false);

  // Обновляем inputValue когда меняется initialValue (загрузка из localStorage)
  useEffect(() => {
    if (initialValue && !userInteracted.current) {
      setInputValue(initialValue);
    }
  }, [initialValue]);

  // Поиск подсказок с debounce
  useEffect(() => {
    // Показываем подсказки только если пользователь взаимодействовал с полем
    if (!userInteracted.current) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!inputValue || inputValue.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔍 Поиск:', inputValue);
        const results = await searchAddressSuggestions(inputValue);
        console.log('✅ Результаты:', results);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('❌ Ошибка:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [inputValue]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    // Сразу скрываем подсказки и отключаем режим взаимодействия
    setShowSuggestions(false);
    setSuggestions([]);
    userInteracted.current = false; // Отключаем поиск подсказок
    setInputValue(suggestion.address);
    setIsLoading(true);

    try {
      const result = await calculateDelivery(suggestion.address);
      if (result) {
        onAddressSelect(result);
        
        // Показываем Toast с информацией о доставке
        addToast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <MapPin size={16} style={{ color: '#B43F20' }} />
              {result.address}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <Route size={16} style={{ color: '#666' }} />
              Расстояние: {result.distance} км
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              <Coins size={16} style={{ color: result.isFree ? '#4caf50' : '#B43F20' }} />
              Стоимость доставки: {result.isFree ? 'Бесплатно' : `${result.cost}\u00A0₽`}
            </div>
          </div>,
          'delivery'
        );
      }
    } catch (error) {
      console.error('Ошибка расчёта доставки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const result = await calculateDelivery(inputValue.trim());
      if (result) {
        onAddressSelect(result);
        
        // Показываем Toast с информацией о доставке
        addToast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <MapPin size={16} style={{ color: '#B43F20' }} />
              {result.address}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <Route size={16} style={{ color: '#666' }} />
              Расстояние: {result.distance} км
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              <Coins size={16} style={{ color: result.isFree ? '#4caf50' : '#B43F20' }} />
              Стоимость доставки: {result.isFree ? 'Бесплатно' : `${result.cost}\u00A0₽`}
            </div>
          </div>,
          'delivery'
        );
      }
    } catch (error) {
      console.error('Ошибка расчёта доставки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      {/* Поле ввода */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Введите адрес доставки"
          value={inputValue}
          onChange={(e) => {
            userInteracted.current = true;
            setInputValue(e.target.value);
          }}
          onFocus={() => {
            userInteracted.current = true;
          }}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '15px 50px 15px 20px',
            border: '2px solid #e0e0e0',
            borderRadius: '25px',
            fontSize: '16px',
            outline: 'none',
            background: 'white'
          }}
        />
        <button
          className="search-btn"
          type="button"
          onClick={handleSearch}
          disabled={isLoading}
          style={{
            position: 'absolute',
            right: '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#B43F20',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </button>
      </div>

      {/* Подсказки */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '5px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '15px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 10000
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(suggestion);
              }}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8f8f8'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontWeight: 500, color: '#333', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} style={{ color: '#B43F20', flexShrink: 0 }} />
                {suggestion.address}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                {suggestion.displayName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
