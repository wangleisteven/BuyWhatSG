import fairpriceStoresData from '../data/fairprice-stores.json';
import {
  handleError,
  mapGeolocationError,
  mapGenericError
} from '../utils/errorHandling';


// Load FairPrice stores from JSON file
const FAIRPRICE_STORES: FairPriceStore[] = fairpriceStoresData as FairPriceStore[];

// Track active watchers to prevent memory leaks
const activeWatchers = new Set<number>();

// Cache for distance calculations to improve performance
interface DistanceCache {
  [key: string]: {
    distance: number;
    timestamp: number;
  };
}

const distanceCache: DistanceCache = {};
const CACHE_DURATION = 30000; // 30 seconds cache duration
const CACHE_PRECISION = 4; // Decimal places for location rounding

// Pre-filter stores with valid coordinates for better performance
const VALID_STORES = FAIRPRICE_STORES.filter(
  store => store.latitude !== null && store.longitude !== null
) as (FairPriceStore & { latitude: number; longitude: number })[];

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
 * Calculate distance with caching for better performance
 * @param userLat User latitude
 * @param userLon User longitude
 * @param storeLat Store latitude
 * @param storeLon Store longitude
 * @param storeId Unique store identifier for caching
 * @returns Distance in meters
 */
const calculateDistanceWithCache = (
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number,
  storeId: string
): number => {
  // Round coordinates to reduce cache size and improve hit rate
  const roundedUserLat = Number(userLat.toFixed(CACHE_PRECISION));
  const roundedUserLon = Number(userLon.toFixed(CACHE_PRECISION));
  
  const cacheKey = `${roundedUserLat},${roundedUserLon}-${storeId}`;
  const now = Date.now();
  
  // Check cache first
  const cached = distanceCache[cacheKey];
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.distance;
  }
  
  // Calculate distance
  const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
  
  // Cache the result
  distanceCache[cacheKey] = {
    distance,
    timestamp: now
  };
  
  // Clean old cache entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean cache
    cleanDistanceCache();
  }
  
  return distance;
};

/**
 * Clean expired entries from distance cache
 */
const cleanDistanceCache = (): void => {
  const now = Date.now();
  Object.keys(distanceCache).forEach(key => {
    if (now - distanceCache[key].timestamp > CACHE_DURATION) {
      delete distanceCache[key];
    }
  });
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
      const error = mapGenericError(
        new Error('Geolocation is not supported by this browser'),
        'getCurrentLocation'
      );
      handleError(error);
      reject(error.originalError);
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
              const standardError = mapGeolocationError(fallbackError);
              handleError(standardError);
              reject(fallbackError);
            },
            {
              enableHighAccuracy: false,
              timeout: 60000, // 60 seconds
              maximumAge: 600000, // 10 minutes
            }
          );
        } else {
          const standardError = mapGeolocationError(error);
          handleError(standardError);
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
    const error = mapGenericError(
      new Error('Geolocation is not supported by this browser'),
      'watchLocation'
    );
    handleError(error);
    throw error.originalError;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      // Use standardized error handling for logging
      const standardError = mapGeolocationError(error);
      handleError(standardError);
      
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
  
  // Track the watcher to prevent memory leaks
  activeWatchers.add(watchId);
  
  return watchId;
};

/**
 * Clear location watch
 * @param watchId The watch ID returned by watchLocation
 */
export const clearLocationWatch = (watchId: number): void => {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return;
  }
  
  // Only clear if the watcher is active
  if (activeWatchers.has(watchId)) {
    navigator.geolocation.clearWatch(watchId);
    activeWatchers.delete(watchId);
  } else {
    console.warn('Attempted to clear non-existent or already cleared watch ID:', watchId);
  }
};

/**
 * Clear all active location watchers - useful for cleanup
 */
export const clearAllLocationWatchers = (): void => {
  if (!navigator.geolocation) {
    activeWatchers.clear();
    return;
  }
  
  activeWatchers.forEach(watchId => {
    navigator.geolocation.clearWatch(watchId);
  });
  activeWatchers.clear();
};

/**
 * Get the number of active watchers - useful for debugging
 */
export const getActiveWatcherCount = (): number => {
  return activeWatchers.size;
};

/**
 * Check if user is near any FairPrice store (within 50 meters)
 * @param userLocation User's current location
 * @returns Array of nearby stores sorted by distance
 */
export const getNearbyStores = (
  userLocation: GeolocationPosition
): FairPriceStore[] => {
  const PROXIMITY_THRESHOLD = 50; // 50 meters
  
  // Use pre-filtered stores with valid coordinates for better performance
  const nearbyStores: Array<FairPriceStore & { distance: number }> = [];
  
  // Early exit if no valid stores
  if (VALID_STORES.length === 0) {
    return [];
  }
  
  // Calculate distances using cache for better performance
  for (const store of VALID_STORES) {
    const distance = calculateDistanceWithCache(
      userLocation.latitude,
      userLocation.longitude,
      store.latitude,
      store.longitude,
      `${store.name}-${store.address}` // Use name+address as unique ID
    );
    
    if (distance <= PROXIMITY_THRESHOLD) {
      nearbyStores.push({ ...store, distance });
    }
  }
  
  // Sort by distance (closest first) and remove distance property
  return nearbyStores
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance: _, ...store }) => store);
};

/**
 * Get nearby stores with distance information (for debugging/analytics)
 * @param userLocation User's current location
 * @param maxDistance Maximum distance in meters (default: 50)
 * @returns Array of nearby stores with distance information
 */
