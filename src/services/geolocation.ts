import fairpriceStoresData from '../data/fairprice-stores.json';

// Load FairPrice stores from JSON file
const FAIRPRICE_STORES: FairPriceStore[] = fairpriceStoresData as FairPriceStore[];

export interface FairPriceStore {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hours: string;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if geolocation permissions are granted
 * @returns Promise with permission status
 */
export const checkGeolocationPermission = async (): Promise<PermissionState> => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  if (!navigator.permissions) {
    // Fallback for browsers without permissions API
    // Return 'prompt' to indicate we need to request permission
    return 'prompt';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (error) {
    console.warn('Failed to query geolocation permission:', error);
    // Return 'prompt' if we can't determine the permission state
    return 'prompt';
  }
};

/**
 * Get current user location using the Geolocation API
 * @returns Promise with user's current position
 */
export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        // Try again with less strict settings if high accuracy fails
        if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (fallbackError) => {
              reject(fallbackError);
            },
            {
              enableHighAccuracy: false,
              timeout: 60000, // 60 seconds
              maximumAge: 600000, // 10 minutes
            }
          );
        } else {
          reject(error);
        }
      },
      {
        enableHighAccuracy: false, // Less strict for better compatibility
        timeout: 15000, // 15 seconds - shorter timeout
        maximumAge: 600000, // 10 minutes - allow older positions
      }
    );
  });
};

/**
 * Watch user location for continuous tracking
 * @param callback Function to call when location updates
 * @param errorCallback Function to call on error
 * @returns Watch ID that can be used to clear the watch
 */
export const watchLocation = (
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void
): number => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      // Log the error for debugging
      console.warn('Geolocation watch error:', error.message, 'Code:', error.code);
      
      // Call the error callback if provided
      if (errorCallback) {
        errorCallback(error);
      }
    },
    {
      enableHighAccuracy: false, // Disable high accuracy for better compatibility
      timeout: 30000, // 30 seconds - reasonable timeout
      maximumAge: 600000, // 10 minutes - allow older cached positions
    }
  );
};

/**
 * Clear location watch
 * @param watchId The watch ID returned by watchLocation
 */
export const clearLocationWatch = (watchId: number): void => {
  navigator.geolocation.clearWatch(watchId);
};

/**
 * Check if user is near any FairPrice store (within 50 meters)
 * @param userLocation User's current location
 * @returns Array of nearby stores
 */
export const getNearbyStores = (
  userLocation: GeolocationPosition
): FairPriceStore[] => {
  const PROXIMITY_THRESHOLD = 50; // 50 meters
  const stores = FAIRPRICE_STORES;
  
  return stores.filter((store) => {
    if (!store.latitude || !store.longitude) {
      return false;
    }
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      store.latitude,
      store.longitude
    );
    
    return distance <= PROXIMITY_THRESHOLD;
  });
};

/**
 * Geocode an address using Singapore's OneMap API
 * @param address The address to geocode
 * @returns Promise with latitude and longitude
 */
export const geocodeAddress = async (
  address: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const response = await fetch(
      `https://developers.onemap.sg/commonapi/search?searchVal=${encodeURIComponent(
        address
      )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return {
        latitude: parseFloat(data.results[0].LATITUDE),
        longitude: parseFloat(data.results[0].LONGITUDE),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Update store coordinates by geocoding their addresses
 * @returns Promise with updated stores data
 */
export const updateStoreCoordinates = async (): Promise<FairPriceStore[]> => {
  const stores = FAIRPRICE_STORES;
  const updatedStores: FairPriceStore[] = [];
  
  for (const store of stores) {
    if (!store.latitude || !store.longitude) {
      const coordinates = await geocodeAddress(store.address);
      if (coordinates) {
        updatedStores.push({
          ...store,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
      } else {
        updatedStores.push(store);
      }
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      updatedStores.push(store);
    }
  }
  
  return updatedStores;
};