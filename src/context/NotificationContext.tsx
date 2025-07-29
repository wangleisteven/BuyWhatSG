import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type NotificationContextType = {
  notificationsEnabled: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
  sendNotification: (title: string, options?: NotificationOptions) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  // Check if notifications are supported and permission is granted
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (!('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    };

    checkNotificationPermission();
  }, []);

  // Request permission and enable notifications
  const enableNotifications = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationsEnabled(granted);
      return granted;
    }

    return false;
  };

  // Disable notifications
  const disableNotifications = () => {
    setNotificationsEnabled(false);
    // Note: There's no browser API to programmatically revoke notification permissions
    // Users need to do this through browser settings
  };

  // Send a notification
  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!notificationsEnabled || !('Notification' in window)) {
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.svg',
        ...options,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        enableNotifications,
        disableNotifications,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};