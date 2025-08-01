import { useState, useEffect } from 'react';

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
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${storageKey}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Update stored value when authentication state changes
  useEffect(() => {
    console.log(`[DEBUG] useLocalStorage effect: key=${key}, isAuthenticated=${isAuthenticated}, userId=${userId}, storageKey=${storageKey}`);
    
    // Save current state to the new storage key before switching
    const currentValue = storedValue;
    const newValue = readValue();
    
    console.log(`[DEBUG] useLocalStorage effect: currentValue length=${Array.isArray(currentValue) ? currentValue.length : 'not array'}, newValue length=${Array.isArray(newValue) ? newValue.length : 'not array'}`);
    
    setStoredValue(prevValue => {
      console.log(`[DEBUG] useLocalStorage effect: prevValue length=${Array.isArray(prevValue) ? prevValue.length : 'not array'}`);
      
      // If we have meaningful data in memory, preserve it and save to new storage
      if (prevValue !== initialValue && JSON.stringify(prevValue) !== JSON.stringify(initialValue)) {
        console.log(`[DEBUG] useLocalStorage effect: Preserving current state and saving to new storage key`);
        // Save current state to the new storage key
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, JSON.stringify(prevValue));
          }
        } catch (error) {
          console.warn(`Error saving current state to new storage key:`, error);
        }
        return prevValue;
      }
      console.log(`[DEBUG] useLocalStorage effect: Using newValue from storage`);
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
      return item ? (JSON.parse(item) as T) : initialValue;
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
        console.log(`Copied guest data to authenticated storage: ${authKey}`);
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
        setStoredValue(JSON.parse(e.newValue) as T);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  return [storedValue, setValue, { getGuestData, copyGuestDataToAuth }];
}