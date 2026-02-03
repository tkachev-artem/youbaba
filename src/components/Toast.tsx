import { useEffect, useState, ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface ToastMessage {
  id: string;
  text: string | ReactNode;
  type: 'success' | 'warning' | 'error' | 'delivery';
  duration: number;
  startTime: number;
}

let toastId = 0;
const toasts: ToastMessage[] = [];
const listeners: ((toasts: ToastMessage[]) => void)[] = [];

export function addToast(text: string | ReactNode, type: 'success' | 'warning' | 'error' | 'delivery' = 'success') {
  const id = `toast-${toastId++}`;
  const duration = type === 'warning' ? 8000 : type === 'delivery' ? 10000 : 5000;
  const toast: ToastMessage = { id, text, type, duration, startTime: Date.now() };
  toasts.push(toast);
  listeners.forEach(listener => listener([...toasts]));

  // Автоматически удаляем тост через время
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function removeToast(id: string) {
  const index = toasts.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.splice(index, 1);
    listeners.forEach(listener => listener([...toasts]));
  }
}

export function Toast() {
  const [toastList, setToastList] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.push(setToastList);
    return () => {
      const index = listeners.indexOf(setToastList);
      if (index !== -1) listeners.splice(index, 1);
    };
  }, []);

  return (
    <div className="toast-container">
      {toastList.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{
            animation: 'slideInRight 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          role="alert"
        >
          {toast.type === 'success' && (
            <Plus size={20} color="#B43F20" style={{ flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>{toast.text}</div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            type="button"
            aria-label="Закрыть уведомление"
          >
            ×
          </button>
          <div
            className={`toast-progress toast-progress-${toast.type}`}
            style={{
              animation: `progressBar ${toast.duration}ms linear forwards`
            }}
          />
        </div>
      ))}
    </div>
  );
}
