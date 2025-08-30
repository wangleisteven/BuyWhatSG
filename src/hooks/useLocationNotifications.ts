import { useState, useEffect, useCallback, useRef } from 'react';
import { useShoppingList } from '../context/ShoppingListContext';
import {
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  clearAllLocationWatchers,
  getNearbyStores,
  checkGeolocationPermission,
  type GeolocationPosition,
  type FairPriceStore,
} from '../services/geolocation';
import {
  requestNotificationPermission,
  showShoppingListNotification,
  checkNotificationSpam,
  recordNotification,
} from '../services/notifications';
import {
  mapGeolocationError,
  mapGenericError,
  handleError,
  safeLocalStorage,
  ErrorType
} from '../utils/errorHandling';
import {
  checkBrowserCompatibility,
  assessTrackNotifyCompatibility,
  handleCompatibilityIssues,
  logBrowserCompatibility
} from '../utils/browserCompatibility';

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
    const saved = safeLocalStorage.getItem('trackNotifyPreference');
    return safeLocalStorage.parseJSON(saved, false);
  });
  
  const watchIdRef = useRef<number | null>(null);
  const lastNotificationStoreRef = useRef<string | null>(null);
  const isStartingTrackingRef = useRef(false);
  const autoTrackingEnabledRef = useRef(false);
  const lastLocationUpdateRef = useRef<number>(0);
  const LOCATION_UPDATE_THROTTLE = 5000; // 5 seconds between store checks

  // Check initial permissions
  useEffect(() => {
    const checkInitialPermissions = async () => {
      // Check browser compatibility first
      const compatibility = checkBrowserCompatibility();
      const assessment = assessTrackNotifyCompatibility();
      
      // Log compatibility information in development
      if (process.env.NODE_ENV === 'development') {
        logBrowserCompatibility(true);
      }
      
      // Handle critical compatibility issues
      if (!assessment.suitable) {
        handleCompatibilityIssues(compatibility);
        setError('Your browser may not support all Track & Notify features');
      } else if (assessment.warnings.length > 0) {
        // Show warnings for potential issues
        console.warn('Track & Notify compatibility warnings:', assessment.warnings);
      }
      
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
      
      const now = Date.now();
      const timeSinceLastUpdate = now - lastLocationUpdateRef.current;
      
      // Throttle store distance calculations to improve performance
      if (timeSinceLastUpdate >= LOCATION_UPDATE_THROTTLE) {
        lastLocationUpdateRef.current = now;
        
        // Check for nearby stores
        const nearby = getNearbyStores(position);
        setNearbyStores(nearby);

        // Show notification if near a store and user has active lists
        if (nearby.length > 0 && permissionStatus === 'granted') {
          const nearestStore = nearby[0]; // Use the first nearby store (already sorted by distance)
          
          // Check if user has active lists with incomplete items
          const activeLists = lists.filter(
            (list) =>
              list.deleted !== true &&
              list.items.some((item) => !item.completed && item.deleted !== true)
          );

          if (activeLists.length > 0) {
            // Get list IDs for enhanced spam prevention
            const activeListIds = activeLists.map(list => list.id);
            
            // Use enhanced spam prevention system
            const spamCheck = checkNotificationSpam(nearestStore, activeListIds, 30);
            
            if (spamCheck.shouldNotify) {
              showShoppingListNotification(
                nearestStore,
                activeLists,
                onNotificationClick
              );
              
              // Record notification with enhanced tracking
              recordNotification(nearestStore, activeListIds);
              lastNotificationStoreRef.current = nearestStore.name;
            } else {
              // Log spam prevention reason for debugging
              console.debug(`Notification blocked for ${nearestStore.name}: ${spamCheck.reason}`);
              
              // Update last notification store even if blocked to prevent repeated checks
              lastNotificationStoreRef.current = nearestStore.name;
            }
          }
        }
      }
    },
    [lists, permissionStatus, onNotificationClick]
  );

  // Handle location errors with standardized error handling
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    const standardError = mapGeolocationError(error);
    
    // Use standardized error handling
    handleError(standardError, (message, _type) => {
      setError(message);
    });
    
    // Don't stop tracking completely on temporary errors
    if (standardError.type !== ErrorType.PERMISSION_DENIED) {
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
    // Prevent concurrent startTracking calls
    if (isStartingTrackingRef.current || isTracking) {
      return;
    }
    
    isStartingTrackingRef.current = true;
    
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
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'startTracking'
      );
      
      handleError(standardError, (message, _type) => {
        setError(message);
      });
      
      setIsTracking(false);
    } finally {
      isStartingTrackingRef.current = false;
    }
  }, [handleLocationUpdate, handleLocationError, isTracking]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    // Clear the location watcher
    if (watchIdRef.current !== null) {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Reset all tracking-related state
    setIsTracking(false);
    setCurrentLocation(null);
    setNearbyStores([]);
    setError(null);
    
    // Reset synchronization flags
    isStartingTrackingRef.current = false;
    autoTrackingEnabledRef.current = false;
  }, []);

  // Request both notification and geolocation permissions
  const requestPermissions = useCallback(async (): Promise<{ notification: NotificationPermission; geolocation: PermissionState }> => {
    try {
      // Check browser compatibility before requesting permissions
      const assessment = assessTrackNotifyCompatibility();
      if (!assessment.suitable) {
        const error = 'Browser does not support required features for Track & Notify';
        setError(error);
        return { notification: 'denied', geolocation: 'denied' };
      }
      
      // Force notification permission request (especially important for mobile)
      let notificationPermission: NotificationPermission;
      if (Notification.permission === 'default') {
        notificationPermission = await requestNotificationPermission();
      } else {
        notificationPermission = Notification.permission;
      }
      
      // Update permission status atomically to prevent race conditions
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
        } catch (error) {
          const standardError = mapGenericError(
            error instanceof Error ? error : new Error(String(error)),
            'geolocation permission request'
          );
          
          handleError(standardError);
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
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'requestPermissions'
      );
      
      handleError(standardError, (message, _type) => {
        setError(message);
      });
      
      return { notification: 'denied', geolocation: 'denied' };
    }
  }, []);

  // Manual check for nearby stores
  const checkNearbyStores = useCallback(() => {
    if (currentLocation) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastLocationUpdateRef.current;
      
      // Respect throttling for manual checks too, but allow immediate update if enough time has passed
      if (timeSinceLastUpdate >= LOCATION_UPDATE_THROTTLE) {
        lastLocationUpdateRef.current = now;
      }
      
      const nearby = getNearbyStores(currentLocation);
      setNearbyStores(nearby);
    }
  }, [currentLocation]);

  const handleSetUserPreference = useCallback((enabled: boolean) => {
    setUserPreference(enabled);
    safeLocalStorage.setItem('trackNotifyPreference', JSON.stringify(enabled));
    
    // If user disables preference, stop tracking immediately
    if (!enabled && isTracking) {
      stopTracking();
    }
  }, [isTracking, stopTracking]);

  // Auto-enable tracking if both permissions are granted AND user preference is true
  useEffect(() => {
    const shouldAutoTrack = permissionStatus === 'granted' && 
                           geolocationPermissionStatus === 'granted' && 
                           userPreference && 
                           !isTracking && 
                           !isStartingTrackingRef.current;
    
    if (shouldAutoTrack && !autoTrackingEnabledRef.current) {
      autoTrackingEnabledRef.current = true;
      startTracking().finally(() => {
        // Reset auto-tracking flag after attempt
        setTimeout(() => {
          autoTrackingEnabledRef.current = false;
        }, 1000);
      });
    }
    
    // Reset auto-tracking flag when conditions change
    if (!shouldAutoTrack) {
      autoTrackingEnabledRef.current = false;
    }
  }, [permissionStatus, geolocationPermissionStatus, userPreference, isTracking, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear the specific watcher if it exists
      if (watchIdRef.current !== null) {
        clearLocationWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Safety cleanup: clear all watchers as a fallback
      // This prevents memory leaks if multiple instances exist
      try {
        clearAllLocationWatchers();
      } catch (error) {
        console.warn('Error during location watcher cleanup:', error);
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