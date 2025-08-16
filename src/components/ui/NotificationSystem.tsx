import React, { useEffect } from 'react';
import { FiX, FiInfo, FiCheck, FiAlertTriangle, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import type { ToastData, AlertType, AlertOptions } from '../../types';
import './NotificationSystem.css';

// Unified notification types
type NotificationType = 'toast' | 'alert';

type NotificationData = {
  id: string;
  type: NotificationType;
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: string;
  onAction?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isModal?: boolean;
};

type NotificationProps = {
  notification: NotificationData;
  onClose: (id: string) => void;
};

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const {
    id,
    type,
    variant,
    title,
    message,
    duration = 5000,
    action,
    onAction,
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
    isModal = false
  } = notification;

  // Auto-close for toasts
  useEffect(() => {
    if (type === 'toast' && duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [id, type, duration, onClose]);

  // Get icon based on variant
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return type === 'alert' ? <FiCheckCircle size={20} /> : <FiCheck size={20} />;
      case 'error':
        return <FiAlertCircle size={20} />;
      case 'warning':
        return <FiAlertTriangle size={20} />;
      default:
        return <FiInfo size={20} />;
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose(id);
  };

  const handleCancel = () => {
    onCancel?.();
    onClose(id);
  };

  const handleAction = () => {
    onAction?.();
    onClose(id);
  };

  if (type === 'alert') {
    return (
      <>
        {isModal && <div className="notification-overlay" onClick={handleCancel} />}
        <div className={`notification notification--alert notification--${variant} ${isModal ? 'notification--modal' : ''}`}>
          <div className="notification__header">
            <div className="notification__icon">
              {getIcon()}
            </div>
            {title && <h4 className="notification__title">{title}</h4>}
            {!isModal && (
              <button 
                onClick={() => onClose(id)} 
                className="notification__close"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            )}
          </div>
          
          <div className="notification__content">
            <p className="notification__message">{message}</p>
          </div>
          
          <div className="notification__actions">
            {onCancel && (
              <button 
                onClick={handleCancel}
                className="notification__button notification__button--secondary"
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={handleConfirm}
              className="notification__button notification__button--primary"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Toast notification
  return (
    <div className={`notification notification--toast notification--${variant}`}>
      <div className="notification__icon">
        {getIcon()}
      </div>
      
      <div className="notification__content">
        {title && <h5 className="notification__title">{title}</h5>}
        <p className="notification__message">{message}</p>
      </div>
      
      <div className="notification__actions">
        {action && onAction && (
          <button 
            onClick={handleAction}
            className="notification__action-button"
          >
            {action}
          </button>
        )}
        <button 
          onClick={() => onClose(id)}
          className="notification__close"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
};

// Container component
type NotificationContainerProps = {
  notifications: NotificationData[];
  removeNotification: (id: string) => void;
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  removeNotification
}) => {
  const toasts = notifications.filter(n => n.type === 'toast');
  const alerts = notifications.filter(n => n.type === 'alert');

  return (
    <>
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="notification-container notification-container--toasts">
          {toasts.map(notification => (
            <Notification
              key={notification.id}
              notification={notification}
              onClose={removeNotification}
            />
          ))}
        </div>
      )}
      
      {/* Alert Container */}
      {alerts.map(notification => (
        <Notification
          key={notification.id}
          notification={{ ...notification, isModal: true }}
          onClose={removeNotification}
        />
      ))}
    </>
  );
};

export type { NotificationData, NotificationType };
export default Notification;