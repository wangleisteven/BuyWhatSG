import React, { useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import { useLocationNotifications } from '../../hooks/useLocationNotifications';
import { useNavigate } from 'react-router-dom';

interface LocationNotificationSettingsProps {
  className?: string;
}

export const LocationNotificationSettings: React.FC<LocationNotificationSettingsProps> = ({
  className = '',
}) => {
  const navigate = useNavigate();
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  
  const {
    isTracking,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermissions,
  } = useLocationNotifications((listId: string) => {
    // Navigate to the specific list when notification is clicked
    navigate(`/list/${listId}`);
  });

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
    } else {
      // Request permissions first if not granted
      if (permissionStatus !== 'granted' || Notification.permission !== 'granted') {
        await requestPermissions();
      }
      
      // Start tracking if permissions are granted
      if (permissionStatus === 'granted' && Notification.permission === 'granted') {
        await startTracking();
      }
    }
  };

  const handleInfoClick = () => {
    setShowInfoPopup(true);
  };

  const closeInfoPopup = () => {
    setShowInfoPopup(false);
  };

  return (
    <>
      <div className="settings-section">
        <h3>Location Notifications</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">
              📍
            </span>
            <span>Track & Notify</span>
            <button 
              onClick={handleInfoClick}
              className="info-button"
              aria-label="Information about location tracking"
            >
              <FiInfo size={16} />
            </button>
          </div>
          <button 
            className="toggle-button"
            onClick={handleToggleTracking}
            aria-label={isTracking ? 'Disable location tracking' : 'Enable location tracking'}
          >
            <div className={`toggle-slider ${isTracking ? 'active' : ''}`}>
              <div className="toggle-knob"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="info-popup-overlay" onClick={closeInfoPopup}>
          <div className="info-popup" onClick={(e) => e.stopPropagation()}>
            <div className="info-popup-header">
              <h4>Location Tracking & Notifications</h4>
              <button onClick={closeInfoPopup} className="close-button">×</button>
            </div>
            <div className="info-popup-content">
              <p>
                When enabled, the system will automatically detect when you're near a FairPrice store 
                and send you notifications about incomplete items on your shopping lists.
              </p>
              <ul>
                <li>Notifications appear when you're within 50 meters of a store</li>
                <li>Only shows when you have incomplete items</li>
                <li>Limited to once per 30 minutes per store</li>
                <li>Location data is only used locally and not stored on servers</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .info-button {
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          margin-left: var(--spacing-sm);
          padding: 2px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition-fast) ease;
        }

        .info-button:hover {
          color: var(--color-primary);
        }

        .info-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
        }

        .info-popup {
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          max-width: 400px;
          width: 100%;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease;
        }

        .info-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) var(--spacing-md) 0;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: var(--spacing-md);
        }

        .info-popup-header h4 {
          margin: 0;
          font-size: var(--font-size-lg);
          color: var(--color-text);
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color var(--transition-fast) ease;
        }

        .close-button:hover {
          background-color: var(--color-border);
        }

        .info-popup-content {
          padding: 0 var(--spacing-md) var(--spacing-md);
        }

        .info-popup-content p {
          margin: 0 0 var(--spacing-md);
          color: var(--color-text);
          line-height: 1.5;
        }

        .info-popup-content ul {
          margin: 0;
          padding-left: var(--spacing-md);
          color: var(--color-text-secondary);
        }

        .info-popup-content li {
          margin-bottom: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};