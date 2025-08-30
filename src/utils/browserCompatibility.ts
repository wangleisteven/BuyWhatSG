// Browser compatibility checks for geolocation and notifications
// Provides comprehensive feature detection and fallback strategies

import {
  mapGenericError,
  handleError
} from './errorHandling';

// Browser compatibility information
export interface BrowserCompatibility {
  geolocation: {
    supported: boolean;
    highAccuracy: boolean;
    watchPosition: boolean;
    permissions: boolean;
    issues: string[];
  };
  notifications: {
    supported: boolean;
    permissions: boolean;
    actions: boolean;
    persistent: boolean;
    issues: string[];
  };
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    issues: string[];
  };
  general: {
    userAgent: string;
    browserName: string;
    browserVersion: string;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isChrome: boolean;
    isFirefox: boolean;
    isSafari: boolean;
    isEdge: boolean;
    issues: string[];
  };
}

// Known browser issues and limitations
const KNOWN_ISSUES = {
  ios: {
    geolocation: [
      'iOS Safari may require user interaction before geolocation works',
      'Background geolocation is limited in iOS Safari',
      'High accuracy may drain battery faster on iOS devices'
    ],
    notifications: [
      'iOS Safari requires user interaction before showing notifications',
      'iOS notifications may not work in standalone web app mode',
      'iOS notification actions have limited support'
    ]
  },
  android: {
    geolocation: [
      'Android Chrome may require HTTPS for geolocation',
      'Some Android browsers have inconsistent geolocation accuracy'
    ],
    notifications: [
      'Android notification behavior varies by browser and OS version',
      'Some Android browsers block notifications by default'
    ]
  },
  firefox: {
    geolocation: [
      'Firefox may show repeated permission prompts for geolocation'
    ],
    notifications: [
      'Firefox notification API has some compatibility quirks'
    ]
  },
  safari: {
    geolocation: [
      'Safari requires HTTPS for geolocation in production',
      'Safari may cache geolocation permissions differently'
    ],
    notifications: [
      'Safari notification support varies by version',
      'Safari may require explicit user interaction for notifications'
    ]
  }
};

/**
 * Detect browser information from user agent
 * @returns Object with browser details
 */
export const detectBrowser = (): {
  name: string;
  version: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
} => {
  const userAgent = navigator.userAgent;
  
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  
  // Browser detection
  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  
  // Extract browser name and version
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (isChrome) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (isFirefox) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (isSafari) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (isEdge) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  
  return {
    name: browserName,
    version: browserVersion,
    isMobile,
    isIOS,
    isAndroid,
    isChrome,
    isFirefox,
    isSafari,
    isEdge
  };
};

/**
 * Check geolocation API compatibility
 * @returns Object with geolocation compatibility details
 */
export const checkGeolocationCompatibility = (): {
  supported: boolean;
  highAccuracy: boolean;
  watchPosition: boolean;
  permissions: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Basic geolocation support
  const supported = 'geolocation' in navigator;
  if (!supported) {
    issues.push('Geolocation API is not supported in this browser');
    return {
      supported: false,
      highAccuracy: false,
      watchPosition: false,
      permissions: false,
      issues
    };
  }
  
  // Check for HTTPS requirement
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    issues.push('Geolocation requires HTTPS in production environments');
  }
  
  // Check high accuracy support
  const highAccuracy = typeof navigator.geolocation.getCurrentPosition === 'function';
  
  // Check watch position support
  const watchPosition = typeof navigator.geolocation.watchPosition === 'function';
  
  // Check permissions API support
  const permissions = 'permissions' in navigator;
  
  // Browser-specific issues
  const browser = detectBrowser();
  if (browser.isIOS && KNOWN_ISSUES.ios.geolocation) {
    issues.push(...KNOWN_ISSUES.ios.geolocation);
  }
  if (browser.isAndroid && KNOWN_ISSUES.android.geolocation) {
    issues.push(...KNOWN_ISSUES.android.geolocation);
  }
  if (browser.isFirefox && KNOWN_ISSUES.firefox.geolocation) {
    issues.push(...KNOWN_ISSUES.firefox.geolocation);
  }
  if (browser.isSafari && KNOWN_ISSUES.safari.geolocation) {
    issues.push(...KNOWN_ISSUES.safari.geolocation);
  }
  
  return {
    supported,
    highAccuracy,
    watchPosition,
    permissions,
    issues
  };
};

