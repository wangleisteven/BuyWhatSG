import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { ShoppingItem, ShoppingList } from '../types/shopping';
import { useAlert } from './AlertContext';
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
  
  // Initialize lists from local storage or create default education list
  const [lists, setLists] = useState<ShoppingList[]>(() => {
    const savedLists = localStorage.getItem('shoppingLists');
    if (savedLists) {
      return JSON.parse(savedLists);
    }
    return [createEducationList()];
  });
  
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<{ listId: string; item: ShoppingItem } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Save lists to local storage when not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      localStorage.setItem('shoppingLists', JSON.stringify(lists));
    }
  }, [lists, isAuthenticated, loading]);

  // Handle authentication state changes
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (loading) return; // Wait for auth to finish loading
      
      if (isAuthenticated && user) {
        // User logged in - load data from Firebase
        setIsLoadingData(true);
        try {
          // Sync any local lists to Firebase first (except education list)
          const localLists = lists.filter(list => list.id !== 'education-list');
          let syncSuccessful = false;
          
          if (localLists.length > 0) {
            try {
              await syncLocalListsToFirestore(localLists, user.id);
              syncSuccessful = true;
              console.log('Successfully synced local lists to Firebase');
            } catch (syncError) {
              console.warn('Error syncing local lists to Firebase:', syncError);
              // Continue even if sync fails - user can still use the app
            }
          }
          
          // Load user's lists from Firebase (including newly synced ones)
          let firebaseLists: ShoppingList[] = [];
          try {
            firebaseLists = await getUserLists(user.id);
            console.log(`Loaded ${firebaseLists.length} lists from Firebase`);
          } catch (getUserError) {
            console.warn('Error loading user lists from Firebase:', getUserError);
            // For first-time users or permission issues, continue with empty lists
            // If sync was successful, try again after a short delay
            if (syncSuccessful) {
              try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                firebaseLists = await getUserLists(user.id);
                console.log(`Retry: Loaded ${firebaseLists.length} lists from Firebase`);
              } catch (retryError) {
                console.warn('Retry failed, continuing with empty lists:', retryError);
              }
            }
          }
          
          // Always include education list
          const educationList = createEducationList();
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
        // User logged out - load data from localStorage
        setIsLoadingData(true);
        try {
          const savedLists = localStorage.getItem('shoppingLists');
          if (savedLists) {
            const localLists = JSON.parse(savedLists);
            // Filter to only show education list and one user list
            const educationList = localLists.find((list: ShoppingList) => list.id === 'education-list') || createEducationList();
            const userLists = localLists.filter((list: ShoppingList) => list.id !== 'education-list');
            
            const filteredLists = [educationList];
            if (userLists.length > 0) {
              filteredLists.push(userLists[0]); // Keep only the first user list
            }
            
            setLists(filteredLists);
          } else {
            setLists([createEducationList()]);
          }
          
          // Clear current list if it's not in the filtered lists
          if (currentList && !lists.find(list => list.id === currentList.id)) {
            setCurrentList(null);
          }
        } catch (error) {
          console.error('Error loading local lists:', error);
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
        // Save to Firebase
        const firebaseId = await saveListToFirestore(newList, user.id);
        const listWithFirebaseId = { ...newList, id: firebaseId };
        setLists(prevLists => [...prevLists, listWithFirebaseId]);
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
      if (isAuthenticated && user) {
        // Update in Firebase
        await updateListInFirestore(id, updates, user.id);
      }
      
      // Update local state
      setLists(prevLists =>
        prevLists.map(list =>
          list.id === id
            ? { ...list, ...updates, updatedAt: Date.now() }
            : list
        )
      );
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
      if (isAuthenticated && user) {
        // Delete from Firebase
        await deleteListFromFirestore(id, user.id);
      }
      
      // Update local state
      setLists(prevLists => prevLists.filter(list => list.id !== id));
      if (currentList?.id === id) {
        setCurrentList(null);
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
       if (isAuthenticated && user) {
         // Save to Firebase
         await saveItemToFirestore(newItem, listId, user.id);
       }
      
      // Update local state
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
       if (isAuthenticated && user) {
         // Update in Firebase
         await updateItemInFirestore(itemId, updates, user.id);
       }
      
      // Update local state
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
       if (isAuthenticated && user) {
         // Delete from Firebase
         await deleteItemFromFirestore(itemId, user.id);
       }
      
      // Update local state
      setLists(prevLists =>
        prevLists.map(list => {
          if (list.id === listId) {
            const itemToDelete = list.items.find(item => item.id === itemId);
            if (itemToDelete) {
              deletedItem = itemToDelete;
            }

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
          updatedItems.map(item => 
            updateItemInFirestore(item.id, { position: item.position }, user.id)
          )
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