import { useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { useToast } from '../../context/NotificationSystemContext';
import { FiWifiOff } from 'react-icons/fi';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const { isOffline, wasOffline, resetWasOffline } = useOffline();
  const { addToast } = useToast();
  
  // Show toast when connection is restored
  useEffect(() => {
    if (wasOffline) {
      addToast({
        message: 'Back online! Your changes have been synced.',
        type: 'success',
        duration: 3000
      });
      resetWasOffline();
    }
  }, [wasOffline, addToast, resetWasOffline]);
  
  if (!isOffline) return null;
  
  return (
    <div className="offline-indicator">
      <FiWifiOff size={16} />
      <span>Offline</span>
    </div>
  );
};

export default OfflineIndicator;