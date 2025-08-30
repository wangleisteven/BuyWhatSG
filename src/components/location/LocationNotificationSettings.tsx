import React, { useState, useEffect } from 'react';
import { FiInfo } from 'react-icons/fi';
import { useLocationNotifications } from '../../hooks/useLocationNotifications';
import { useNavigate } from 'react-router-dom';
import {
  mapGenericError,
  handleError
} from '../../utils/errorHandling';
import {
  checkBrowserCompatibility,
  assessTrackNotifyCompatibility,
  type BrowserCompatibility
} from '../../utils/browserCompatibility';

interface LocationNotificationSettingsProps {
  className?: string;
}

export const LocationNotificationSettings: React.FC<LocationNotificationSettingsProps> = () => {
  const navigate = useNavigate();
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [showCompatibilityDetails, setShowCompatibilityDetails] = useState(false);
  
  // Check browser compatibility on mount
  useEffect(() => {
    const compatibilityReport = checkBrowserCompatibility();
    setCompatibility(compatibilityReport);
  }, []);
  
  const {
    isTracking,
    permissionStatus,
    geolocationPermissionStatus,
    userPreference,
    startTracking,
    stopTracking,
    requestPermissions,
    setUserPreference,
  } = useLocationNotifications((listId: string) => {
    // Navigate to the specific list when notification is clicked
    navigate(`/list/${listId}`);
  });

  // Force re-render when permission states change
  useEffect(() => {
    // This effect ensures the component re-renders when permission states are updated
  }, [permissionStatus, geolocationPermissionStatus]);

  const handleToggleTracking = async () => {
    if (userPreference) {
      setUserPreference(false);
      if (isTracking) {
        stopTracking();
      }
      return;
    }

    // Check browser compatibility before enabling
    if (compatibility) {
      const assessment = assessTrackNotifyCompatibility();
      if (!assessment.suitable) {
        setShowCompatibilityDetails(true);
        return;
      }
    }

    try {
      // Always request permissions to ensure we have the latest state
      const permissions = await requestPermissions();
      
      if (permissions.notification === 'granted' && permissions.geolocation === 'granted') {
        setUserPreference(true);
        // Start tracking immediately after permissions are granted
        await startTracking();
      } else {
        // Show specific error messages based on which permission was denied
        if (permissions.notification === 'denied') {
          const error = mapGenericError(
            new Error('Notification permission denied'),
            'permission request'
          );
          handleError(error);
        }
        if (permissions.geolocation === 'denied') {
          const error = mapGenericError(
            new Error('Location permission denied'),
            'permission request'
          );
          handleError(error);
        }
        // Reset user preference if permissions are not granted
        setUserPreference(false);
      }
    } catch (error) {
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'handleToggleTracking'
      );
      handleError(standardError);
      setUserPreference(false);
    }
  };

  const handleInfoClick = () => {
    setShowInfoPopup(true);
  };

  const closeInfoPopup = () => {
    setShowInfoPopup(false);
  };
  
  const renderCompatibilityStatus = () => {
    if (!compatibility) return null;
    
    const assessment = assessTrackNotifyCompatibility();
    
    return (
      <div className="compatibility-status">
        <div className="compatibility-header">
          <span className="compatibility-title">Browser Compatibility</span>
          <button
            onClick={() => setShowCompatibilityDetails(!showCompatibilityDetails)}
            className="compatibility-toggle"
          >
            {showCompatibilityDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        <div className="compatibility-summary">
          <span className={`compatibility-indicator ${
            assessment.suitable ? 'compatible' : 'incompatible'
          }`}></span>
          <span className="compatibility-text">
            {assessment.suitable ? 'Fully Compatible' : 'Limited Compatibility'}
          </span>
          <span className="browser-info">
            ({compatibility.general.browserName} {compatibility.general.browserVersion})
          </span>
        </div>
        
        {assessment.criticalIssues.length > 0 && (
          <div className="compatibility-issues critical">
            <p className="issues-title">Critical Issues:</p>
            <ul>
              {assessment.criticalIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {assessment.warnings.length > 0 && showCompatibilityDetails && (
          <div className="compatibility-issues warnings">
            <p className="issues-title">Warnings:</p>
            <ul>
              {assessment.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        {assessment.recommendations.length > 0 && showCompatibilityDetails && (
          <div className="compatibility-issues recommendations">
            <p className="issues-title">Recommendations:</p>
            <ul>
              {assessment.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        {showCompatibilityDetails && (
          <div className="compatibility-details">
            <div className="feature-grid">
              <div className="feature-item">
                <span className="feature-name">Geolocation</span>
                <span className={`feature-status ${
                  compatibility.geolocation.supported ? 'supported' : 'unsupported'
                }`}>
                  {compatibility.geolocation.supported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="feature-item">
                <span className="feature-name">Notifications</span>
                <span className={`feature-status ${
                  compatibility.notifications.supported ? 'supported' : 'unsupported'
                }`}>
                  {compatibility.notifications.supported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="feature-item">
                <span className="feature-name">Storage</span>
                <span className={`feature-status ${
                  compatibility.storage.localStorage ? 'supported' : 'unsupported'
                }`}>
                  {compatibility.storage.localStorage ? '✓ Available' : '✗ Not Available'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
        
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
            aria-label={userPreference && permissionStatus === 'granted' && geolocationPermissionStatus === 'granted' ? 'Disable location tracking' : 'Enable location tracking'}
          >
            <div className={`toggle-slider ${userPreference && permissionStatus === 'granted' && geolocationPermissionStatus === 'granted' ? 'active' : ''}`}>
              <div className="toggle-knob"></div>
            </div>
          </button>
        </div>


      {/* Compatibility Status */}
      {renderCompatibilityStatus()}

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
                <li>Please ensure granting both notification & location permissions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toggle-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
        }

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
          z-index: var(--z-index-modal);
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
          font-size: var(--font-size-sm);
        }

        .info-popup-content ul {
          margin: 0;
          padding-left: var(--spacing-md);
          color: var(--color-text-secondary);
        }

        .info-popup-content li {
          margin-bottom: var(--spacing-xs);
          font-size: var(--font-size-xs);
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
        
        /* Browser Compatibility Styles */
        .compatibility-status {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background-color: var(--color-surface-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        
        .compatibility-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }
        
        .compatibility-title {
          font-weight: 600;
          color: var(--color-text);
          font-size: var(--font-size-sm);
        }
        
        .compatibility-toggle {
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          font-size: var(--font-size-xs);
          text-decoration: underline;
        }
        
        .compatibility-summary {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
        }
        
        .compatibility-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .compatibility-indicator.compatible {
          background-color: var(--color-success);
        }
        
        .compatibility-indicator.incompatible {
          background-color: var(--color-error);
        }
        
        .compatibility-text {
          font-size: var(--font-size-xs);
          color: var(--color-text);
        }
        
        .browser-info {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
        }
        
        .compatibility-issues {
          margin-bottom: var(--spacing-sm);
        }
        
        .compatibility-issues.critical {
          color: var(--color-error);
        }
        
        .compatibility-issues.warnings {
          color: var(--color-warning);
        }
        
        .compatibility-issues.recommendations {
          color: var(--color-info);
        }
        
        .issues-title {
          font-size: var(--font-size-xs);
          font-weight: 600;
          margin: 0 0 var(--spacing-xs);
        }
        
        .compatibility-issues ul {
          margin: 0;
          padding-left: var(--spacing-md);
          font-size: var(--font-size-xs);
        }
        
        .compatibility-issues li {
          margin-bottom: var(--spacing-xs);
        }
        
        .compatibility-details {
          margin-top: var(--spacing-sm);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--color-border);
        }
        
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-sm);
        }
        
        .feature-item {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        
        .feature-name {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text);
        }
        
        .feature-status {
          font-size: var(--font-size-xs);
        }
        
        .feature-status.supported {
          color: var(--color-success);
        }
        
        .feature-status.unsupported {
          color: var(--color-error);
        }
      `}</style>
    </>
  );
};