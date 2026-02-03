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
}

/**
 * Компонент модального диалога подтверждения для админки
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
}: ConfirmDialogProps) {
  if (!isOpen) return null;

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
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
