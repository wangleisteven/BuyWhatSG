import { useState, useEffect } from 'react';
import Toast from './Toast';
import type { ToastData } from '../../types/toast';
import './ToastContainer.css';

type ToastContainerProps = {
  toasts: ToastData[];
  removeToast: (id: string) => void;
};

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  const [visibleToasts, setVisibleToasts] = useState<ToastData[]>([]);

  // Update visible toasts when toasts prop changes
  useEffect(() => {
    setVisibleToasts(toasts);
  }, [toasts]);

  // Handle toast close
  const handleClose = (id: string) => {
    // First update state to trigger animation
    setVisibleToasts(prev => prev.filter(toast => toast.id !== id));
    
    // Then remove from parent after animation completes
    setTimeout(() => {
      removeToast(id);
    }, 300); // Match animation duration
  };

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="toast-wrapper">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            action={toast.action}
            onAction={toast.onAction ? () => {
              toast.onAction?.();
              handleClose(toast.id);
            } : undefined}
            onClose={() => handleClose(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;