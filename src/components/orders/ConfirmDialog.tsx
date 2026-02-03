import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger';
  needsInput?: boolean;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

/**
 * Компонент модального диалога подтверждения
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  type = 'default',
  needsInput = false,
  inputPlaceholder = '',
  inputValue = '',
  onInputChange,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (needsInput && !inputValue.trim()) return;
    onConfirm();
  };

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <h3 className="confirm-dialog-title">{title}</h3>
          <button className="confirm-dialog-close" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
          
          {needsInput && onInputChange && (
            <input
              type="text"
              className="confirm-dialog-input"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              autoFocus
            />
          )}
        </div>

        <div className="confirm-dialog-footer">
          <button
            className="confirm-dialog-btn confirm-dialog-btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-dialog-btn confirm-dialog-btn-confirm ${
              type === 'danger' ? 'danger' : ''
            }`}
            onClick={handleConfirm}
            disabled={needsInput && !inputValue.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
