import { useState, useEffect, useCallback, useRef } from 'react';
import { useShoppingList } from '../context/ShoppingListContext';
import {
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  getNearbyStores,
  checkGeolocationPermission,
  type GeolocationPosition,
  type FairPriceStore,
} from '../services/geolocation';
import {
  requestNotificationPermission,
  showShoppingListNotification,
  wasRecentlyNotified,
  markAsNotified,
} from '../services/notifications';

export interface LocationNotificationState {
  isTracking: boolean;
  currentLocation: GeolocationPosition | null;
  nearbyStores: FairPriceStore[];
  permissionStatus: NotificationPermission | null;
  geolocationPermissionStatus: PermissionState | null;
  error: string | null;
  userPreference: boolean;
}

export interface LocationNotificationActions {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermissions: () => Promise<{ notification: NotificationPermission; geolocation: PermissionState }>;
  checkNearbyStores: () => void;
  setUserPreference: (enabled: boolean) => void;
}

export const useLocationNotifications = (
  onNotificationClick?: (listId: string) => void
): LocationNotificationState & LocationNotificationActions => {
  const { lists } = useShoppingList();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [nearbyStores, setNearbyStores] = useState<FairPriceStore[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [geolocationPermissionStatus, setGeolocationPermissionStatus] = useState<PermissionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPreference, setUserPreference] = useState(() => {
    const saved = localStorage.getItem('trackNotifyPreference');
    return saved ? JSON.parse(saved) : false;
  });
  
  const watchIdRef = useRef<number | null>(null);
  const lastNotificationStoreRef = useRef<string | null>(null);

  // Check initial permissions
  useEffect(() => {
    const checkInitialPermissions = async () => {
      // Check notification permission
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
      
      // Check geolocation permission
      try {
        const geoPermission = await checkGeolocationPermission();
        setGeolocationPermissionStatus(geoPermission);
      } catch (error) {
        console.warn('Failed to check geolocation permission:', error);
        setGeolocationPermissionStatus('denied');
      }
    };
    
    checkInitialPermissions();
  }, []);
  


  // Handle location updates
  const handleLocationUpdate = useCallback(
    (position: GeolocationPosition) => {
      setCurrentLocation(position);
      setError(null);

      // Check for nearby stores
      const nearby = getNearbyStores(position);
      setNearbyStores(nearby);

      // Show notification if near a store and user has active lists
      if (nearby.length > 0 && permissionStatus === 'granted') {
        const nearestStore = nearby[0]; // Use the first nearby store
        
        // Check if we've already notified for this store recently
        if (!wasRecentlyNotified(nearestStore.name)) {
          // Check if user has active lists with incomplete items
          const activeLists = lists.filter(
            (list) =>
              list.deleted !== true &&
              list.items.some((item) => !item.completed && item.deleted !== true)
          );

          if (activeLists.length > 0) {
            showShoppingListNotification(
              nearestStore,
              activeLists,
              onNotificationClick
            );
            
            // Mark as notified to prevent spam
            markAsNotified(nearestStore.name);
            lastNotificationStoreRef.current = nearestStore.name;
          }
        }
      }
    },
    [lists, permissionStatus, onNotificationClick]
  );

  // Handle location errors
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Location access failed';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location temporarily unavailable. Please try again in a moment.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please check your connection and try again.';
        break;
      default:
        errorMessage = 'Unable to determine your location. Please try again.';
        break;
    }
    
    setError(errorMessage);
    console.warn('Geolocation error:', error.message, 'Code:', error.code);
    
    // Don't stop tracking completely on temporary errors
    if (error.code !== error.PERMISSION_DENIED) {
      // Keep tracking enabled but clear current location
      setCurrentLocation(null);
      setNearbyStores([]);
    } else {
      // Only stop tracking if permission is explicitly denied
      setIsTracking(false);
    }
  }, []);

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      setIsTracking(true);
      
      // Start watching location immediately (don't wait for initial location)
      const watchId = watchLocation(handleLocationUpdate, handleLocationError);
      watchIdRef.current = watchId;
      
      // Try to get initial location in background, but don't block the UI
      getCurrentLocation()
        .then(handleLocationUpdate)
        .catch((locationError) => {
          console.warn('Initial location failed, but watching will continue:', locationError);
          // The watch will handle subsequent location attempts
        });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start location tracking';
      setError(errorMessage);
      setIsTracking(false);
      console.error('Failed to start location tracking:', error);
    }
  }, [handleLocationUpdate, handleLocationError]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentLocation(null);
    setNearbyStores([]);
    setError(null);
  }, []);

  // Request both notification and geolocation permissions
  const requestPermissions = useCallback(async (): Promise<{ notification: NotificationPermission; geolocation: PermissionState }> => {
    try {
      // Force notification permission request (especially important for mobile)
      let notificationPermission: NotificationPermission;
      if (Notification.permission === 'default') {
        notificationPermission = await requestNotificationPermission();
      } else {
        notificationPermission = Notification.permission;
      }
      setPermissionStatus(notificationPermission);
      
      // Request geolocation permission with better error handling
      let geoPermission: PermissionState;
      try {
        // Use a shorter timeout for permission request
        const locationPromise = getCurrentLocation();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Location request timeout')), 10000);
        });
        
        await Promise.race([locationPromise, timeoutPromise]);
        geoPermission = await checkGeolocationPermission();
      } catch (error) {
        // If getCurrentLocation fails, check the actual permission state
        try {
          geoPermission = await checkGeolocationPermission();
        } catch {
          geoPermission = 'denied';
        }
      }
      setGeolocationPermissionStatus(geoPermission);
      
      if (notificationPermission === 'denied') {
        setError('Notification permission denied. Please enable notifications in browser settings.');
      } else if (geoPermission === 'denied') {
        setError('Location permission denied. Please enable location access in browser settings.');
      }
      
      return { notification: notificationPermission, geolocation: geoPermission };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permissions';
      setError(errorMessage);
      console.error('Failed to request permissions:', error);
      return { notification: 'denied', geolocation: 'denied' };
    }
  }, []);

  // Manual check for nearby stores
  const checkNearbyStores = useCallback(() => {
    if (currentLocation) {
      const nearby = getNearbyStores(currentLocation);
      setNearbyStores(nearby);
    }
  }, [currentLocation]);

  const handleSetUserPreference = useCallback((enabled: boolean) => {
    setUserPreference(enabled);
    localStorage.setItem('trackNotifyPreference', JSON.stringify(enabled));
    
    // If user disables preference, stop tracking immediately
    if (!enabled && isTracking) {
      stopTracking();
    }
  }, [isTracking, stopTracking]);

  // Auto-enable tracking if both permissions are granted AND user preference is true
  useEffect(() => {
    if (permissionStatus === 'granted' && geolocationPermissionStatus === 'granted' && userPreference && !isTracking) {
      startTracking();
    }
  }, [permissionStatus, geolocationPermissionStatus, userPreference, isTracking, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearLocationWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    // State
    isTracking,
    currentLocation,
    nearbyStores,
    permissionStatus,
    geolocationPermissionStatus,
    error,
    userPreference,
    
    // Actions
    startTracking,
    stopTracking,
    requestPermissions,
    checkNearbyStores,
    setUserPreference: handleSetUserPreference,
  };
};