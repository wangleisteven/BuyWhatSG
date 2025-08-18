import type { ShoppingList } from '../types';
import type { FairPriceStore } from './geolocation';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  // actions?: NotificationAction[]; // Commented out - not commonly used in basic notifications
}

/**
 * Request notification permission from the user
 * @returns Promise with permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
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
    console.warn('Notifications not available or not permitted');
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
    console.error('Error showing notification:', error);
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

  if (notification && onNotificationClick) {
    notification.onclick = () => {
      onNotificationClick(primaryList.id);
      notification.close();
    };

    // Auto-close notification after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);
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

    if (notification && onNotificationClick) {
      notification.onclick = () => {
        onNotificationClick(list.id);
        notification.close();
      };

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
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

/**
 * Check if user has been notified recently for a specific store
 * @param storeId Store identifier
 * @param cooldownMinutes Cooldown period in minutes (default: 30)
 * @returns boolean indicating if user was recently notified
 */
export const wasRecentlyNotified = (
  storeId: string,
  cooldownMinutes: number = 30
): boolean => {
  const key = `notification_cooldown_${storeId}`;
  const lastNotified = localStorage.getItem(key);
  
  if (!lastNotified) {
    return false;
  }
  
  const lastNotifiedTime = parseInt(lastNotified, 10);
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return Date.now() - lastNotifiedTime < cooldownMs;
};

/**
 * Mark that user has been notified for a specific store
 * @param storeId Store identifier
 */
export const markAsNotified = (storeId: string): void => {
  const key = `notification_cooldown_${storeId}`;
  localStorage.setItem(key, Date.now().toString());
};