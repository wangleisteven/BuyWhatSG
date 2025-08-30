import fairpriceStoresData from '../data/fairprice-stores.json';
import {
  handleError,
  mapGeolocationError,
  mapGenericError
} from '../utils/errorHandling';

// Console logging utility for debugging
const logWithTimestamp = (level: string, message: string, data?: any) => {
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
};

const logUserCoordinates = (coords: GeolocationCoordinates) => {
  logWithTimestamp('log', '📍 Current User Coordinates:', {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    heading: coords.heading,
    speed: coords.speed,
    timestamp: new Date().toISOString()
  });
};



const logDistanceCalculation = (
  storeName: string,
  straightDistance: number,
  walkingDistance?: number,
  walkingTime?: number,
  apiResponseTime?: number
) => {
  logWithTimestamp('log', `📏 Distance Calculation - ${storeName}:`, {
    straightLineDistance: `${(straightDistance / 1000).toFixed(3)} km`,
    walkingDistance: walkingDistance ? `${walkingDistance.toFixed(3)} km` : 'N/A',
    walkingTime: walkingTime ? `${walkingTime.toFixed(1)} min` : 'N/A',
    apiResponseTime: apiResponseTime ? `${apiResponseTime.toFixed(2)} ms` : 'N/A',
    difference: walkingDistance ? `${((walkingDistance * 1000) - straightDistance).toFixed(0)} m` : 'N/A'
  });
};

const logApiResponse = (endpoint: string, status: number, responseTime: number, data?: any) => {
  logWithTimestamp('log', `🌐 OneMap API Response:`, {
    endpoint,
    status,
    responseTime: `${responseTime.toFixed(2)} ms`,
    data: data || 'No additional data'
  });
};

const logCacheOperation = (operation: string, key: string, hit?: boolean) => {
  logWithTimestamp('log', `💾 Cache ${operation}:`, {
    key,
    hit: hit !== undefined ? (hit ? 'HIT' : 'MISS') : 'N/A',
    timestamp: new Date().toISOString()
  });
};

// OneMap API configuration
const ONEMAP_API_BASE = 'https://www.onemap.gov.sg/api';
const ONEMAP_ROUTING_ENDPOINT = '/privateapi/routingsvc/route';



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

export interface EnhancedFairPriceStore extends FairPriceStore {
  walkingDistance?: number;
  walkingTime?: number;
  googleMapsUrl?: string;
  distanceAccuracy?: 'precise' | 'estimated';
  outletId?: string;
  postalCode?: string;
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
 * Calculate precise walking distance using OneMap API
 * @param userLat User latitude
 * @param userLon User longitude
 * @param storeLat Store latitude
 * @param storeLon Store longitude
 * @returns Promise with walking distance in km and time in minutes
 */
export const calculateWalkingDistance = async (
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number
): Promise<{ distance: number; time: number }> => {
  const startTime = performance.now();
  const cacheKey = `walk_${userLat.toFixed(4)}_${userLon.toFixed(4)}_${storeLat.toFixed(4)}_${storeLon.toFixed(4)}`;
  
  logCacheOperation('Lookup', cacheKey);
  
  try {
    // Construct OneMap API URL for walking route
    const params = new URLSearchParams({
      start: `${userLat},${userLon}`,
      end: `${storeLat},${storeLon}`,
      routeType: 'walk',
      token: 'optional_token_here',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      mode: 'TRANSIT,WALK',
      numItineraries: '1'
    });

    logWithTimestamp('log', '🚀 Calling OneMap API:', { 
      url: `${ONEMAP_API_BASE}${ONEMAP_ROUTING_ENDPOINT}?${params.toString()}`,
      from: [userLat, userLon], 
      to: [storeLat, storeLon] 
    });

    const response = await fetch(`${ONEMAP_API_BASE}${ONEMAP_ROUTING_ENDPOINT}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const responseTime = performance.now() - startTime;
    logApiResponse(ONEMAP_ROUTING_ENDPOINT, response.status, responseTime);

    if (!response.ok) {
      logWithTimestamp('warn', `⚠️ OneMap API error: ${response.status}`, { responseTime });
      
      // Fallback to straight-line distance with walking factor
      const straightDistance = calculateDistance(userLat, userLon, storeLat, storeLon);
      logDistanceCalculation(
        `Store (${storeLat}, ${storeLon})`,
        straightDistance,
        straightDistance * 1.3 / 1000,
        (straightDistance * 1.3 / 1000) * 12
      );
      
      return { 
        distance: straightDistance * 1.3 / 1000, 
        time: (straightDistance * 1.3 / 1000) * 12 
      };
    }

    const data = await response.json();
    
    if (!data.plan || !data.plan.itineraries || data.plan.itineraries.length === 0) {
      logWithTimestamp('warn', '⚠️ OneMap API response missing data:', data);
      
      // Fallback to straight-line distance
      const straightDistance = calculateDistance(userLat, userLon, storeLat, storeLon);
      logDistanceCalculation(
        `Store (${storeLat}, ${storeLon})`,
        straightDistance,
        straightDistance * 1.3 / 1000,
        (straightDistance * 1.3 / 1000) * 12
      );
      
      return { 
        distance: straightDistance * 1.3 / 1000, 
        time: (straightDistance * 1.3 / 1000) * 12 
      };
    }

    const itinerary = data.plan.itineraries[0];
    const walkingDistance = itinerary.walkDistance / 1000;
    const walkingTime = itinerary.duration / 60;

    logDistanceCalculation(
      `Store (${storeLat}, ${storeLon})`,
      calculateDistance(userLat, userLon, storeLat, storeLon),
      walkingDistance,
      walkingTime,
      responseTime
    );
    
    return { distance: walkingDistance, time: walkingTime };
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    logWithTimestamp('error', '❌ Error calculating walking distance:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime.toFixed(2)} ms`
    });
    
    // Fallback to straight-line distance
    const straightDistance = calculateDistance(userLat, userLon, storeLat, storeLon);
    return { 
      distance: straightDistance * 1.3 / 1000, 
      time: (straightDistance * 1.3 / 1000) * 12 
    };
  }
};

