import React from 'react';
import { useLocationNotifications } from '../../hooks/useLocationNotifications';
import { useNavigate } from 'react-router-dom';

interface LocationNotificationSettingsProps {
  className?: string;
}

export const LocationNotificationSettings: React.FC<LocationNotificationSettingsProps> = ({
  className = '',
}) => {
  const navigate = useNavigate();
  
  const {
    isTracking,
    currentLocation,
    nearbyStores,
    permissionStatus,
    error,
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
      if (permissionStatus !== 'granted') {
        await requestPermissions();
      }
      
      // Start tracking if permissions are granted
      if (permissionStatus === 'granted' || Notification.permission === 'granted') {
        await startTracking();
      }
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Notifications enabled';
      case 'denied':
        return 'Notifications blocked';
      case 'default':
        return 'Notifications not requested';
      default:
        return 'Checking notification status...';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'text-green-600';
      case 'denied':
        return 'text-red-600';
      case 'default':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Location-Based Notifications
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">📍</span>
          <span className={`text-sm font-medium ${getPermissionStatusColor()}`}>
            {getPermissionStatusText()}
          </span>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Get notified when you're near a FairPrice store and have items on your shopping lists.
      </p>

      {/* Permission Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Notification Permission</p>
            <p className={`text-xs ${getPermissionStatusColor()}`}>
              {getPermissionStatusText()}
            </p>
          </div>
          {permissionStatus !== 'granted' && (
            <button
              onClick={requestPermissions}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Location Tracking Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Location Tracking</p>
            <p className="text-xs text-gray-600">
              {isTracking ? 'Currently tracking your location' : 'Location tracking disabled'}
            </p>
          </div>
          <button
            onClick={handleToggleTracking}
            disabled={permissionStatus === 'denied'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isTracking
                ? 'bg-red-600 text-white hover:bg-red-700'
                : permissionStatus === 'denied'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </div>

      {/* Current Location Info */}
      {currentLocation && (
        <div className="mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">Current Location</p>
            <p className="text-xs text-blue-700">
              Lat: {currentLocation.latitude.toFixed(6)}, 
              Lng: {currentLocation.longitude.toFixed(6)}
            </p>
            <p className="text-xs text-blue-600">
              Accuracy: ±{Math.round(currentLocation.accuracy)}m
            </p>
          </div>
        </div>
      )}

      {/* Nearby Stores */}
      {nearbyStores.length > 0 && (
        <div className="mb-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-2">
              🏪 Nearby FairPrice Stores ({nearbyStores.length})
            </p>
            {nearbyStores.map((store, index) => (
              <div key={index} className="text-xs text-green-700 mb-1">
                • {store.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4">
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-1">Error</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Notifications appear when you're within 50 meters of a FairPrice store</p>
        <p>• Only shows when you have incomplete items on your shopping lists</p>
        <p>• Notifications are limited to once per 30 minutes per store</p>
        <p>• Location data is only used locally and not stored on servers</p>
      </div>
    </div>
  );
};