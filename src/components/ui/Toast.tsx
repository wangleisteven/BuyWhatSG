import { useEffect } from 'react';
import { FiX, FiInfo, FiCheck, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import './Toast.css';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: string;
  onAction?: () => void;
  onClose: () => void;
};

const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  action,
  onAction,
  onClose
}: ToastProps) => {
  // Auto-close toast after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  // Get icon based on toast type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck size={20} />;
      case 'error':
        return <FiAlertCircle size={20} />;
      case 'warning':
        return <FiAlertTriangle size={20} />;
      case 'info':
      default:
        return <FiInfo size={20} />;
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {getIcon()}
      </div>
      
      <div className="toast-content">
        <div className="toast-message">{message}</div>
        
        {action && onAction && (
          <button 
            className="toast-action"
            onClick={onAction}
          >
            {action}
          </button>
        )}
      </div>
      
      <button 
        className="toast-close"
        onClick={onClose}
        aria-label="Close toast"
      >
        <FiX size={18} />
      </button>
    </div>
  );
};

export default Toast;