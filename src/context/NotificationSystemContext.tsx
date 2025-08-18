import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { generateId } from '../utils';
import type { NotificationData } from '../components/ui/NotificationSystem';
import type { AlertOptions } from '../types';

type NotificationContextType = {
  notifications: NotificationData[];
  addToast: (toast: Omit<NotificationData, 'id' | 'type'>) => string;
  addAlert: (alert: Omit<NotificationData, 'id' | 'type'>) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<boolean>;
  showConfirm: (options: AlertOptions) => Promise<boolean>;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type NotificationProviderProps = {
  children: ReactNode;
};

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [_alertResolvers, setAlertResolvers] = useState<Map<string, (value: boolean) => void>>(new Map());

  // Add a toast notification
  const addToast = useCallback((toast: Omit<NotificationData, 'id' | 'type'>) => {
    // Check if a toast with the same message already exists
    const existingToast = notifications.find(n => 
      n.type === 'toast' && n.message === toast.message
    );
    
    if (existingToast) {
      return existingToast.id;
    }
    
    const id = generateId();
    const newToast: NotificationData = { 
      ...toast, 
      id, 
      type: 'toast',
      variant: toast.variant || 'info'
    };
    
    setNotifications(prev => [...prev, newToast]);
    return id;
  }, [notifications]);

  // Add an alert notification
  const addAlert = useCallback((alert: Omit<NotificationData, 'id' | 'type'>) => {
    return new Promise<boolean>((resolve) => {
      const id = generateId();
      const newAlert: NotificationData = { 
        ...alert, 
        id, 
        type: 'alert',
        variant: alert.variant || 'info'
      };
      
      // Store the resolver
      setAlertResolvers(prev => new Map(prev).set(id, resolve));
      
      // Add the alert
      setNotifications(prev => [...prev, newAlert]);
    });
  }, []);

  // Show a simple alert
  const showAlert = useCallback((options: AlertOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = generateId();
      const newAlert: NotificationData = {
        variant: options.type || 'info',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'OK',
        onConfirm: () => true,
        id,
        type: 'alert'
      };
      
      // Store the resolver
      setAlertResolvers(prev => new Map(prev).set(id, resolve));
      
      // Add the alert
      setNotifications(prev => [...prev, newAlert]);
    });
  }, []);

  // Show a confirmation dialog
  const showConfirm = useCallback((options: AlertOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = generateId();
      const newAlert: NotificationData = {
        variant: options.type || 'info',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => true,
        onCancel: () => false,
        id,
        type: 'alert'
      };
      
      // Store the resolver
      setAlertResolvers(prev => new Map(prev).set(id, resolve));
      
      // Add the alert
      setNotifications(prev => [...prev, newAlert]);
    });
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      
      // If it's an alert, resolve the promise
      if (notification?.type === 'alert') {
        setAlertResolvers(currentResolvers => {
          const resolver = currentResolvers.get(id);
          if (resolver) {
            // Determine the result based on which action was taken
            const result = notification.onConfirm ? true : false;
            resolver(result);
          }
          
          // Clean up the resolver
          const newMap = new Map(currentResolvers);
          newMap.delete(id);
          return newMap;
        });
      }
      
      return prev.filter(n => n.id !== id);
    });
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    // Resolve all pending alerts with false
    setAlertResolvers(currentResolvers => {
      currentResolvers.forEach(resolver => resolver(false));
      return new Map();
    });
    setNotifications([]);
  }, []);

  const value: NotificationContextType = useMemo(() => ({
    notifications,
    addToast,
    addAlert,
    showAlert,
    showConfirm,
    removeNotification,
    clearNotifications
  }), [notifications, addToast, addAlert, showAlert, showConfirm, removeNotification, clearNotifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationSystem = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationSystem must be used within a NotificationProvider');
  }
  return context;
};

// Convenience hooks for backward compatibility
export const useToast = () => {
  const { addToast } = useNotificationSystem();
  
  return {
    addToast: (toast: { message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number; action?: string; onAction?: () => void }) => {
      return addToast({
        variant: toast.type || 'info',
        message: toast.message,
        duration: toast.duration,
        action: toast.action,
        onAction: toast.onAction
      });
    }
  };
};

export const useAlert = () => {
  const { showAlert, showConfirm } = useNotificationSystem();
  
  return {
    showAlert,
    showConfirm,
    hideAlert: () => {} // For backward compatibility
  };
};