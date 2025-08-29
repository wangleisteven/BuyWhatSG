import { useState, useEffect } from 'react';
import type { ShoppingList } from '../types';

/**
 * Filter out deleted lists and items from shopping lists data
 */
const filterDeletedData = <T>(data: T): T => {
  // Check if data is an array of shopping lists
  if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && 'items' in data[0]) {
    const lists = data as unknown as ShoppingList[];
    const filteredLists = lists
      .filter(list => list.deleted !== true) // Filter out deleted lists
      .map(list => ({
        ...list,
        items: list.items.filter(item => item.deleted !== true) // Filter out deleted items
      }));
    return filteredLists as unknown as T;
  }
  return data;
};

/**
 * Custom hook to persist state in local storage with support for authenticated and non-authenticated states
 * @param key The base key to store the value under in localStorage
 * @param initialValue The initial value to use if no value is found in localStorage
 * @param isAuthenticated Whether the user is authenticated
 * @param userId Optional user ID for authenticated users
 * @returns [storedValue, setValue] - A stateful value and a function to update it
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  isAuthenticated: boolean = false,
  userId?: string
): [T, (value: T | ((val: T) => T)) => void, { getGuestData: () => T; copyGuestDataToAuth: () => T }] {
  // Determine the actual storage key based on authentication state
  const storageKey = isAuthenticated && userId 
    ? `${key}_auth_${userId}` // Authenticated user-specific storage
    : `${key}_guest`; // Non-authenticated user storage

  // Get from local storage then parse json or return initialValue
  const readValue = (): T => {
    // Prevent build error "window is undefined" but keep working
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(storageKey);
      console.log(`[useLocalStorage] Reading from ${storageKey}:`, { item, hasItem: !!item });
      if (item) {
        const parsedData = JSON.parse(item) as T;
        const filteredData = filterDeletedData(parsedData);
        console.log(`[useLocalStorage] Parsed data from ${storageKey}:`, { parsedData, filteredData });
        return filteredData;
      }
      console.log(`[useLocalStorage] No data found in ${storageKey}, returning initialValue`);
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${storageKey}":`, error);
      return initialValue;
    }
  };

  // State to store our value - always read from storage on initial mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    // On initial mount, always try to read from storage first
    const storageValue = readValue();
    console.log(`[useLocalStorage] Initializing ${storageKey}:`, {
      storageValue,
      initialValue,
      storageValueStr: JSON.stringify(storageValue),
      initialValueStr: JSON.stringify(initialValue),
      willUseStorage: JSON.stringify(storageValue) !== JSON.stringify(initialValue)
    });
    // If storage has meaningful data (different from initialValue), use it
    if (JSON.stringify(storageValue) !== JSON.stringify(initialValue)) {
      console.log(`[useLocalStorage] Using storage value for ${storageKey}`);
      return storageValue;
    }
    console.log(`[useLocalStorage] Using initial value for ${storageKey}`);
    return initialValue;
  });

  // Update stored value when authentication state changes
  useEffect(() => {
    // Save current state to the new storage key before switching
    const newValue = readValue();
    
    setStoredValue(prevValue => {
      // Always preserve current state in memory when switching authentication states
      // Only read from storage if we don't have meaningful data in memory
      if (JSON.stringify(prevValue) !== JSON.stringify(initialValue)) {
        // CRITICAL FIX: Only save current state if we're switching TO authenticated storage
        // Never save authenticated data to guest storage to prevent contamination
        const isMovingToAuth = isAuthenticated && userId;
        const isMovingToGuest = !isAuthenticated;
        
        if (isMovingToAuth) {
          // Moving from guest to authenticated - safe to save guest data to auth storage
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(storageKey, JSON.stringify(prevValue));
            }
          } catch (error) {
            console.warn(`Error saving current state to new storage key:`, error);
          }
          return prevValue; // Keep current state in memory
        } else if (isMovingToGuest) {
          // Moving from authenticated to guest - DON'T save authenticated data to guest storage
          // Instead, load fresh guest data from storage
          console.log('[useLocalStorage] Switching to guest mode - loading fresh guest data instead of saving authenticated data');
          return newValue; // Use fresh guest data from storage
        }
        
        return prevValue; // Keep current state in memory for other cases
      }
      // Only use storage value if we don't have meaningful data in memory
      return newValue;
    });
  }, [isAuthenticated, userId]);

  // Helper function to get guest data
  const getGuestData = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const guestKey = `${key}_guest`;
      const item = window.localStorage.getItem(guestKey);
      if (item) {
        const parsedData = JSON.parse(item) as T;
        return filterDeletedData(parsedData);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading guest localStorage key "${key}_guest":`, error);
      return initialValue;
    }
  };

  // Helper function to copy guest data to authenticated storage
  const copyGuestDataToAuth = (): T => {
    const guestData = getGuestData();
    if (isAuthenticated && userId && guestData !== initialValue) {
      // Save guest data to authenticated storage
      try {
        const authKey = `${key}_auth_${userId}`;
        window.localStorage.setItem(authKey, JSON.stringify(guestData));
      } catch (error) {
        console.warn(`Error copying guest data to authenticated storage:`, error);
      }
    }
    return guestData;
  };

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${storageKey}":`, error);
    }
  };

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const parsedData = JSON.parse(e.newValue) as T;
        setStoredValue(filterDeletedData(parsedData));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  return [storedValue, setValue, { getGuestData, copyGuestDataToAuth }];
}