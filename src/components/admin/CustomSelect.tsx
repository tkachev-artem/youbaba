import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
}

/**
 * Кастомный выпадающий список для админки
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  label,
  required = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="custom-select-container" ref={containerRef}>
      {label && (
        <label className="custom-select-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      
      <div
        className={`custom-select ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="custom-select-value">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="custom-select-icon">{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="custom-select-placeholder">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`}
        />
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon && <span className="custom-select-option-icon">{option.icon}</span>}
              <span className="custom-select-option-label">{option.label}</span>
              {value === option.value && (
                <Check size={18} className="custom-select-option-check" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
