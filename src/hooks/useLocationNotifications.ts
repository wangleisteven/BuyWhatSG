import { useState, useEffect, useCallback, useRef } from 'react';
import { useShoppingList } from '../context/ShoppingListContext';
import {
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  getNearbyStores,
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
  error: string | null;
}

export interface LocationNotificationActions {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermissions: () => Promise<void>;
  checkNearbyStores: () => void;
}

export const useLocationNotifications = (
  onNotificationClick?: (listId: string) => void
): LocationNotificationState & LocationNotificationActions => {
  const { lists } = useShoppingList();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [nearbyStores, setNearbyStores] = useState<FairPriceStore[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const lastNotificationStoreRef = useRef<string | null>(null);

  // Check initial notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
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
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    
    setError(errorMessage);
    console.error('Geolocation error:', error);
  }, []);

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      // Get initial location
      const initialLocation = await getCurrentLocation();
      handleLocationUpdate(initialLocation);
      
      // Start watching location
      const watchId = watchLocation(handleLocationUpdate, handleLocationError);
      watchIdRef.current = watchId;
      setIsTracking(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start location tracking';
      setError(errorMessage);
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

  // Request notification permissions
  const requestPermissions = useCallback(async () => {
    try {
      const permission = await requestNotificationPermission();
      setPermissionStatus(permission);
      
      if (permission === 'denied') {
        setError('Notification permission denied. Please enable notifications in browser settings.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request notification permission';
      setError(errorMessage);
      console.error('Failed to request notification permission:', error);
    }
  }, []);

  // Manual check for nearby stores
  const checkNearbyStores = useCallback(() => {
    if (currentLocation) {
      const nearby = getNearbyStores(currentLocation);
      setNearbyStores(nearby);
    }
  }, [currentLocation]);

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
    error,
    
    // Actions
    startTracking,
    stopTracking,
    requestPermissions,
    checkNearbyStores,
  };
};