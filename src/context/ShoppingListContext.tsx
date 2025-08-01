import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { ShoppingItem, ShoppingList } from '../types/shopping';
import { useAlert } from './AlertContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  getUserLists,
  saveListToFirestore,
  updateListInFirestore,
  deleteListFromFirestore,
  saveItemToFirestore,
  updateItemInFirestore,
  deleteItemFromFirestore,
  syncLocalListsToFirestore
} from '../services/firestore';

type ShoppingListContextType = {
  lists: ShoppingList[];
  currentList: ShoppingList | null;
  setCurrentList: (list: ShoppingList | null) => void;
  createList: (name: string) => Promise<ShoppingList | null>;
  updateList: (id: string, updates: Partial<ShoppingList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  duplicateList: (id: string) => Promise<void>;
  archiveList: (id: string) => void;
  unarchiveList: (id: string) => void;
  addItem: (listId: string, item: Omit<ShoppingItem, 'id' | 'position'>) => Promise<void>;
  addItems: (listId: string, items: Omit<ShoppingItem, 'id' | 'position'>[]) => Promise<void>;
  updateItem: (listId: string, itemId: string, updates: Partial<ShoppingItem>) => Promise<void>;
  deleteItem: (listId: string, itemId: string) => Promise<ShoppingItem | null>;
  toggleItemCompletion: (listId: string, itemId: string) => Promise<void>;
  reorderItems: (listId: string, startIndex: number, endIndex: number) => Promise<void>;
  lastDeletedItem: { listId: string; item: ShoppingItem } | null;
  undoDeleteItem: () => void;
};

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

// Helper function to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Create the education list as specified in requirements
const createEducationList = (): ShoppingList => {
  return {
    id: 'education-list',
    name: 'Education List',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items: [
      {
        id: generateId(),
        name: '👈 Tap here to check off this item',
        quantity: 1,
        completed: false,
        category: 'general',
        position: 0
      },
      {
        id: generateId(),
        name: 'Tap the item ☝️ to edit name, quantity, even upload the photo',
        quantity: 1,
        completed: false,
        category: 'general',
        position: 1
      },
      {
        id: generateId(),
        name: 'Swipe the item to the left 🫲 to delete the item',
        quantity: 1,
        completed: false,
        category: 'general',
        position: 2
      }
    ]
  };
};

export const ShoppingListProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { showAlert } = useAlert();
  
  // Queue system for async operations (moved up to be available for useLocalStorage)
  type Operation = () => Promise<void>;
  const [pendingOperations, setPendingOperations] = useState<Operation[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Initialize lists using our enhanced useLocalStorage hook with separate storage for authenticated and non-authenticated users
  const [lists, setListsOriginal, { getGuestData, copyGuestDataToAuth }] = useLocalStorage<ShoppingList[]>(
    'shoppingLists',
    [createEducationList()],
    isAuthenticated,
    user?.id
  );
  
  // Wrap setLists with debug logging and protection against state overwrites during operations
  const setLists = useCallback((newLists: ShoppingList[] | ((prev: ShoppingList[]) => ShoppingList[])) => {
    const stack = new Error().stack;
    const caller = stack?.split('\n')[2]?.trim() || 'unknown';
    
    // CRITICAL: Block state changes from useLocalStorage during active operations
    if ((pendingOperations.length > 0 || isProcessingQueue) && caller.includes('useLocalStorage')) {
      console.log(`[DEBUG] setLists BLOCKED from useLocalStorage - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
      return;
    }
    
    if (typeof newLists === 'function') {
      setListsOriginal(prev => {
        const result = newLists(prev);
        console.log(`[DEBUG] setLists called from: ${caller}`);
        console.log(`[DEBUG] setLists: Previous lists count: ${prev.length}`);
        console.log(`[DEBUG] setLists: New lists count: ${result.length}`);
        if (prev.length > 0 && result.length > 0) {
          const prevItems = prev.reduce((sum, list) => sum + list.items.length, 0);
          const newItems = result.reduce((sum, list) => sum + list.items.length, 0);
          console.log(`[DEBUG] setLists: Previous total items: ${prevItems}`);
          console.log(`[DEBUG] setLists: New total items: ${newItems}`);
        }
        return result;
      });
    } else {
      console.log(`[DEBUG] setLists called from: ${caller}`);
      console.log(`[DEBUG] setLists: Setting ${newLists.length} lists`);
      const totalItems = newLists.reduce((sum, list) => sum + list.items.length, 0);
      console.log(`[DEBUG] setLists: Total items in new lists: ${totalItems}`);
      setListsOriginal(newLists);
    }
  }, [setListsOriginal, pendingOperations.length, isProcessingQueue]);
  
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<{ listId: string; item: ShoppingItem } | null>(null);
  const [_isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  
  // No need to manually save to localStorage as our enhanced useLocalStorage hook handles this
  // This comment is kept for documentation purposes
  
  // Process pending operations queue
  const processPendingOperations = useCallback(async () => {
    if (!isAuthenticated || !user || pendingOperations.length === 0 || isProcessingQueue) return;
    
    setIsProcessingQueue(true);
    console.log(`[DEBUG] processPendingOperations: Processing ${pendingOperations.length} pending operations`);
    
    // Log current state before processing
    setLists(prevLists => {
      console.log(`[DEBUG] processPendingOperations: Current lists state before operation:`, prevLists.map(l => ({ id: l.id, itemCount: l.items.length, items: l.items.map(i => i.id) })));
      return prevLists;
    });
    
    try {
      // Take the first operation and process it
      const operation = pendingOperations[0];
      console.log(`[DEBUG] processPendingOperations: About to execute operation`);
      await operation();
      console.log(`[DEBUG] processPendingOperations: Operation completed successfully`);
      
      // Log current state after processing
      setLists(prevLists => {
        console.log(`[DEBUG] processPendingOperations: Current lists state after operation:`, prevLists.map(l => ({ id: l.id, itemCount: l.items.length, items: l.items.map(i => i.id) })));
        return prevLists;
      });
      
      // Remove the operation from the queue if successful
      setPendingOperations(prev => prev.slice(1));
    } catch (error: any) {
      console.error('Error processing pending operation:', error);
      
      // Enhanced check for network-related errors including ERR_BLOCKED_BY_CLIENT
      const errorMessage = error.message || String(error);
      const isNetworkError = (
        errorMessage.includes('network') || 
        errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
        errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('AbortError') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('net::ERR') ||
        error.code === 'unavailable' ||
        error.code === 'resource-exhausted' ||
        error.code === 'deadline-exceeded' ||
        error.name === 'AbortError'
      );
      
      if (isNetworkError) {
        console.warn('Network error detected. Operation will be retried when connection is restored.');
        // For ERR_BLOCKED_BY_CLIENT specifically, add more detailed logging
        if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.warn(
            'Firebase request was blocked by the client (possibly by an extension or firewall). ' +
            'This operation will be retried, but you may need to check browser extensions or security software.'
          );
          
          // Show alert to user about the blocked client issue
          showAlert({
            type: 'warning',
            title: 'Network Request Blocked',
            message: 'Network request blocked by browser extension. Try disabling ad blockers or security extensions if sync issues persist.',
            cancelText: 'OK'
          });
        }
        
        // Keep the operation in the queue for retry
        // Get the retry count from the error or default to 0
        const retryCount = (error.retryCount || 0) + 1;
        
        // Implement exponential backoff for retries
        if (retryCount > 1) {
          // Calculate delay with exponential backoff and some randomness
          const baseDelay = 500; // 500ms base for faster retries
          const maxDelay = 10000; // 10 seconds max for better UX
          const exponentialDelay = Math.min(
            baseDelay * Math.pow(2, Math.min(retryCount - 1, 5)) + (Math.random() * 1000),
            maxDelay
          );
          
          console.log(`Scheduling retry #${retryCount} in ${exponentialDelay / 1000} seconds`);
          
          // Add a delay before the next retry attempt
          setTimeout(() => {
            processPendingOperations();
          }, exponentialDelay);
        } else {
          // First retry attempt, try again quickly
          setTimeout(() => {
            processPendingOperations();
          }, 200); // Faster first retry for better UX
        }
      } else {
        // For non-network errors, remove from queue to prevent infinite retries
        console.warn('Non-network error detected. Removing operation from queue to prevent blocking.');
        setPendingOperations(prev => prev.slice(1));
        
        // Show alert about the error
        showAlert({
          type: 'error',
          title: 'Sync Error',
          message: 'An error occurred while syncing data. Some changes may not be saved.',
          cancelText: 'OK'
        });
      }
    } finally {
      setIsProcessingQueue(false);
    }
  }, [isAuthenticated, user, pendingOperations, isProcessingQueue]);
  
  // Process pending operations when online
  useEffect(() => {
    const handleOnline = () => {
      processPendingOperations();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Also check periodically
    const interval = setInterval(() => {
      if (navigator.onLine) {
        processPendingOperations();
      }
    }, 1000); // Check every 1 second for better responsiveness
    
    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [processPendingOperations]);
  
  // Add operation to queue
  const queueOperation = useCallback((operation: Operation) => {
    // Wrap the operation to add retry tracking
    const wrappedOperation = async () => {
      try {
        return await operation();
      } catch (error: any) {
        // Add retry count to the error for tracking purposes
        if (error.retryCount) {
          error.retryCount++;
        } else {
          error.retryCount = 1;
        }
        throw error;
      }
    };
    
    setPendingOperations(prev => [...prev, wrappedOperation]);
    
    // Try to process immediately if online
    if (navigator.onLine) {
      processPendingOperations();
    }
  }, [processPendingOperations]);

  // Handle authentication state changes
  useEffect(() => {
    const handleAuthStateChange = async () => {
      console.log(`[DEBUG] Auth effect: isAuthenticated=${isAuthenticated}, user=${!!user}, loading=${loading}, hasLoadedInitialData=${hasLoadedInitialData}`);
      if (loading) return; // Wait for auth to finish loading
      
      // CRITICAL FIX: Don't reload Firebase data if we have pending operations
      // This prevents overwriting local state with stale Firebase data during active operations
      if (pendingOperations.length > 0 || isProcessingQueue) {
        console.log(`[DEBUG] Auth effect: SKIPPING reload - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
        return;
      }
      
      if (isAuthenticated && user && !hasLoadedInitialData) {
        console.log(`[DEBUG] Auth effect: Starting data load for authenticated user`);
        // User is logged in
        setIsLoadingData(true);
        try {
          // Load user's lists from Firebase to check if this is a first-time user
          let firebaseLists: ShoppingList[] = [];
          let isFirstTimeUser = false;
          
          try {
            firebaseLists = await getUserLists(user.id);
            isFirstTimeUser = firebaseLists.length === 0;
            console.log(`User is first-time: ${isFirstTimeUser}, Firebase lists: ${firebaseLists.length}`);
          } catch (getUserError) {
            console.warn('Error loading user lists from Firebase:', getUserError);
            // Assume first-time user if we can't load lists
            isFirstTimeUser = true;
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              firebaseLists = await getUserLists(user.id);
              isFirstTimeUser = firebaseLists.length === 0;
              console.log(`Retry: User is first-time: ${isFirstTimeUser}, Firebase lists: ${firebaseLists.length}`);
            } catch (retryError) {
              console.warn('Retry failed, assuming first-time user:', retryError);
              isFirstTimeUser = true;
            }
          }
          
          if (isFirstTimeUser) {
            // First-time user: sync non-login state lists to Firebase as initialization
            const guestLists = getGuestData();
            console.log(`First-time user: syncing ${guestLists.length} guest lists to Firebase`);
            
            try {
              // Copy guest data to authenticated storage
              copyGuestDataToAuth();
              // Sync all guest lists (including education list) to Firebase
              await syncLocalListsToFirestore(guestLists, user.id);
              console.log('Successfully synced all guest lists to Firebase for first-time user');
              
              // Set lists from guest data
              console.log(`[DEBUG] Auth effect: Setting lists from guest data (${guestLists.length} lists)`);
              // CRITICAL: Don't overwrite state if we have pending operations
              if (pendingOperations.length === 0 && !isProcessingQueue) {
                setLists(guestLists);
              } else {
                console.log(`[DEBUG] Auth effect: SKIPPING guest data set - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
              }
            } catch (syncError) {
              console.warn('Error syncing guest lists to Firebase:', syncError);
              // Even if Firebase sync fails, we still copied the data locally
              console.log(`[DEBUG] Auth effect: Setting fallback lists after sync error`);
              // CRITICAL: Don't overwrite state if we have pending operations
              if (pendingOperations.length === 0 && !isProcessingQueue) {
                setLists(guestLists.length > 0 ? guestLists : [createEducationList()]);
              } else {
                console.log(`[DEBUG] Auth effect: SKIPPING fallback set - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
              }
            }
          } else {
            // Returning user: merge Firebase lists with current local state to preserve pending changes
            console.log(`Returning user: loading ${firebaseLists.length} lists from Firebase`);
            
            // Merge Firebase data with current local state to preserve items being processed
            console.log(`[DEBUG] Auth effect: Merging Firebase data with local state`);
            setLists(prevLists => {
              console.log(`[DEBUG] Auth effect: Current local lists before merge:`, prevLists.map(l => ({ id: l.id, itemCount: l.items.length })));
              console.log(`[DEBUG] Auth effect: Firebase lists to merge:`, firebaseLists.map(l => ({ id: l.id, itemCount: l.items.length })));
              
              // If we have no local lists or they're just the education list, use Firebase data
              if (prevLists.length === 0 || (prevLists.length === 1 && prevLists[0].id === 'education-list')) {
                console.log(`[DEBUG] Auth effect: Using Firebase data directly`);
                return firebaseLists;
              }
              
              // Merge Firebase lists with local changes
              const mergedLists = firebaseLists.map(firebaseList => {
                const localList = prevLists.find(list => list.id === firebaseList.id);
                if (localList && localList.updatedAt > firebaseList.updatedAt) {
                  // Local list is newer, keep local version
                  console.log(`[DEBUG] Auth effect: Keeping local version of list ${firebaseList.id} (${localList.items.length} items)`);
                  return localList;
                }
                console.log(`[DEBUG] Auth effect: Using Firebase version of list ${firebaseList.id} (${firebaseList.items.length} items)`);
                return firebaseList;
              });
              
              // Add any local lists that don't exist in Firebase yet
              const localOnlyLists = prevLists.filter(localList => 
                !firebaseLists.find(firebaseList => firebaseList.id === localList.id)
              );
              
              console.log(`[DEBUG] Auth effect: Final merged result: ${mergedLists.length + localOnlyLists.length} lists`);
              return [...mergedLists, ...localOnlyLists];
            });
          }
          
          // Clear current list to refresh
          setCurrentList(null);
        } catch (error) {
          console.error('Unexpected error during authentication state change:', error);
          // Only show error for unexpected issues, not for first-time user scenarios
          const educationList = createEducationList();
          // CRITICAL: Don't overwrite state if we have pending operations
          if (pendingOperations.length === 0 && !isProcessingQueue) {
            setLists([educationList]);
          } else {
            console.log(`[DEBUG] Auth effect: SKIPPING error fallback - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
          }
          setCurrentList(null);
        } finally {
          setIsLoadingData(false);
          setHasLoadedInitialData(true);
        }
      } else if (!isAuthenticated && !loading) {
        // Reset the flag when user logs out
        setHasLoadedInitialData(false);
        // User logged out - switch back to guest storage
        setIsLoadingData(true);
        try {
          // Get guest data from localStorage (preserved separately)
          const guestLists = getGuestData();
          
          // Ensure we have the education list
          const educationList = guestLists.find(list => list.id === 'education-list') || createEducationList();
          const otherGuestLists = guestLists.filter(list => list.id !== 'education-list');
          
          // Restore all guest lists (not just the first one)
          const restoredLists = [educationList, ...otherGuestLists];
          // CRITICAL: Don't overwrite state if we have pending operations
          if (pendingOperations.length === 0 && !isProcessingQueue) {
            setLists(restoredLists);
          } else {
            console.log(`[DEBUG] Auth effect: SKIPPING logout restore - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
          }
          
          // Clear current list if it's not in the restored lists
          if (currentList && !restoredLists.find(list => list.id === currentList.id)) {
            setCurrentList(null);
          }
          
          console.log(`Restored ${otherGuestLists.length} guest lists after logout`);
        } catch (error) {
          console.error('Error handling logout:', error);
          // CRITICAL: Don't overwrite state if we have pending operations
          if (pendingOperations.length === 0 && !isProcessingQueue) {
            setLists([createEducationList()]);
          } else {
            console.log(`[DEBUG] Auth effect: SKIPPING logout error fallback - ${pendingOperations.length} pending operations, processing: ${isProcessingQueue}`);
          }
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    
    handleAuthStateChange();
  }, [isAuthenticated, user, loading]);

  // Create a new shopping list
  const createList = async (name: string): Promise<ShoppingList | null> => {
    // Check if user is not authenticated and already has 2 lists (education list + 1 custom)
    if (!isAuthenticated && lists.filter(list => list.id !== 'education-list').length >= 1) {
      showAlert({
        type: 'info',
        title: 'Create List',
        message: 'Please log in to create more lists',
        cancelText: 'OK'
      });
      return null;
    }

    const newList: ShoppingList = {
      id: generateId(),
      name,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      if (isAuthenticated && user) {
        // Save to Firebase using queue system
        const firebaseId = await saveListToFirestore(newList, user.id);
        const listWithFirebaseId = { ...newList, id: firebaseId };
        setLists(prevLists => [...prevLists, listWithFirebaseId]);
        
        // Queue the operation for potential retry if needed
        queueOperation(async () => {
          try {
            // This is just a placeholder since we already saved it above
            // But in case of failure, this would retry
            const updatedFirestoreId = await updateListInFirestore(firebaseId, listWithFirebaseId, user.id);
            
            // If we got a different ID back (new document was created), update the local state with the new firestoreId
            if (updatedFirestoreId !== firebaseId) {
              setLists(prevLists =>
                prevLists.map(list =>
                  list.id === firebaseId
                    ? { ...list, id: updatedFirestoreId }
                    : list
                )
              );
              console.log(`Updated list ${firebaseId} with new Firestore ID: ${updatedFirestoreId}`);
            }
          } catch (error) {
            console.error('Error updating list in Firestore:', error);
            throw error;
          }
        });
        
        return listWithFirebaseId;
      } else {
        // Save to local state (localStorage will be updated by useEffect)
        setLists(prevLists => [...prevLists, newList]);
        return newList;
      }
    } catch (error) {
      console.error('Error creating list:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to create list. Please try again.',
        cancelText: 'OK'
      });
      throw error;
    }
  };

  // Update a shopping list
  const updateList = async (id: string, updates: Partial<ShoppingList>) => {
    try {
      // Update local state immediately for responsive UI
      setLists(prevLists =>
        prevLists.map(list =>
          list.id === id
            ? { ...list, ...updates, updatedAt: Date.now() }
            : list
        )
      );
      
      // Queue Firebase operation if authenticated
      if (isAuthenticated && user) {
        queueOperation(async () => {
          try {
            // updateListInFirestore now returns the Firestore ID (either existing or new)
            const firestoreId = await updateListInFirestore(id, updates, user.id);
            
            // If we got a different ID back (new document was created), update the local state with the new firestoreId
            if (firestoreId !== id) {
              setLists(prevLists =>
                prevLists.map(list =>
                  list.id === id
                    ? { ...list, firestoreId }
                    : list
                )
              );
              console.log(`Updated list ${id} with new Firestore ID: ${firestoreId}`);
            }
          } catch (error) {
            console.error('Error updating list in Firestore:', error);
            throw error;
          }
        });
      }
    } catch (error) {
      console.error('Error updating list:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to update list. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Delete a shopping list
  const deleteList = async (id: string) => {
    try {
      // Update local state immediately for responsive UI
      setLists(prevLists => prevLists.filter(list => list.id !== id));
      if (currentList?.id === id) {
        setCurrentList(null);
      }
      
      // Queue Firebase operation if authenticated
      if (isAuthenticated && user) {
        queueOperation(async () => {
          await deleteListFromFirestore(id, user.id);
        });
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete list. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Duplicate a shopping list
  const duplicateList = async (id: string) => {
    const listToDuplicate = lists.find(list => list.id === id);
    if (!listToDuplicate) return;

    // Check if user is not authenticated and already has 2 lists (education list + 1 custom)
    if (!isAuthenticated && lists.filter(list => list.id !== 'education-list').length >= 1) {
      showAlert({
        type: 'info',
        title: 'Create List',
        message: 'Please log in to create more lists',
        cancelText: 'OK'
      });
      return;
    }

    const duplicatedList: ShoppingList = {
      ...listToDuplicate,
      id: generateId(),
      name: `${listToDuplicate.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: listToDuplicate.items.map(item => ({
        ...item,
        id: generateId(),
        completed: false
      }))
    };

    try {
      if (isAuthenticated && user) {
        // Save to Firebase
        const firebaseId = await saveListToFirestore(duplicatedList, user.id);
        const listWithFirebaseId = { ...duplicatedList, id: firebaseId };
        setLists(prevLists => [...prevLists, listWithFirebaseId]);
      } else {
        // Save to local state
        setLists(prevLists => [...prevLists, duplicatedList]);
      }
    } catch (error) {
      console.error('Error duplicating list:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to duplicate list. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Archive a shopping list
  const archiveList = (id: string) => {
    setLists(prevLists =>
      prevLists.map(list =>
        list.id === id
          ? { ...list, archived: true, updatedAt: Date.now() }
          : list
      )
    );
  };

  // Unarchive a shopping list
  const unarchiveList = (id: string) => {
    setLists(prevLists =>
      prevLists.map(list =>
        list.id === id
          ? { ...list, archived: false, updatedAt: Date.now() }
          : list
      )
    );
  };

  // Add multiple items to a shopping list in batch
  const addItems = async (listId: string, items: Omit<ShoppingItem, 'id' | 'position'>[]) => {
    const newItems: ShoppingItem[] = items.map((item, index) => ({
      ...item,
      id: generateId(),
      position: index,
      updatedAt: Date.now()
    }));

    console.log(`[DEBUG] addItems: Adding ${newItems.length} items to list ${listId}`);
    console.log(`[DEBUG] addItems: New item IDs:`, newItems.map(i => i.id));

    try {
      // Update local state immediately for responsive UI
      setLists(prevLists => {
        console.log(`[DEBUG] addItems: Before update - List ${listId} has ${prevLists.find(l => l.id === listId)?.items.length || 0} items`);
        const updatedLists = prevLists.map(list => {
          if (list.id === listId) {
            const updatedList = {
              ...list,
              items: [...newItems, ...list.items],
              updatedAt: Date.now()
            };
            console.log(`[DEBUG] addItems: After update - List ${listId} now has ${updatedList.items.length} items`);
            return updatedList;
          }
          return list;
        });
        return updatedLists;
      });
      
      // Queue Firebase operations if authenticated - batch them into a single operation
      if (isAuthenticated && user) {
        console.log(`[DEBUG] addItems: Queueing Firebase operation for ${newItems.length} items`);
        queueOperation(async () => {
          // Add a small delay and check state right before execution
          await new Promise(resolve => setTimeout(resolve, 10));
          console.log(`[DEBUG] Firebase operation: About to start - checking state after 10ms delay`);
          setLists(prevLists => {
            const targetList = prevLists.find(l => l.id === listId);
            console.log(`[DEBUG] Firebase operation: State check - List ${listId} has ${targetList?.items.length || 0} items`);
            console.log(`[DEBUG] Firebase operation: State check - Item IDs:`, targetList?.items.map(i => i.id) || []);
            return prevLists;
          });
          console.log(`[DEBUG] Firebase operation: Starting batch save for ${newItems.length} items`);
          
          // Log state at the beginning of Firebase operation
          setLists(prevLists => {
            const targetList = prevLists.find(l => l.id === listId);
            console.log(`[DEBUG] Firebase operation: List ${listId} has ${targetList?.items.length || 0} items at start`);
            console.log(`[DEBUG] Firebase operation: Item IDs in list:`, targetList?.items.map(i => i.id) || []);
            return prevLists;
          });
          
          // Save all items to Firestore and collect their IDs
          const firestoreUpdates: { itemId: string; firestoreId: string }[] = [];
          
          for (const newItem of newItems) {
            try {
              console.log(`[DEBUG] Firebase operation: Saving item ${newItem.id} to Firestore`);
              const firestoreId = await saveItemToFirestore(newItem, listId, user.id);
              if (firestoreId) {
                firestoreUpdates.push({ itemId: newItem.id, firestoreId });
                console.log(`[DEBUG] Firebase operation: Item ${newItem.id} saved with Firestore ID ${firestoreId}`);
              }
            } catch (error) {
              console.error(`Failed to save item ${newItem.id} to Firestore:`, error);
              // Continue with other items even if one fails
            }
          }
          
          console.log(`[DEBUG] Firebase operation: Completed saving, ${firestoreUpdates.length} items successful`);
          
          // Update all Firestore IDs in a single state update
          if (firestoreUpdates.length > 0) {
            console.log(`[DEBUG] Firebase operation: Updating Firestore IDs for items:`, firestoreUpdates.map(u => u.itemId));
            setLists(prevLists => {
              const targetList = prevLists.find(l => l.id === listId);
              console.log(`[DEBUG] Firebase operation: Before ID update - List ${listId} has ${targetList?.items.length || 0} items`);
              console.log(`[DEBUG] Firebase operation: Items in list:`, targetList?.items.map(i => i.id) || []);
              
              const updatedLists = prevLists.map(list => {
                if (list.id === listId) {
                  const updatedItems = list.items.map(item => {
                    const update = firestoreUpdates.find(u => u.itemId === item.id);
                    return update ? { ...item, firestoreId: update.firestoreId } : item;
                  });
                  
                  console.log(`[DEBUG] Firebase operation: After ID update - List ${listId} will have ${updatedItems.length} items`);
                  return {
                    ...list,
                    items: updatedItems
                  };
                }
                return list;
              });
              
              return updatedLists;
            });
          }
          
          console.log(`[DEBUG] Firebase operation: Batch operation completed`);
        });
      }
    } catch (error) {
      console.error('Error adding items:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to add items. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Add an item to a shopping list
  const addItem = async (listId: string, item: Omit<ShoppingItem, 'id' | 'position'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: generateId(),
      position: 0,
      updatedAt: Date.now()
    };

    try {
      // Update local state immediately for responsive UI
      setLists(prevLists => {
        const updatedLists = prevLists.map(list => {
          if (list.id === listId) {
            const updatedList = {
              ...list,
              items: [newItem, ...list.items],
              updatedAt: Date.now()
            };
            
            return updatedList;
          }
          return list;
        });
        return updatedLists;
      });
      
      // Queue Firebase operation if authenticated
      if (isAuthenticated && user) {
        queueOperation(async () => {
          const firestoreId = await saveItemToFirestore(newItem, listId, user.id);
          
          // Update the local item with the Firestore ID
          if (firestoreId) {
            setLists(prevLists =>
                    prevLists.map(list => {
                if (list.id === listId) {
                  return {
                    ...list,
                    items: list.items.map(item =>
                      item.id === newItem.id
                        ? { ...item, firestoreId }
                        : item
                    )
                  };
                }
                return list;
              })
            );
          }
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to add item. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Update an item in a shopping list
  const updateItem = async (listId: string, itemId: string, updates: Partial<ShoppingItem>) => {
    try {
      // Get the current item to check if it has a Firestore ID
      let currentItem: ShoppingItem | undefined;
      const currentList = lists.find(list => list.id === listId);
      if (currentList) {
        currentItem = currentList.items.find(item => item.id === itemId);
      }
      
      // Add updatedAt to the updates
      const updatesWithTimestamp = { ...updates, updatedAt: Date.now() };
      
      // Update local state immediately for responsive UI
      setLists(prevLists =>
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item =>
                item.id === itemId
                  ? { ...item, ...updatesWithTimestamp }
                  : item
              ),
              updatedAt: Date.now()
            };
          }
          return list;
        })
      );
      
      // Queue Firebase operation if authenticated
      if (isAuthenticated && user && currentItem) {
        queueOperation(async () => {
          try {
            // First try to update using firestoreId if available
            if (currentItem?.firestoreId) {
              await updateItemInFirestore(currentItem.firestoreId, updatesWithTimestamp, user.id);
            } else {
              // If no firestoreId, try to update using local id (might fail if item doesn't exist in Firestore)
              try {
                await updateItemInFirestore(itemId, updatesWithTimestamp, user.id);
              } catch (updateError: any) {
                // If the error is because the document doesn't exist, save as a new item instead
                if (updateError.code === 'not-found' || updateError.message?.includes('No document to update')) {
                  const updatedItem: ShoppingItem = { ...currentItem!, ...updatesWithTimestamp };
                  const firestoreId = await saveItemToFirestore(updatedItem, listId, user.id);
                  
                  // Update the local item with the Firestore ID
                  setLists(prevLists =>
                    prevLists.map(list => {
                      if (list.id === listId) {
                        return {
                          ...list,
                          items: list.items.map(item =>
                            item.id === itemId
                              ? { ...item, firestoreId }
                              : item
                          )
                        };
                      }
                      return list;
                    })
                  );
                } else {
                  // Re-throw if it's not a document not found error
                  console.error('Error handling item update:', updateError);
                  throw updateError;
                }
              }
            }
          } catch (error) {
            console.error('Error in updateItem operation:', error);
            throw error;
          }
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to update item. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Delete an item from a shopping list
  const deleteItem = async (listId: string, itemId: string): Promise<ShoppingItem | null> => {
    let deletedItem: ShoppingItem | null = null;

    try {
      // Find the item to delete first
      const list = lists.find(l => l.id === listId);
      if (list) {
        const itemToDelete = list.items.find(item => item.id === itemId);
        if (itemToDelete) {
          deletedItem = itemToDelete;
        }
      }
      
      // Update local state immediately for responsive UI
      setLists(prevLists =>
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.filter(item => item.id !== itemId),
              updatedAt: Date.now()
            };
          }
          return list;
        })
      );

      if (deletedItem) {
        setLastDeletedItem({ listId, item: deletedItem });
      }
      
      // Queue Firebase operation if authenticated
      if (isAuthenticated && user) {
        queueOperation(async () => {
          try {
            // Use the Firestore ID if available, otherwise use the local ID
            const idToDelete = deletedItem?.firestoreId || itemId;
            await deleteItemFromFirestore(idToDelete, user.id);
          } catch (error: any) {
            // If the document doesn't exist, that's fine - it's already deleted
            if (error.code === 'not-found' || error.message?.includes('No document to update')) {
              console.log(`Item ${itemId} not found in Firestore, already deleted or never existed`);
            } else {
              throw error; // Re-throw other errors
            }
          }
        });
      }

      return deletedItem;
    } catch (error) {
      console.error('Error deleting item:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete item. Please try again.',
        cancelText: 'OK'
      });
      return null;
    }
  };

  // Toggle item completion status
  const toggleItemCompletion = async (listId: string, itemId: string) => {
    const list = lists.find(l => l.id === listId);
    const item = list?.items.find(i => i.id === itemId);
    if (!item) return;

    // Check if the item has a Firestore ID
    const updates = { completed: !item.completed };
    await updateItem(listId, itemId, updates);

    // Handle reordering after completion toggle
    setLists(prevLists =>
      prevLists.map(listItem => {
        if (listItem.id === listId) {
          // Find the item to toggle
          const itemToToggle = listItem.items.find(item => item.id === itemId);
          if (!itemToToggle) return listItem;

          // Create a new array with the toggled item moved to the appropriate position
          const newItems = listItem.items.filter(item => item.id !== itemId);
          const updatedItem = { ...itemToToggle, completed: !itemToToggle.completed };

          // If completing, move to bottom; if uncompleting, move to top of uncompleted items
          if (updatedItem.completed) {
            newItems.push(updatedItem);
          } else {
            // Find the index of the first completed item
            const firstCompletedIndex = newItems.findIndex(item => item.completed);
            if (firstCompletedIndex === -1) {
              newItems.unshift(updatedItem);
            } else {
              newItems.splice(firstCompletedIndex, 0, updatedItem);
            }
          }

          return {
            ...listItem,
            items: newItems,
            updatedAt: Date.now()
          };
        }
        return listItem;
      })
    );
  };

  // Reorder items in a shopping list
  const reorderItems = async (listId: string, startIndex: number, endIndex: number) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const newItems = Array.from(list.items);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);

    // Update positions
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      position: index
    }));

    try {
      if (isAuthenticated && user) {
        // Update all items' positions in Firebase
        await Promise.all(
          updatedItems.map(async item => {
            try {
              // Use the Firestore ID if available, otherwise use the local ID
              const idToUpdate = item.firestoreId || item.id;
              await updateItemInFirestore(idToUpdate, { position: item.position }, user.id);
            } catch (error: any) {
              // If the error is because the document doesn't exist, save as a new item instead
              if (error.code === 'not-found' || error.message?.includes('No document to update')) {
                console.log(`Item ${item.id} not found in Firestore, saving as new item`);
                await saveItemToFirestore(item, listId, user.id);
              } else {
                throw error; // Re-throw other errors
              }
            }
          })
        );
      }
      
      // Update local state
      setLists(prevLists =>
        prevLists.map(listItem => {
          if (listItem.id === listId) {
            return {
              ...listItem,
              items: updatedItems,
              updatedAt: Date.now()
            };
          }
          return listItem;
        })
      );
    } catch (error) {
      console.error('Error reordering items:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to reorder items. Please try again.',
        cancelText: 'OK'
      });
    }
  };

  // Undo the last item deletion
  const undoDeleteItem = () => {
    if (!lastDeletedItem) return;

    const { listId, item } = lastDeletedItem;

    setLists(prevLists =>
      prevLists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            items: [...list.items, item],
            updatedAt: Date.now()
          };
        }
        return list;
      })
    );

    setLastDeletedItem(null);
  };

  return (
    <ShoppingListContext.Provider
      value={{
        lists,
        currentList,
        setCurrentList,
        createList,
        updateList,
        deleteList,
        duplicateList,
        archiveList,
        unarchiveList,
        addItem,
        addItems,
        updateItem,
        deleteItem,
        toggleItemCompletion,
        reorderItems,
        lastDeletedItem,
        undoDeleteItem
      }}
    >
      {children}
    </ShoppingListContext.Provider>
  );
};

// Custom hook to use the shopping list context
export const useShoppingList = (): ShoppingListContextType => {
  const context = useContext(ShoppingListContext);
  if (context === undefined) {
    throw new Error('useShoppingList must be used within a ShoppingListProvider');
  }
  return context;
};