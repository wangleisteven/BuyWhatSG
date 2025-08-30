import type { ShoppingList } from '../types';
import type { FairPriceStore } from './geolocation';
import {
  mapGenericError,
  handleError,
  safeLocalStorage
} from '../utils/errorHandling';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  // actions?: NotificationAction[]; // Commented out - not commonly used in basic notifications
}

// Enhanced notification click handler interface
export interface NotificationClickHandler {
  listId: string;
  callback: (listId: string) => void;
  timeout?: number;
  maxRetries?: number;
}

// Notification click validation and error handling
interface ClickHandlerValidation {
  isValid: boolean;
  error?: string;
  sanitizedListId?: string;
}

/**
 * Validate notification click handler parameters
 */
const validateClickHandler = (handler: NotificationClickHandler): ClickHandlerValidation => {
  try {
    // Validate listId
    if (!handler.listId || typeof handler.listId !== 'string') {
      return {
        isValid: false,
        error: 'Invalid or missing listId'
      };
    }
    
    // Sanitize listId (remove potentially harmful characters)
    const sanitizedListId = handler.listId.replace(/[^a-zA-Z0-9-_]/g, '');
    
    if (sanitizedListId.length === 0) {
      return {
        isValid: false,
        error: 'ListId contains no valid characters'
      };
    }
    
    // Validate callback function
    if (!handler.callback || typeof handler.callback !== 'function') {
      return {
        isValid: false,
        error: 'Invalid or missing callback function'
      };
    }
    
    // Validate optional parameters
    if (handler.timeout !== undefined && (typeof handler.timeout !== 'number' || handler.timeout < 0)) {
      return {
        isValid: false,
        error: 'Invalid timeout value'
      };
    }
    
    if (handler.maxRetries !== undefined && (typeof handler.maxRetries !== 'number' || handler.maxRetries < 0)) {
      return {
        isValid: false,
        error: 'Invalid maxRetries value'
      };
    }
    
    return {
      isValid: true,
      sanitizedListId
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Create a safe notification click handler with validation and error handling
 */
const createSafeNotificationClickHandler = (handler: NotificationClickHandler): (event: Event) => void => {
  const validation = validateClickHandler(handler);
  
  if (!validation.isValid) {
    const error = mapGenericError(
      new Error(`Click handler validation failed: ${validation.error}`),
      'createSafeNotificationClickHandler'
    );
    handleError(error);
    
    // Return a no-op function for invalid handlers
    return () => {
      console.warn('Notification click ignored due to validation failure');
    };
  }
  
  const { sanitizedListId } = validation;
  const maxRetries = handler.maxRetries || 3;
  let retryCount = 0;
  
  return (event: Event) => {
    try {
      // Prevent default behavior
      event.preventDefault();
      
      // Log click event for debugging
      console.debug(`Notification clicked for list: ${sanitizedListId}`);
      
      // Validate that the callback is still a function (defensive programming)
      if (typeof handler.callback !== 'function') {
        throw new Error('Callback function is no longer valid');
      }
      
      // Execute the callback with error handling
      handler.callback(sanitizedListId!);
      
      // Close the notification if it's still available
      const notification = event.target as Notification;
      if (notification && typeof notification.close === 'function') {
        notification.close();
      }
      
      // Reset retry count on successful execution
      retryCount = 0;
      
    } catch (error) {
      retryCount++;
      
      const standardError = mapGenericError(
        error instanceof Error ? error : new Error(String(error)),
        'notificationClickHandler'
      );
      
      // Log the error with context
      console.error(`Notification click handler error (attempt ${retryCount}/${maxRetries}):`, {
        listId: sanitizedListId,
        error: standardError.message,
        retryCount
      });
      
      // Handle error through standardized system
      handleError(standardError);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries) {
        console.debug(`Retrying notification click handler in 1 second...`);
        setTimeout(() => {
          try {
            handler.callback(sanitizedListId!);
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }, 1000);
      } else {
        console.error(`Max retries (${maxRetries}) exceeded for notification click handler`);
      }
    }
  };
};

/**
 * Request notification permission from the user
 * @returns Promise with permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    const error = mapGenericError(
      new Error('This browser does not support notifications'),
      'requestNotificationPermission'
    );
    handleError(error);
    throw error.originalError;
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    const standardError = mapGenericError(
      error instanceof Error ? error : new Error(String(error)),
      'requestNotificationPermission'
    );
    handleError(standardError);
    throw error;
  }
};

/**
 * Check if notifications are supported and permitted
 * @returns boolean indicating if notifications can be shown
 */
export const canShowNotifications = (): boolean => {
  return (
    'Notification' in window &&
    Notification.permission === 'granted'
  );
};

/**
 * Show a browser notification
 * @param options Notification options
 * @returns Promise with the notification instance
 */
export const showNotification = async (
  options: NotificationOptions
): Promise<Notification | null> => {
  if (!canShowNotifications()) {
    const error = mapGenericError(
      new Error('Notifications not available or not permitted'),
      'showNotification'
    );
    handleError(error);
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.svg',
      badge: options.badge || '/favicon.svg',
      tag: options.tag,
      data: options.data,
      requireInteraction: true, // Keep notification visible until user interacts
    });

    return notification;
  } catch (error) {
    const standardError = mapGenericError(
      error instanceof Error ? error : new Error(String(error)),
      'showNotification'
    );
    handleError(standardError);
    return null;
  }
};

/**
 * Show shopping list notification when near FairPrice store
 * @param store The nearby FairPrice store
 * @param shoppingLists User's active shopping lists
 * @param onNotificationClick Callback when notification is clicked
 */
export const showShoppingListNotification = async (
  store: FairPriceStore,
  shoppingLists: ShoppingList[],
  onNotificationClick?: (listId: string) => void
): Promise<void> => {
  // Filter for active lists with incomplete items
  const activeLists = shoppingLists.filter(
    (list) =>
      list.deleted !== true &&
      list.items.some((item) => !item.completed && item.deleted !== true)
  );

  if (activeLists.length === 0) {
    return; // No active lists with incomplete items
  }

  // Use the first active list for the notification
  const primaryList = activeLists[0];
  const incompleteItemsCount = primaryList.items.filter(
    (item) => !item.completed && item.deleted !== true
  ).length;

  const notificationOptions: NotificationOptions = {
    title: 'BuyWhatSG - Shopping Reminder',
    body: `You're near ${store.name}! Open your shopping list "${primaryList.name}" now? (${incompleteItemsCount} items remaining)`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `fairprice-${store.name}-${primaryList.id}`,
    data: {
      listId: primaryList.id,
      listName: primaryList.name,
      storeId: store.name,
      storeName: store.name,
    },
  };

  const notification = await showNotification(notificationOptions);

  if (notification) {
    // Enhanced click handler with validation and error handling
    const clickHandler = createSafeNotificationClickHandler({
      listId: primaryList.id,
      callback: onNotificationClick || (() => {}),
      timeout: 10000,
      maxRetries: 3
    });
    
    notification.onclick = clickHandler;
    
    // Enhanced error handling for notification events
    notification.onerror = (event) => {
      const error = mapGenericError(
        new Error(`Notification error: ${event}`),
        'notification.onerror'
      );
      handleError(error);
    };
    
    notification.onclose = () => {
      console.debug(`Notification closed for list: ${primaryList.id}`);
    };

    // Auto-close notification after timeout with error handling
    const autoCloseTimer = setTimeout(() => {
      try {
        if (notification) {
          notification.close();
        }
      } catch (error) {
        console.warn('Error auto-closing notification:', error);
      }
    }, 10000);
    
    // Clear timer if notification is manually closed
    notification.onclose = () => {
      clearTimeout(autoCloseTimer);
      console.debug(`Notification closed for list: ${primaryList.id}`);
    };
  }
};

/**
 * Show multiple shopping list notifications if user has multiple active lists
 * @param store The nearby FairPrice store
 * @param shoppingLists User's active shopping lists
 * @param onNotificationClick Callback when notification is clicked
 */
export const showMultipleShoppingListNotifications = async (
  store: FairPriceStore,
  shoppingLists: ShoppingList[],
  onNotificationClick?: (listId: string) => void
): Promise<void> => {
  // Filter for active lists with incomplete items
  const activeLists = shoppingLists.filter(
    (list) =>
      list.deleted !== true &&
      list.items.some((item) => !item.completed && item.deleted !== true)
  );

  if (activeLists.length === 0) {
    return; // No active lists with incomplete items
  }

  // Show notification for each active list (max 3 to avoid spam)
  const listsToNotify = activeLists.slice(0, 3);

  for (const list of listsToNotify) {
    const incompleteItemsCount = list.items.filter(
      (item) => !item.completed && item.deleted !== true
    ).length;

    const notificationOptions: NotificationOptions = {
      title: 'BuyWhatSG - Shopping Reminder',
      body: `You're near ${store.name}! Open "${list.name}"? (${incompleteItemsCount} items remaining)`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `fairprice-${store.name}-${list.id}`,
      data: {
        listId: list.id,
        listName: list.name,
        storeId: store.name,
        storeName: store.name,
      },
    };

    const notification = await showNotification(notificationOptions);

    if (notification) {
      // Enhanced click handler with validation and error handling
      const clickHandler = createSafeNotificationClickHandler({
        listId: list.id,
        callback: onNotificationClick || (() => {}),
        timeout: 10000,
        maxRetries: 3
      });
      
      notification.onclick = clickHandler;
      
      // Enhanced error handling for notification events
      notification.onerror = (event) => {
        const error = mapGenericError(
          new Error(`Notification error for list ${list.id}: ${event}`),
          'notification.onerror'
        );
        handleError(error);
      };

      // Auto-close notification after timeout with error handling
      const autoCloseTimer = setTimeout(() => {
        try {
          if (notification) {
            notification.close();
          }
        } catch (error) {
          console.warn(`Error auto-closing notification for list ${list.id}:`, error);
        }
      }, 10000);
      
      // Clear timer if notification is manually closed
      notification.onclose = () => {
        clearTimeout(autoCloseTimer);
        console.debug(`Notification closed for list: ${list.id}`);
      };
    }

    // Add small delay between notifications
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

/**
 * Clear all BuyWhatSG notifications
 */
export const clearAllNotifications = (): void => {
  // This is a browser limitation - we can't programmatically clear notifications
  // But we can use tags to replace old notifications with new ones
  console.log('Clearing notifications (browser limitation - use tags to replace)');
};

// Enhanced notification spam prevention with unique store identification
interface NotificationRecord {
  storeId: string;
  storeName: string;
  storeAddress: string;
  timestamp: number;
  notificationCount: number;
  listIds: string[];
}

/**
 * Generate unique store identifier using name and address
 * @param store FairPrice store object
 * @returns Unique store identifier
 */
export const generateStoreId = (store: FairPriceStore): string => {
  // Create a more unique identifier using name and address
  const normalizedName = store.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedAddress = store.address.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalizedName}_${normalizedAddress.substring(0, 20)}`;
};

/**
 * Get notification history for analysis and spam prevention
 * @returns Array of recent notification records
 */
export const getNotificationHistory = (): NotificationRecord[] => {
  const historyData = safeLocalStorage.getItem('notification_history');
  if (!historyData) {
    return [];
  }
  
  const history = safeLocalStorage.parseJSON(historyData, []) as NotificationRecord[];
  
  // Clean up old records (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return history.filter(record => record.timestamp > oneDayAgo);
};

/**
 * Save notification history
 * @param history Array of notification records
 */
const saveNotificationHistory = (history: NotificationRecord[]): void => {
  safeLocalStorage.setItem('notification_history', JSON.stringify(history));
};

/**
 * Check if user has been notified recently for a specific store with enhanced spam prevention
 * @param store FairPrice store object
 * @param listIds Array of shopping list IDs that would be notified
 * @param cooldownMinutes Cooldown period in minutes (default: 30)
 * @returns Object with spam prevention details
 */
export const checkNotificationSpam = (
  store: FairPriceStore,
  listIds: string[],
  cooldownMinutes: number = 30
): {
  shouldNotify: boolean;
  reason?: string;
  nextAllowedTime?: number;
  notificationCount?: number;
} => {
  const storeId = generateStoreId(store);
  const history = getNotificationHistory();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const now = Date.now();
  
  // Find recent notifications for this store
  const storeNotifications = history.filter(record => record.storeId === storeId);
  
  if (storeNotifications.length === 0) {
    return { shouldNotify: true };
  }
  
  // Check basic cooldown period
  const lastNotification = storeNotifications[storeNotifications.length - 1];
  const timeSinceLastNotification = now - lastNotification.timestamp;
  
  if (timeSinceLastNotification < cooldownMs) {
    return {
      shouldNotify: false,
      reason: 'Recent notification cooldown active',
      nextAllowedTime: lastNotification.timestamp + cooldownMs,
      notificationCount: lastNotification.notificationCount
    };
  }
  
  // Check for excessive notifications (more than 5 in the last 4 hours)
  const fourHoursAgo = now - (4 * 60 * 60 * 1000);
  const recentNotifications = storeNotifications.filter(
    record => record.timestamp > fourHoursAgo
  );
  
  if (recentNotifications.length >= 5) {
    return {
      shouldNotify: false,
      reason: 'Too many notifications for this store today',
      nextAllowedTime: recentNotifications[0].timestamp + (4 * 60 * 60 * 1000),
      notificationCount: recentNotifications.length
    };
  }
  
  // Check if same shopping lists were already notified recently (within 2 hours)
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  const recentSameListNotifications = storeNotifications.filter(
    record => record.timestamp > twoHoursAgo &&
               record.listIds.some(listId => listIds.includes(listId))
  );
  
  if (recentSameListNotifications.length > 0) {
    return {
      shouldNotify: false,
      reason: 'Same shopping lists already notified recently',
      nextAllowedTime: recentSameListNotifications[0].timestamp + (2 * 60 * 60 * 1000),
      notificationCount: recentSameListNotifications.length
    };
  }
  
  return { shouldNotify: true };
};

/**
 * Legacy function for backward compatibility
 * @param storeId Store identifier (name)
 * @param cooldownMinutes Cooldown period in minutes
 * @returns boolean indicating if user was recently notified
 */
export const wasRecentlyNotified = (
  storeId: string,
  cooldownMinutes: number = 30
): boolean => {
  // For backward compatibility, create a minimal store object
  const store: FairPriceStore = {
    name: storeId,
    address: '',
    latitude: null,
    longitude: null,
    hours: ''
  };
  
  const spamCheck = checkNotificationSpam(store, [], cooldownMinutes);
  return !spamCheck.shouldNotify;
};

/**
 * Record a notification with enhanced tracking
 * @param store FairPrice store object
 * @param listIds Array of shopping list IDs that were notified
 */
export const recordNotification = (
  store: FairPriceStore,
  listIds: string[]
): void => {
  const storeId = generateStoreId(store);
  const history = getNotificationHistory();
  
  // Count recent notifications for this store
  const storeNotifications = history.filter(record => record.storeId === storeId);
  const notificationCount = storeNotifications.length + 1;
  
  const newRecord: NotificationRecord = {
    storeId,
    storeName: store.name,
    storeAddress: store.address,
    timestamp: Date.now(),
    notificationCount,
    listIds: [...listIds]
  };
  
  history.push(newRecord);
  saveNotificationHistory(history);
};

/**
 * Legacy function for backward compatibility
 * @param storeId Store identifier (name)
 */
export const markAsNotified = (storeId: string): void => {
  // For backward compatibility, create a minimal store object
  const store: FairPriceStore = {
    name: storeId,
    address: '',
    latitude: null,
    longitude: null,
    hours: ''
  };
  
  recordNotification(store, []);
};

/**
 * Clear notification history (for testing or user preference)
 */
export const clearNotificationHistory = (): void => {
  safeLocalStorage.removeItem('notification_history');
};

/**
 * Get notification statistics for debugging
 * @returns Object with notification statistics
 */
export const getNotificationStats = (): {
  totalNotifications: number;
  uniqueStores: number;
  averageNotificationsPerStore: number;
  mostNotifiedStore: string;
} => {
  const history = getNotificationHistory();
  
  if (history.length === 0) {
    return {
      totalNotifications: 0,
      uniqueStores: 0,
      averageNotificationsPerStore: 0,
      mostNotifiedStore: 'None'
    };
  }
  
  const storeGroups = history.reduce((acc, record) => {
    if (!acc[record.storeId]) {
      acc[record.storeId] = {
        name: record.storeName,
        count: 0
      };
    }
    acc[record.storeId].count++;
    return acc;
  }, {} as Record<string, { name: string; count: number }>);
  
  const uniqueStores = Object.keys(storeGroups).length;
  const averageNotificationsPerStore = history.length / uniqueStores;
  
  const mostNotifiedStore = Object.values(storeGroups).reduce(
    (max, store) => store.count > max.count ? store : max,
    { name: 'None', count: 0 }
  ).name;
  
  return {
    totalNotifications: history.length,
    uniqueStores,
    averageNotificationsPerStore: Math.round(averageNotificationsPerStore * 100) / 100,
    mostNotifiedStore
  };
};