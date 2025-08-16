import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/NotificationSystemContext';

type UseOfflineReturn = {
  isOffline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
};

/**
 * Enhanced hook to detect if the user is offline and track when connection is restored
 * @returns {UseOfflineReturn} Object containing offline status and tracking state
 */
export const useOffline = (): UseOfflineReturn => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const { addToast } = useToast();

  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (isOffline) {
        setWasOffline(true);
      }
      setIsOffline(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOffline]);

  return { isOffline, wasOffline, resetWasOffline };
};