/**
 * Check notification API compatibility
 * @returns Object with notification compatibility details
 */
export const checkNotificationCompatibility = (): {
  supported: boolean;
  permissions: boolean;
  actions: boolean;
  persistent: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Basic notification support
  const supported = 'Notification' in window;
  if (!supported) {
    issues.push('Notification API is not supported in this browser');
    return {
      supported: false,
      permissions: false,
      actions: false,
      persistent: false,
      issues
    };
  }
  
  // Check permissions API support
  const permissions = 'permissions' in navigator;
  
  // Check notification actions support
  const actions = 'serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype;
  
  // Check persistent notifications support
  const persistent = 'serviceWorker' in navigator;
  
  // Browser-specific issues
  const browser = detectBrowser();
  if (browser.isIOS && KNOWN_ISSUES.ios.notifications) {
    issues.push(...KNOWN_ISSUES.ios.notifications);
  }
  if (browser.isAndroid && KNOWN_ISSUES.android.notifications) {
    issues.push(...KNOWN_ISSUES.android.notifications);
  }
  if (browser.isFirefox && KNOWN_ISSUES.firefox.notifications) {
    issues.push(...KNOWN_ISSUES.firefox.notifications);
  }
  if (browser.isSafari && KNOWN_ISSUES.safari.notifications) {
    issues.push(...KNOWN_ISSUES.safari.notifications);
  }
  
  return {
    supported,
    permissions,
    actions,
    persistent,
    issues
  };
};

/**
 * Check storage API compatibility
 * @returns Object with storage compatibility details
 */
export const checkStorageCompatibility = (): {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Check localStorage
  let localStorage = false;
  try {
    localStorage = 'localStorage' in window && window.localStorage !== null;
    if (localStorage) {
      // Test actual functionality
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
    }
  } catch (error) {
    localStorage = false;
    issues.push('localStorage is not available or blocked');
  }
  
  // Check sessionStorage
  let sessionStorage = false;
  try {
    sessionStorage = 'sessionStorage' in window && window.sessionStorage !== null;
    if (sessionStorage) {
      // Test actual functionality
      const testKey = '__session_test__';
      window.sessionStorage.setItem(testKey, 'test');
      window.sessionStorage.removeItem(testKey);
    }
  } catch (error) {
    sessionStorage = false;
    issues.push('sessionStorage is not available or blocked');
  }
  
  // Check IndexedDB
  const indexedDB = 'indexedDB' in window;
  if (!indexedDB) {
    issues.push('IndexedDB is not supported in this browser');
  }
  
  return {
    localStorage,
    sessionStorage,
    indexedDB,
    issues
  };
};

/**
 * Perform comprehensive browser compatibility check
 * @returns Complete browser compatibility report
 */
export const checkBrowserCompatibility = (): BrowserCompatibility => {
  const browser = detectBrowser();
  const geolocation = checkGeolocationCompatibility();
  const notifications = checkNotificationCompatibility();
  const storage = checkStorageCompatibility();
  
  const generalIssues: string[] = [];
  
  // Check for critical compatibility issues
  if (!geolocation.supported && !notifications.supported) {
    generalIssues.push('This browser does not support core features required for Track & Notify');
  }
  
  if (browser.isMobile && browser.isIOS) {
    generalIssues.push('iOS devices may have limited background functionality');
  }
  
  if (!storage.localStorage) {
    generalIssues.push('Local storage is not available - user preferences cannot be saved');
  }
  
  return {
    geolocation,
    notifications,
    storage,
    general: {
      userAgent: navigator.userAgent,
      browserName: browser.name,
      browserVersion: browser.version,
      isMobile: browser.isMobile,
      isIOS: browser.isIOS,
      isAndroid: browser.isAndroid,
      isChrome: browser.isChrome,
      isFirefox: browser.isFirefox,
      isSafari: browser.isSafari,
      isEdge: browser.isEdge,
      issues: generalIssues
    }
  };
};

