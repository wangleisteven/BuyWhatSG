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
        category: 'default',
        position: 0
      },
      {
        id: generateId(),
        name: 'Swipe the item to the left 🫲 to delete the item',
        quantity: 1,
        completed: false,
        category: 'default',
        position: 1
      },
      {
        id: generateId(),
        name: 'Tap the item ☝️ to edit name, quantity, even upload the photo',
        quantity: 1,
        completed: false,
        category: 'default',
        position: 2
      },
      {
        id: generateId(),
        name: 'Hold and drag 🫳 the item to sort the sequence',
        quantity: 1,
        completed: false,
        category: 'default',
        position: 3
      }
    ]
  };
};

export const ShoppingListProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { showAlert } = useAlert();
  
  // Initialize lists using our enhanced useLocalStorage hook with separate storage for authenticated and non-authenticated users
  const [lists, setLists] = useLocalStorage<ShoppingList[]>(
    'shoppingLists',
    [createEducationList()],
    isAuthenticated,
    user?.id
  );
  
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<{ listId: string; item: ShoppingItem } | null>(null);
  const [_isLoadingData, setIsLoadingData] = useState(false);
  
  // Queue system for async operations
  type Operation = () => Promise<void>;
  const [pendingOperations, setPendingOperations] = useState<Operation[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // No need to manually save to localStorage as our enhanced useLocalStorage hook handles this
  // This comment is kept for documentation purposes
  
  // Process pending operations queue
  const processPendingOperations = useCallback(async () => {
    if (!isAuthenticated || !user || pendingOperations.length === 0 || isProcessingQueue) return;
    
    setIsProcessingQueue(true);
    console.log(`Processing ${pendingOperations.length} pending operations`);
    
    try {
      // Take the first operation and process it
      const operation = pendingOperations[0];
      await operation();
      
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
          const baseDelay = 2000; // 2 seconds base
          const maxDelay = 60000; // 1 minute max
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
          }, 1000);
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
    }, 30000); // Check every 30 seconds
    
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
      if (loading) return; // Wait for auth to finish loading
      
      if (isAuthenticated && user) {
        // User is logged in
        setIsLoadingData(true);
        try {
          // First, check if user already has lists in Firebase
          let userHasExistingLists = false;
          try {
            const existingLists = await getUserLists(user.id);
            userHasExistingLists = existingLists.length > 0;
            console.log(`User has existing lists: ${userHasExistingLists}`);
          } catch (checkError) {
            console.warn('Error checking for existing user lists:', checkError);
          }
          
          // Only sync guest lists if this is a first-time user (no existing lists)
          if (!userHasExistingLists) {
            const guestStorageKey = 'shoppingLists_guest';
            const savedGuestLists = localStorage.getItem(guestStorageKey);
            
            if (savedGuestLists) {
              const listsToSync = JSON.parse(savedGuestLists).filter((list: ShoppingList) => list.id !== 'education-list');
              
              if (listsToSync.length > 0) {
                try {
                  await syncLocalListsToFirestore(listsToSync, user.id);
                  console.log('Successfully synced local lists to Firebase');
                } catch (syncError) {
                  console.warn('Error syncing local lists to Firebase:', syncError);
                  // Continue even if sync fails - user can still use the app
                }
              }
            }
          }
          
          // Load user's lists from Firebase
          let firebaseLists: ShoppingList[] = [];
          try {
            firebaseLists = await getUserLists(user.id);
            console.log(`Loaded ${firebaseLists.length} lists from Firebase`);
          } catch (getUserError) {
            console.warn('Error loading user lists from Firebase:', getUserError);
            // For first-time users or permission issues, continue with empty lists
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              firebaseLists = await getUserLists(user.id);
              console.log(`Retry: Loaded ${firebaseLists.length} lists from Firebase`);
            } catch (retryError) {
              console.warn('Retry failed, continuing with empty lists:', retryError);
            }
          }
          
          // Always include education list
          const educationList = createEducationList();
          
          // Set the lists - our enhanced useLocalStorage hook will save to the authenticated user's storage
          setLists([educationList, ...firebaseLists]);
          
          // Clear current list to refresh
          setCurrentList(null);
        } catch (error) {
          console.error('Unexpected error during authentication state change:', error);
          // Only show error for unexpected issues, not for first-time user scenarios
          const educationList = createEducationList();
          setLists([educationList]);
          setCurrentList(null);
        } finally {
          setIsLoadingData(false);
        }
      } else if (!isAuthenticated && !loading) {
        // User logged out - reset to guest storage
        setIsLoadingData(true);
        try {
          // Our useLocalStorage hook will automatically switch to guest storage
          // Just ensure we have the education list
          const educationList = lists.find(list => list.id === 'education-list') || createEducationList();
          const userLists = lists.filter(list => list.id !== 'education-list');
          
          const filteredLists = [educationList];
          if (userLists.length > 0) {
            filteredLists.push(userLists[0]); // Keep only the first user list
          }
          
          setLists(filteredLists);
          
          // Clear current list if it's not in the filtered lists
          if (currentList && !filteredLists.find(list => list.id === currentList.id)) {
            setCurrentList(null);
          }
        } catch (error) {
          console.error('Error handling logout:', error);
          setLists([createEducationList()]);
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    
    handleAuthStateChange();
  }, [isAuthenticated, user, loading]);

  // Create a new shopping list
  const createList = async (name: string): Promise<ShoppingList | null> => {
    // Check if user is not authenticated and already has a list (besides education list)
    if (!isAuthenticated && lists.filter(list => list.id !== 'education-list').length > 0) {
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

    // Check if user is not authenticated and already has a list (besides education list)
    if (!isAuthenticated && lists.filter(list => list.id !== 'education-list').length > 0) {
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

  // Add an item to a shopping list
  const addItem = async (listId: string, item: Omit<ShoppingItem, 'id' | 'position'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: generateId(),
      position: 0
    };

    try {
      // Update local state immediately for responsive UI
      setLists(prevLists =>
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: [newItem, ...list.items],
              updatedAt: Date.now()
            };
          }
          return list;
        })
      );
      
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
      
      // Update local state immediately for responsive UI
      setLists(prevLists =>
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item =>
                item.id === itemId
                  ? { ...item, ...updates }
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
            if (currentItem.firestoreId) {
              await updateItemInFirestore(currentItem.firestoreId, updates, user.id);
            } else {
              // If no firestoreId, try to update using local id (might fail if item doesn't exist in Firestore)
              try {
                await updateItemInFirestore(itemId, updates, user.id);
              } catch (updateError: any) {
                // If the error is because the document doesn't exist, save as a new item instead
                if (updateError.code === 'not-found' || updateError.message?.includes('No document to update')) {
                  const updatedItem = { ...currentItem, ...updates };
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