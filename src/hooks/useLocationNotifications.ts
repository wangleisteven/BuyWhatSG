import { useState, useEffect, useCallback, useRef } from 'react';
import { useShoppingList } from '../context/ShoppingListContext';
import {
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  clearAllLocationWatchers,
  getNearbyStores,
  getEnhancedNearbyStores,
  checkGeolocationPermission,
  type GeolocationPosition,
  type FairPriceStore,
  type EnhancedFairPriceStore,
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
  const [nearbyStores, setNearbyStores] = useState<EnhancedFairPriceStore[]>([]);
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
  const NOTIFICATION_THRESHOLD_METERS = 50; // 50-meter threshold for notifications
  
  // Notification history management
  const getNotificationHistory = useCallback(() => {
    const history = safeLocalStorage.getItem('notificationHistory');
    return safeLocalStorage.parseJSON(history, []);
  }, []);

  const addToNotificationHistory = useCallback((store: EnhancedFairPriceStore, distance: number, lists: string[]) => {
    const history = getNotificationHistory();
    const newEntry = {
      storeName: store.name,
      storeId: store.outletId,
      distance,
      lists,
      timestamp: new Date().toISOString(),
      latitude: store.latitude,
      longitude: store.longitude
    };
    
    // Keep only last 50 notifications
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    safeLocalStorage.setItem('notificationHistory', JSON.stringify(updatedHistory));
    
    logWithTimestamp('log', '📋 Added to notification history:', newEntry);
  }, [getNotificationHistory]);

  const logWithTimestamp = useCallback((level: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data ? data : '');
        break;
      case 'warn':
        console.warn(logMessage, data ? data : '');
        break;
      case 'log':
      default:
        console.log(logMessage, data ? data : '');
        break;
    }
  }, []);

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
  


  // Handle location updates with precise notification triggering
  const handleLocationUpdate = useCallback(
    async (position: GeolocationPosition) => {
      setCurrentLocation(position);
      setError(null);
      
      const now = Date.now();
      const timeSinceLastUpdate = now - lastLocationUpdateRef.current;
      
      // Throttle store distance calculations to improve performance
      if (timeSinceLastUpdate >= LOCATION_UPDATE_THROTTLE) {
        lastLocationUpdateRef.current = now;
        
        logWithTimestamp('log', '📡 Processing location update:', {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Get enhanced stores with precise walking distances
          const enhancedStores = await getEnhancedNearbyStores(position, 3);
          
          setNearbyStores(enhancedStores);

          // Show notification if near a store and user has active lists
          if (enhancedStores.length > 0 && permissionStatus === 'granted') {
            const nearestStore = enhancedStores[0];
            
            logWithTimestamp('log', '🎯 Nearest store check:', {
              storeName: nearestStore.name,
              walkingDistance: `${nearestStore.walkingDistance?.toFixed(3)} km`,
              walkingTime: `${nearestStore.walkingTime?.toFixed(1)} min`,
              threshold: `${NOTIFICATION_THRESHOLD_METERS} m`
            });

            // Check if within 50m threshold using walking distance
            const distanceInMeters = (nearestStore.walkingDistance || 0) * 1000;
            
            if (distanceInMeters <= NOTIFICATION_THRESHOLD_METERS) {
              // Check if user has active lists with incomplete items
              const activeLists = lists.filter(
                (list) =>
                  list.deleted !== true &&
                  list.items.some((item) => !item.completed && item.deleted !== true)
              );

              if (activeLists.length > 0) {
                const activeListIds = activeLists.map(list => list.id);
                
                // Enhanced spam prevention with precise distance
                const spamCheck = checkNotificationSpam(nearestStore, activeListIds, 30);
                
                logWithTimestamp('log', '🔔 Notification evaluation:', {
                  storeName: nearestStore.name,
                  distance: `${distanceInMeters.toFixed(0)} m`,
                  activeLists: activeLists.length,
                  shouldNotify: spamCheck.shouldNotify,
                  reason: spamCheck.reason
                });
                
                if (spamCheck.shouldNotify) {
                  // Show enhanced notification with store name and distance
                  showShoppingListNotification(
                    nearestStore,
                    activeLists,
                    onNotificationClick,
                    nearestStore.walkingDistance,
                    nearestStore.walkingTime
                  );
                  
                  // Record notification with history
                  addToNotificationHistory(nearestStore, distanceInMeters, activeListIds);
                  recordNotification(nearestStore, activeListIds);
                  lastNotificationStoreRef.current = nearestStore.name;
                  
                  logWithTimestamp('log', '✅ Notification triggered:', {
                    storeName: nearestStore.name,
                    distance: `${distanceInMeters.toFixed(0)} m`,
                    lists: activeListIds
                  });
                } else {
                  logWithTimestamp('log', `⏸️ Notification blocked: ${spamCheck.reason}`);
                  lastNotificationStoreRef.current = nearestStore.name;
                }
              } else {
                logWithTimestamp('log', '📝 No active lists with incomplete items');
              }
            } else {
              logWithTimestamp('log', `📏 Too far for notification: ${distanceInMeters.toFixed(0)}m > ${NOTIFICATION_THRESHOLD_METERS}m`);
            }
          } else {
            if (enhancedStores.length === 0) {
              logWithTimestamp('log', '🏪 No FairPrice stores found within 1km');
            } else if (permissionStatus !== 'granted') {
              logWithTimestamp('log', `🔒 Notification permission: ${permissionStatus}`);
            }
          }
        } catch (error) {
          logWithTimestamp('error', '❌ Error processing location update:', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Fallback to basic nearby stores on error
          const nearby = getNearbyStores(position);
          setNearbyStores(nearby as any);
        }
      }
    },
    [lists, permissionStatus, onNotificationClick, addToNotificationHistory]
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