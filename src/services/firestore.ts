import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ShoppingList, ShoppingItem } from '../types';

// Collection names
const LISTS_COLLECTION = 'shoppingLists';
const ITEMS_COLLECTION = 'shoppingItems';

// Convert Firestore timestamp to number
const timestampToNumber = (timestamp: any): number => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return timestamp || Date.now();
};

// Convert ShoppingList for Firestore (remove items array)
const listToFirestore = (list: ShoppingList, userId: string) => {
  const { items, ...listData } = list;
  
  // Create a clean copy of the list data without undefined values
  const cleanListData = Object.fromEntries(
    Object.entries(listData).filter(([_, value]) => value !== undefined)
  );
  
  return {
    ...cleanListData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Convert ShoppingItem for Firestore
const itemToFirestore = (item: ShoppingItem, listId: string, userId: string) => {
  // Create a clean copy of the item without undefined values
  const cleanItem = Object.fromEntries(
    Object.entries(item).filter(([_, value]) => value !== undefined)
  );
  
  return {
    ...cleanItem,
    listId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Get all lists for a user
export const getUserLists = async (userId: string): Promise<ShoppingList[]> => {
  try {
    const listsQuery = query(
      collection(db, LISTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const listsSnapshot = await getDocs(listsQuery);
    const lists: ShoppingList[] = [];
    
    for (const listDoc of listsSnapshot.docs) {
      const listData = listDoc.data();
      
      // Skip deleted lists
      if (listData.deleted === true) {
        continue;
      }
      
      // Get items for this list
      const itemsQuery = query(
        collection(db, ITEMS_COLLECTION),
        where('listId', '==', listDoc.id),
        where('userId', '==', userId),
        orderBy('position', 'asc')
      );
      
      const itemsSnapshot = await getDocs(itemsQuery);
      const items: ShoppingItem[] = itemsSnapshot.docs
        .map(itemDoc => {
          const data = itemDoc.data();
          return {
            ...data,
            id: data.id || itemDoc.id, // Use the original id if available, otherwise use Firestore id
            firestoreId: itemDoc.id // Always store the Firestore document ID
          } as ShoppingItem;
        })
        .filter(item => item.deleted !== true); // Filter out deleted items
      
      lists.push({
        ...listData,
        id: listDoc.id,
        items,
        createdAt: timestampToNumber(listData.createdAt),
        updatedAt: timestampToNumber(listData.updatedAt)
      } as ShoppingList);
    }
    
    return lists;
  } catch (error) {
    throw error;
  }
};

// Save a list to Firestore
export const saveListToFirestore = async (list: ShoppingList, userId: string): Promise<string> => {
  try {
    const listData = listToFirestore(list, userId);
    
    let docRef;
    let documentId: string;
    
    // For education list, use its fixed ID as the document ID
    if (list.id === 'education-list') {
      const educationDocRef = doc(db, LISTS_COLLECTION, 'education-list');
      await setDoc(educationDocRef, listData, { merge: true });
      documentId = 'education-list';
    } else {
      // For regular lists, let Firebase generate the ID
      docRef = await addDoc(collection(db, LISTS_COLLECTION), listData);
      documentId = docRef.id;
    }
    
    console.log('saveListToFirestore: List saved with ID:', documentId);
    
    // Save items
    console.log('saveListToFirestore: Saving', list.items.length, 'items');
    for (const item of list.items) {
      const itemData = itemToFirestore(item, documentId, userId);
      await addDoc(collection(db, ITEMS_COLLECTION), itemData);
    }
    console.log('saveListToFirestore: All items saved successfully');
    
    return documentId;
  } catch (error) {
    console.error('Error saving list to Firestore:', error);
    throw error;
  }
};

// Update a list in Firestore
export const updateListInFirestore = async (listId: string, updates: Partial<ShoppingList>, userId: string): Promise<string> => {
  try {
    const listRef = doc(db, LISTS_COLLECTION, listId);
    
    // Filter out undefined values to prevent Firestore errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(listRef, {
      ...cleanUpdates,
      userId, // Always include userId to satisfy security rules
      updatedAt: serverTimestamp()
    });
    return listId; // Return the existing ID if update succeeds
  } catch (error: any) {
    // Check if the error is because the document doesn't exist
    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
      // If the document doesn't exist, create a new one
      const listData = listToFirestore({
        ...updates as ShoppingList,
      }, userId);
      const newDocRef = await addDoc(collection(db, LISTS_COLLECTION), listData);
      return newDocRef.id; // Return the new ID
    }
    
    console.error('Error updating list in Firestore:', error);
    throw error;
  }
};

// Delete a list from Firestore
export const deleteListFromFirestore = async (listId: string, userId: string): Promise<void> => {
  try {
    // Soft delete all items in the list
    const itemsQuery = query(
      collection(db, ITEMS_COLLECTION),
      where('listId', '==', listId),
      where('userId', '==', userId)
    );
    
    const itemsSnapshot = await getDocs(itemsQuery);
    const updatePromises = itemsSnapshot.docs.map(itemDoc => {
      try {
        return updateDoc(doc(db, ITEMS_COLLECTION, itemDoc.id), {
          deleted: true,
          updatedAt: serverTimestamp()
        });
      } catch (itemError: any) {
        // If item doesn't exist, just continue
        if (itemError.code === 'not-found') {
          return Promise.resolve(); // Return resolved promise to continue with other updates
        }
        return Promise.reject(itemError); // Re-throw other errors
      }
    });
    
    await Promise.all(updatePromises);
    
    try {
      // Soft delete the list
      await updateDoc(doc(db, LISTS_COLLECTION, listId), {
        deleted: true,
        updatedAt: serverTimestamp()
      });
    } catch (listError: any) {
      // If list doesn't exist, just continue
      if (listError.code === 'not-found') {
        return; // Exit gracefully
      }
      throw listError; // Re-throw other errors
    }
  } catch (error) {
    throw error;
  }
};

// Save an item to Firestore
export const saveItemToFirestore = async (item: ShoppingItem, listId: string, userId: string): Promise<string> => {
  try {
    const itemData = itemToFirestore(item, listId, userId);
    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), itemData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error saving item to Firestore:', error);
    
    throw error;
  }
};

// Update an item in Firestore
export const updateItemInFirestore = async (itemId: string, updates: Partial<ShoppingItem>, userId: string): Promise<void> => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    
    // Filter out undefined values to prevent Firestore errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(itemRef, {
      ...cleanUpdates,
      userId, // Always include userId to satisfy security rules
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error updating item in Firestore:', error);
    
    // Enhanced error handling for network-related errors
    const errorMessage = error.message || String(error);
    if (
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      error.code === 'unavailable'
    ) {
      console.warn(
        'Network error detected while updating item. ' +
        'If this is ERR_BLOCKED_BY_CLIENT, check browser extensions or security software.'
      );
    }
    
    throw error;
  }
};

// Delete an item from Firestore
export const deleteItemFromFirestore = async (itemId: string, userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, ITEMS_COLLECTION, itemId), {
      deleted: true,
      userId, // Always include userId to satisfy security rules
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    // Check if the error is because the document doesn't exist
    if (error.code === 'not-found') {
      return; // Exit gracefully if document doesn't exist
    }
    
    // Enhanced error handling for network-related errors
    const errorMessage = error.message || String(error);
    if (
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      error.code === 'unavailable'
    ) {
      // Network error during soft delete
    }
    
    throw error;
  }
};

// Sync local lists to Firestore (for when user logs in)
export const syncLocalListsToFirestore = async (localLists: ShoppingList[], userId: string): Promise<void> => {
  try {
    // Sync all lists including education list to Firebase
    for (const list of localLists) {
      await saveListToFirestore(list, userId);
    }
  } catch (error) {
    console.error('Error syncing local lists to Firestore:', error);
    throw error;
  }
};