/**
 * Check if the current browser environment is suitable for Track & Notify
 * @returns Object with suitability assessment
 */
export const assessTrackNotifyCompatibility = (): {
  suitable: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
} => {
  const compatibility = checkBrowserCompatibility();
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Critical issues that prevent functionality
  if (!compatibility.geolocation.supported) {
    criticalIssues.push('Geolocation API is not supported - location tracking will not work');
  }
  
  if (!compatibility.notifications.supported) {
    criticalIssues.push('Notification API is not supported - notifications will not work');
  }
  
  if (!compatibility.storage.localStorage) {
    criticalIssues.push('Local storage is not available - user preferences cannot be saved');
  }
  
  // Warnings for potential issues
  if (compatibility.geolocation.issues.length > 0) {
    warnings.push(...compatibility.geolocation.issues);
  }
  
  if (compatibility.notifications.issues.length > 0) {
    warnings.push(...compatibility.notifications.issues);
  }
  
  if (compatibility.general.issues.length > 0) {
    warnings.push(...compatibility.general.issues);
  }
  
  // Recommendations for better experience
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    recommendations.push('Use HTTPS for better geolocation and notification support');
  }
  
  if (compatibility.general.isMobile) {
    recommendations.push('Ensure location and notification permissions are granted for best experience');
  }
  
  if (compatibility.general.isIOS) {
    recommendations.push('Add this web app to your home screen for better iOS compatibility');
  }
  
  if (!compatibility.notifications.persistent) {
    recommendations.push('Consider enabling service workers for persistent notifications');
  }
  
  const suitable = criticalIssues.length === 0;
  
  return {
    suitable,
    criticalIssues,
    warnings,
    recommendations
  };
};

/**
 * Log browser compatibility information for debugging
 * @param detailed Whether to include detailed information
 */
export const logBrowserCompatibility = (detailed: boolean = false): void => {
  const compatibility = checkBrowserCompatibility();
  const assessment = assessTrackNotifyCompatibility();
  
  console.group('🌐 Browser Compatibility Report');
  
  console.log('Browser:', compatibility.general.browserName, compatibility.general.browserVersion);
  console.log('Platform:', compatibility.general.isMobile ? 'Mobile' : 'Desktop');
  console.log('Suitable for Track & Notify:', assessment.suitable ? '✅ Yes' : '❌ No');
  
  if (assessment.criticalIssues.length > 0) {
    console.group('🚨 Critical Issues');
    assessment.criticalIssues.forEach(issue => console.error('•', issue));
    console.groupEnd();
  }
  
  if (assessment.warnings.length > 0) {
    console.group('⚠️ Warnings');
    assessment.warnings.forEach(warning => console.warn('•', warning));
    console.groupEnd();
  }
  
  if (assessment.recommendations.length > 0) {
    console.group('💡 Recommendations');
    assessment.recommendations.forEach(rec => console.info('•', rec));
    console.groupEnd();
  }
  
  if (detailed) {
    console.group('📋 Detailed Compatibility');
    console.log('Geolocation:', compatibility.geolocation);
    console.log('Notifications:', compatibility.notifications);
    console.log('Storage:', compatibility.storage);
    console.groupEnd();
  }
  
  console.groupEnd();
};

/**
 * Handle browser compatibility issues with user-friendly messages
 * @param compatibility Browser compatibility report
 */
export const handleCompatibilityIssues = (_compatibility: BrowserCompatibility): void => {
  const assessment = assessTrackNotifyCompatibility();
  
  if (!assessment.suitable) {
    // Handle critical compatibility issues
    assessment.criticalIssues.forEach(issue => {
      const error = mapGenericError(
        new Error(issue),
        'browser compatibility check'
      );
      handleError(error);
    });
  }
  
  // Log warnings for debugging
  assessment.warnings.forEach(warning => {
    console.warn('Browser compatibility warning:', warning);
  });
};