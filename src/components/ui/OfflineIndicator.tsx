import { useOffline } from '../../hooks/useOffline';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const isOffline = useOffline();
  
  if (!isOffline) return null;
  
  return (
    <div className="offline-indicator">
      <FiWifiOff size={18} />
      <span>You are offline</span>
    </div>
  );
};

export default OfflineIndicator;