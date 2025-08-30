// Standardized error handling utilities for Track & Notify feature

// Error types for better categorization
export enum ErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  LOCATION_TIMEOUT = 'LOCATION_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Standardized error interface
export interface StandardError {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: number;
  originalError?: Error | GeolocationPositionError;
  recoverable: boolean;
  retryable: boolean;
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error handling configuration
interface ErrorConfig {
  logToConsole: boolean;
  showUserNotification: boolean;
  severity: ErrorSeverity;
  autoRetry: boolean;
  maxRetries: number;
}

// Default error configurations
const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  [ErrorType.PERMISSION_DENIED]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.HIGH,
    autoRetry: false,
    maxRetries: 0
  },
  [ErrorType.LOCATION_UNAVAILABLE]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.MEDIUM,
    autoRetry: true,
    maxRetries: 2
  },
  [ErrorType.LOCATION_TIMEOUT]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.MEDIUM,
    autoRetry: true,
    maxRetries: 3
  },
  [ErrorType.NETWORK_ERROR]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.MEDIUM,
    autoRetry: true,
    maxRetries: 3
  },
  [ErrorType.BROWSER_UNSUPPORTED]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.CRITICAL,
    autoRetry: false,
    maxRetries: 0
  },
  [ErrorType.STORAGE_ERROR]: {
    logToConsole: true,
    showUserNotification: false,
    severity: ErrorSeverity.LOW,
    autoRetry: true,
    maxRetries: 2
  },
  [ErrorType.NOTIFICATION_ERROR]: {
    logToConsole: true,
    showUserNotification: false,
    severity: ErrorSeverity.LOW,
    autoRetry: false,
    maxRetries: 0
  },
  [ErrorType.UNKNOWN_ERROR]: {
    logToConsole: true,
    showUserNotification: true,
    severity: ErrorSeverity.MEDIUM,
    autoRetry: false,
    maxRetries: 0
  }
};

/**
 * Convert GeolocationPositionError to StandardError
 */
export const mapGeolocationError = (error: GeolocationPositionError): StandardError => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        type: ErrorType.PERMISSION_DENIED,
        message: `Geolocation permission denied: ${error.message}`,
        userMessage: 'Location access denied. Please enable location permissions in your browser settings.',
        code: error.code,
        originalError: error,
        recoverable: true,
        retryable: false
      };
    case error.POSITION_UNAVAILABLE:
      return {
        type: ErrorType.LOCATION_UNAVAILABLE,
        message: `Location unavailable: ${error.message}`,
        userMessage: 'Location temporarily unavailable. Please try again in a moment.',
        code: error.code,
        originalError: error,
        recoverable: true,
        retryable: true
      };
    case error.TIMEOUT:
      return {
        type: ErrorType.LOCATION_TIMEOUT,
        message: `Location timeout: ${error.message}`,
        userMessage: 'Location request timed out. Please check your connection and try again.',
        code: error.code,
        originalError: error,
        recoverable: true,
        retryable: true
      };
    default:
      return {
        type: ErrorType.UNKNOWN_ERROR,
        message: `Unknown geolocation error: ${error.message}`,
        userMessage: 'Unable to determine your location. Please try again.',
        code: error.code,
        originalError: error,
        recoverable: true,
        retryable: true
      };
  }
};

/**
 * Convert generic Error to StandardError
 */
export const mapGenericError = (error: Error, context: string): StandardError => {
  // Check for specific error patterns
  if (error.message.includes('not supported')) {
    return {
      type: ErrorType.BROWSER_UNSUPPORTED,
      message: `Browser unsupported in ${context}: ${error.message}`,
      userMessage: 'Your browser does not support this feature. Please use a modern browser.',
      originalError: error,
      recoverable: false,
      retryable: false
    };
  }

  if (error.message.includes('network') || error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: `Network error in ${context}: ${error.message}`,
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  if (error.message.includes('localStorage') || error.message.includes('storage')) {
    return {
      type: ErrorType.STORAGE_ERROR,
      message: `Storage error in ${context}: ${error.message}`,
      userMessage: 'Unable to save settings. Please check your browser storage settings.',
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  if (error.message.includes('notification') || error.message.includes('Notification')) {
    return {
      type: ErrorType.NOTIFICATION_ERROR,
      message: `Notification error in ${context}: ${error.message}`,
      userMessage: 'Unable to show notifications. Please check your browser notification settings.',
      originalError: error,
      recoverable: true,
      retryable: false
    };
  }

  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: `Unknown error in ${context}: ${error.message}`,
    userMessage: 'An unexpected error occurred. Please try again.',
    originalError: error,
    recoverable: true,
    retryable: false
  };
};

/**
 * Handle error with standardized logging and user feedback
 */
export const handleError = (
  error: StandardError,
  onUserNotification?: (message: string, type: 'error' | 'warning') => void
): void => {
  const config = ERROR_CONFIGS[error.type];

  // Log to console based on severity
  if (config.logToConsole) {
    switch (config.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(`[${error.type}]`, error.message, error.originalError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`[${error.type}]`, error.message, error.originalError);
        break;
      case ErrorSeverity.LOW:
        console.info(`[${error.type}]`, error.message, error.originalError);
        break;
    }
  }

  // Show user notification if configured and callback provided
  if (config.showUserNotification && onUserNotification) {
    const notificationType = config.severity === ErrorSeverity.CRITICAL || config.severity === ErrorSeverity.HIGH 
      ? 'error' 
      : 'warning';
    onUserNotification(error.userMessage, notificationType);
  }
};

/**
 * Create a retry wrapper for functions that may fail
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  errorType: ErrorType,
  maxRetries?: number
): Promise<T> => {
  const config = ERROR_CONFIGS[errorType];
  const retries = maxRetries ?? config.maxRetries;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt or if not retryable
      if (attempt === retries || !config.autoRetry) {
        throw lastError;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Safe localStorage operations with error handling
 */
export const safeLocalStorage = {
  getItem: (key: string, defaultValue: string | null = null): string | null => {
    try {
      return localStorage.getItem(key) ?? defaultValue;
    } catch (error) {
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'localStorage.getItem'
      );
      handleError(standardError);
      return defaultValue;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'localStorage.setItem'
      );
      handleError(standardError);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'localStorage.removeItem'
      );
      handleError(standardError);
      return false;
    }
  },

  parseJSON: <T>(value: string | null, defaultValue: T): T => {
    if (!value) return defaultValue;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'JSON.parse'
      );
      handleError(standardError);
      return defaultValue;
    }
  }
};

/**
 * Error boundary helper for React components
 */
export const createErrorBoundary = (componentName: string) => {
  return (error: Error, _errorInfo: any) => {
    const standardError = mapGenericError(error, `${componentName} component`);
    handleError(standardError);
  };
};