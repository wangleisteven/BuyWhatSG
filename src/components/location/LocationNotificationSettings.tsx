import React, { useState, useEffect } from 'react';
import { FiInfo, FiMapPin, FiNavigation, FiClock } from 'react-icons/fi';
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
import { getEnhancedNearbyStores, type EnhancedFairPriceStore } from '../../services/geolocation';
import './LocationNotificationSettings.css';

interface LocationNotificationSettingsProps {
  className?: string;
}

export const LocationNotificationSettings: React.FC<LocationNotificationSettingsProps> = () => {
  const navigate = useNavigate();
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [showCompatibilityDetails, setShowCompatibilityDetails] = useState(false);
  const [enhancedStores, setEnhancedStores] = useState<EnhancedFairPriceStore[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Check browser compatibility on mount
  useEffect(() => {
    const compatibilityReport = checkBrowserCompatibility();
    setCompatibility(compatibilityReport);
  }, []);
  
  const {
    isTracking,
    currentLocation,
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

  // Load enhanced nearby stores
  const loadEnhancedStores = async () => {
    if (!isTracking || !currentLocation) {
      setEnhancedStores([]);
      return;
    }

    setIsLoadingStores(true);
    const startTime = Date.now();

    try {
      console.log(`[LocationSettings] Loading enhanced stores for user at (${currentLocation.latitude}, ${currentLocation.longitude})`);
      
      const stores = await getEnhancedNearbyStores(currentLocation, 3);
      setEnhancedStores(stores);
      setLastUpdateTime(Date.now());
      
      console.log(`[LocationSettings] Loaded ${stores.length} enhanced stores in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('[LocationSettings] Error loading enhanced stores:', error);
      setEnhancedStores([]);
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Auto-refresh stores every 30 seconds when tracking is active
  useEffect(() => {
    if (isTracking && currentLocation) {
      loadEnhancedStores();
      
      const interval = setInterval(() => {
        const now = Date.now();
        if (now - lastUpdateTime >= 30000) { // 30 seconds
          loadEnhancedStores();
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isTracking, currentLocation, lastUpdateTime]);

  // Refresh stores when location updates
  useEffect(() => {
    if (currentLocation && isTracking) {
      loadEnhancedStores();
    }
  }, [currentLocation]);

  const handleToggleTracking = async () => {
    if (userPreference) {
      setUserPreference(false);
      if (isTracking) {
        stopTracking();
      }
      setEnhancedStores([]);
      setShowConfirmation(false);
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
        setShowConfirmation(true);
        // Hide confirmation after 5 seconds
        setTimeout(() => setShowConfirmation(false), 5000);
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


      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="confirmation-message">
          <div className="confirmation-content">
            <FiMapPin size={20} className="confirmation-icon" />
            <div className="confirmation-text">
              <strong>Notifications are now active.</strong>
              <br />
              We will alert you when you're within 50 meters of any FairPrice outlet with your incomplete shopping list.
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Store Display */}
      {isTracking && permissionStatus === 'granted' && geolocationPermissionStatus === 'granted' && (
        <div className="enhanced-stores-display">
          <div className="stores-header">
            <h4>Nearby FairPrice Outlets</h4>
            {isLoadingStores && <span className="loading-text">Updating...</span>}
          </div>
          
          {enhancedStores.length > 0 ? (
            <div className="stores-list">
              {enhancedStores.map((store, index) => (
                <div key={`${store.name}-${index}`} className="store-item">
                  <div className="store-info">
                    <div className="store-name">
                      <FiMapPin size={16} className="store-icon" />
                      <span>{store.name}</span>
                    </div>
                    <div className="store-details">
                      <div className="distance-info">
                        <FiNavigation size={14} className="detail-icon" />
                        <span>{store.walkingDistance?.toFixed(2)} km</span>
                      </div>
                      <div className="time-info">
                        <FiClock size={14} className="detail-icon" />
                        <span>{store.walkingTime?.toFixed(0)} min walk</span>
                      </div>
                    </div>
                  </div>
                  <a 
                    href={store.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="maps-link"
                    aria-label={`Get directions to ${store.name}`}
                  >
                    <FiNavigation size={20} />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-stores">
              {isLoadingStores ? (
                <span>Loading nearby stores...</span>
              ) : (
                <span>No FairPrice outlets found within 2km</span>
              )}
            </div>
          )}
        </div>
      )}

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
    </>
  );
};