export const getNearbyStoresWithDistance = (
  userLocation: GeolocationPosition,
  maxDistance: number = 50
): Array<FairPriceStore & { distance: number }> => {
  const nearbyStores: Array<FairPriceStore & { distance: number }> = [];
  
  for (const store of VALID_STORES) {
    const distance = calculateDistanceWithCache(
      userLocation.latitude,
      userLocation.longitude,
      store.latitude,
      store.longitude,
      `${store.name}-${store.address}`
    );
    
    if (distance <= maxDistance) {
      nearbyStores.push({ ...store, distance });
    }
  }
  
  return nearbyStores.sort((a, b) => a.distance - b.distance);
};

/**
 * Clear the distance cache manually (useful for testing or memory management)
 */
export const clearDistanceCache = (): void => {
  Object.keys(distanceCache).forEach(key => {
    delete distanceCache[key];
  });
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (): { size: number; keys: string[] } => {
  const keys = Object.keys(distanceCache);
  return {
    size: keys.length,
    keys
  };
};

// Network configuration for OneMap API
interface OneMapApiConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  rateLimit: number;
}

const ONEMAP_CONFIG: OneMapApiConfig = {
  baseUrl: 'https://developers.onemap.sg/commonapi',
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  rateLimit: 100 // 100ms between requests
};

// Rate limiting for OneMap API calls
let lastApiCall = 0;

/**
 * Create a fetch request with timeout and proper error handling
 */
const createTimeoutFetch = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = ONEMAP_CONFIG.timeout
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw mapGenericError(
        new Error(`Request timeout after ${timeoutMs}ms`),
        'OneMap API timeout'
      );
    }
    throw error;
  }
};

/**
 * Check if the response indicates a rate limit or server error
 */


/**
 * Apply rate limiting to OneMap API calls
 */
const applyRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < ONEMAP_CONFIG.rateLimit) {
    const delay = ONEMAP_CONFIG.rateLimit - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastApiCall = Date.now();
};

/**
 * Custom retry mechanism for OneMap API with specific retry conditions
 */
const retryOneMapRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = ONEMAP_CONFIG.maxRetries
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if error is retryable
      const isRetryable = lastError.message.includes('timeout') ||
                         lastError.message.includes('network') ||
                         lastError.message.includes('fetch') ||
                         lastError.message.includes('429') || // Rate limit
                         lastError.message.includes('500') || // Server error
                         lastError.message.includes('502') || // Bad gateway
                         lastError.message.includes('503') || // Service unavailable
                         lastError.message.includes('504');   // Gateway timeout
      
      if (!isRetryable) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const baseDelay = ONEMAP_CONFIG.retryDelay;
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Enhanced OneMap API call with retry logic and comprehensive error handling
 */
const callOneMapApi = async (
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> => {
  await applyRateLimit();
  
  const url = new URL(endpoint, ONEMAP_CONFIG.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const makeRequest = async (): Promise<any> => {
    try {
      const response = await createTimeoutFetch(url.toString());
      
      if (!response.ok) {
        const errorMessage = `OneMap API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from OneMap API');
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a network error
        if (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.name === 'TypeError') {
          throw new Error(`Network error: ${error.message}`);
        }
      }
      throw error;
    }
  };
  
  // Use custom retry mechanism for OneMap API
  return retryOneMapRequest(makeRequest, ONEMAP_CONFIG.maxRetries);
};

/**
 * Geocode an address using Singapore's OneMap API with enhanced error handling and retry logic
 * @param address The address to geocode
 * @returns Promise with latitude and longitude
 */
export const geocodeAddress = async (
  address: string
): Promise<{ latitude: number; longitude: number } | null> => {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    handleError(mapGenericError(
      new Error('Invalid address provided for geocoding'),
      'geocodeAddress validation'
    ));
    return null;
  }
  
  try {
    const data = await callOneMapApi('/search', {
      searchVal: address.trim(),
      returnGeom: 'Y',
      getAddrDetails: 'Y',
      pageNum: '1'
    });
    
    // Validate response data
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      // Not an error - just no results found
      return null;
    }
    
    const result = data.results[0];
    
    // Validate coordinate data
    if (!result.LATITUDE || !result.LONGITUDE) {
      handleError(mapGenericError(
        new Error('Invalid coordinate data from OneMap API'),
        'geocodeAddress coordinate validation'
      ));
      return null;
    }
    
    const latitude = parseFloat(result.LATITUDE);
    const longitude = parseFloat(result.LONGITUDE);
    
    // Validate parsed coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      handleError(mapGenericError(
        new Error('Failed to parse coordinates from OneMap API'),
        'geocodeAddress coordinate parsing'
      ));
      return null;
    }
    
    // Validate Singapore coordinate bounds (approximate)
    if (latitude < 1.0 || latitude > 1.5 || longitude < 103.0 || longitude > 104.5) {
      handleError(mapGenericError(
        new Error('Coordinates outside Singapore bounds'),
        'geocodeAddress coordinate bounds'
      ));
      return null;
    }
    
    return {
      latitude,
      longitude,
    };
  } catch (error) {
    // Error already handled by withRetry and callOneMapApi
    const standardError = error instanceof Error 
      ? mapGenericError(error, 'geocodeAddress')
      : mapGenericError(new Error(String(error)), 'geocodeAddress');
    handleError(standardError);
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