/**
 * Get enhanced FairPrice stores with precise walking distances
 * @param userPosition User's current position
 * @param limit Maximum number of stores to return (default: 3)
 * @returns Promise with enhanced store data including walking distances
 */
export const getEnhancedNearbyStores = async (
  userPosition: GeolocationPosition,
  limit: number = 3
): Promise<EnhancedFairPriceStore[]> => {
  const startTime = performance.now();
  
  logWithTimestamp('log', '📍 Starting getEnhancedNearbyStores:', {
    userPosition,
    limit,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Filter stores within 2km radius for initial filtering
    const maxRadius = 2000; // 2km
    const nearbyStores = VALID_STORES.filter(store => {
      const distance = calculateDistance(
        userPosition.latitude,
        userPosition.longitude,
        store.latitude,
        store.longitude
      );
      const isNearby = distance <= maxRadius;
      if (isNearby) {
        logWithTimestamp('log', `✅ Store within 2km radius: ${store.name} (${(distance/1000).toFixed(2)} km)`);
      }
      return isNearby;
    });

    logWithTimestamp('log', `📊 Found ${nearbyStores.length} stores within 2km radius`);

    if (nearbyStores.length === 0) {
      logWithTimestamp('warn', '⚠️ No stores found within 2km radius');
      return [];
    }

    // Calculate walking distances for nearby stores
    const enhancedStores = await Promise.all(
      nearbyStores.map(async (store, index) => {
        try {
          logWithTimestamp('log', `🚶‍♂️ Calculating walking distance for store ${index + 1}: ${store.name}`);
          
          const walkingData = await calculateWalkingDistance(
            userPosition.latitude,
            userPosition.longitude,
            store.latitude,
            store.longitude
          );

          const enhancedStore = {
            ...store,
            walkingDistance: walkingData.distance,
            walkingTime: walkingData.time,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userPosition.latitude},${userPosition.longitude}&destination=${store.latitude},${store.longitude}&travelmode=walking`,
            distanceAccuracy: (walkingData.distance < 0.1 ? 'precise' : 'estimated') as 'precise' | 'estimated'
          };
          
          logDistanceCalculation(
            store.name,
            calculateDistance(userPosition.latitude, userPosition.longitude, store.latitude, store.longitude),
            walkingData.distance,
            walkingData.time
          );
          
          return enhancedStore;
        } catch (error) {
          logWithTimestamp('warn', `⚠️ Error calculating walking distance for ${store.name}:`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Fallback to straight-line distance
          const straightDistance = calculateDistance(
            userPosition.latitude,
            userPosition.longitude,
            store.latitude,
            store.longitude
          ) / 1000;
          
          return {
            ...store,
            walkingDistance: straightDistance * 1.3,
            walkingTime: straightDistance * 12,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${userPosition.latitude},${userPosition.longitude}&destination=${store.latitude},${store.longitude}&travelmode=walking`,
            distanceAccuracy: 'estimated' as 'estimated'
          };
        }
      })
    );

    // Sort by walking distance and return top results
    const sortedStores = enhancedStores
      .sort((a, b) => (a.walkingDistance || 999) - (b.walkingDistance || 999))
      .slice(0, limit);

    const totalTime = performance.now() - startTime;
    logWithTimestamp('log', `✅ getEnhancedNearbyStores completed successfully:`, {
      storesFound: sortedStores.length,
      processingTime: `${totalTime.toFixed(2)} ms`,
      stores: sortedStores.map((store, index) => ({
        rank: index + 1,
        name: store.name,
        walkingDistance: `${store.walkingDistance?.toFixed(2)} km`,
        walkingTime: `${store.walkingTime?.toFixed(1)} min`,
        distanceAccuracy: store.distanceAccuracy
      }))
    });

    return sortedStores;
    
  } catch (error) {
    const totalTime = performance.now() - startTime;
    logWithTimestamp('error', '❌ Error in getEnhancedNearbyStores:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${totalTime.toFixed(2)} ms`
    });
    return [];
  }
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

    const options: PositionOptions = {
      enableHighAccuracy: true, // Enable high-precision geolocation
      timeout: 15000,
      maximumAge: 30000
    };

    logWithTimestamp('log', '📡 Requesting high-precision location...', options);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        logUserCoordinates(position.coords);
        
        // Validate accuracy for 10m threshold
        if (position.coords.accuracy > 10) {
          logWithTimestamp('warn', `⚠️ Accuracy above 10m threshold: ${position.coords.accuracy}m`);
        }
        
        if (position.coords.accuracy > 50) {
          logWithTimestamp('error', `❌ Poor accuracy: ${position.coords.accuracy}m - may affect distance calculations`);
        }
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = `Unknown geolocation error: ${error.message}`;
        }
        
        logWithTimestamp('error', `❌ Geolocation error [${error.code}]:`, {
          message: errorMessage,
          details: error.message
        });

        // Try fallback with reduced accuracy
        logWithTimestamp('log', '🔄 Attempting fallback with reduced accuracy...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            logUserCoordinates(position.coords);
            logWithTimestamp('warn', '⚠️ Using fallback location accuracy:', {
              accuracy: `${position.coords.accuracy}m`
            });
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
            timeout: 60000,
            maximumAge: 600000,
          }
        );
      },
      options
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