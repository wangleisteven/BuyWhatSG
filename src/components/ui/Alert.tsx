import type { ReactNode } from 'react';
import { FiX, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import './Alert.css';

type AlertType = 'info' | 'success' | 'warning' | 'error';

type AlertProps = {
  type?: AlertType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode;
};

const Alert = ({
  type = 'info',
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  children
}: AlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle />;
      case 'warning':
        return <FiAlertTriangle />;
      case 'error':
        return <FiAlertTriangle />;
      default:
        return <FiInfo />;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="alert-overlay" onClick={handleBackdropClick}>
      <div className={`alert-modal alert-${type}`}>
        <div className="alert-header">
          <div className="alert-icon">
            {getIcon()}
          </div>
          {title && <h3 className="alert-title">{title}</h3>}
          {onCancel && (
            <button 
              className="alert-close"
              onClick={onCancel}
              aria-label="Close"
            >
              <FiX />
            </button>
          )}
        </div>
        
        <div className="alert-content">
          <p className="alert-message">{message}</p>
          {children}
        </div>
        
        <div className="alert-actions">
          {onCancel && (
            <button 
              className="button-outline"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button 
              className={`button-primary ${type === 'error' ? 'danger' : ''}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alert;