import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ShoppingList, ShoppingItem } from '../types/shopping';

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
  return {
    ...listData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Convert ShoppingItem for Firestore
const itemToFirestore = (item: ShoppingItem, listId: string, userId: string) => {
  return {
    ...item,
    listId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Get all lists for a user
export const getUserLists = async (userId: string): Promise<ShoppingList[]> => {
  try {
    console.log('getUserLists: Starting to fetch lists for user:', userId);
    const listsQuery = query(
      collection(db, LISTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    console.log('getUserLists: Executing query...');
    const listsSnapshot = await getDocs(listsQuery);
    console.log('getUserLists: Query completed, found', listsSnapshot.docs.length, 'lists');
    const lists: ShoppingList[] = [];
    
    for (const listDoc of listsSnapshot.docs) {
      const listData = listDoc.data();
      
      // Get items for this list
      const itemsQuery = query(
        collection(db, ITEMS_COLLECTION),
        where('listId', '==', listDoc.id),
        where('userId', '==', userId),
        orderBy('position', 'asc')
      );
      
      const itemsSnapshot = await getDocs(itemsQuery);
      const items: ShoppingItem[] = itemsSnapshot.docs.map(itemDoc => ({
        ...itemDoc.data(),
        id: itemDoc.id
      } as ShoppingItem));
      
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
    console.error('Error getting user lists:', error);
    throw error;
  }
};

// Save a list to Firestore
export const saveListToFirestore = async (list: ShoppingList, userId: string): Promise<string> => {
  try {
    console.log('saveListToFirestore: Saving list', list.name, 'for user:', userId);
    const listData = listToFirestore(list, userId);
    const docRef = await addDoc(collection(db, LISTS_COLLECTION), listData);
    console.log('saveListToFirestore: List saved with ID:', docRef.id);
    
    // Save items
    console.log('saveListToFirestore: Saving', list.items.length, 'items');
    for (const item of list.items) {
      const itemData = itemToFirestore(item, docRef.id, userId);
      await addDoc(collection(db, ITEMS_COLLECTION), itemData);
    }
    console.log('saveListToFirestore: All items saved successfully');
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving list to Firestore:', error);
    throw error;
  }
};

// Update a list in Firestore
export const updateListInFirestore = async (listId: string, updates: Partial<ShoppingList>, userId: string): Promise<void> => {
  try {
    const listRef = doc(db, LISTS_COLLECTION, listId);
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating list in Firestore:', error);
    throw error;
  }
};

// Delete a list from Firestore
export const deleteListFromFirestore = async (listId: string, userId: string): Promise<void> => {
  try {
    // Delete all items in the list
    const itemsQuery = query(
      collection(db, ITEMS_COLLECTION),
      where('listId', '==', listId),
      where('userId', '==', userId)
    );
    
    const itemsSnapshot = await getDocs(itemsQuery);
    const deletePromises = itemsSnapshot.docs.map(itemDoc => 
      deleteDoc(doc(db, ITEMS_COLLECTION, itemDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    // Delete the list
    await deleteDoc(doc(db, LISTS_COLLECTION, listId));
  } catch (error) {
    console.error('Error deleting list from Firestore:', error);
    throw error;
  }
};

// Save an item to Firestore
export const saveItemToFirestore = async (item: ShoppingItem, listId: string, userId: string): Promise<string> => {
  try {
    const itemData = itemToFirestore(item, listId, userId);
    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), itemData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving item to Firestore:', error);
    throw error;
  }
};

// Update an item in Firestore
export const updateItemInFirestore = async (itemId: string, updates: Partial<ShoppingItem>, userId: string): Promise<void> => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating item in Firestore:', error);
    throw error;
  }
};

// Delete an item from Firestore
export const deleteItemFromFirestore = async (itemId: string, userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ITEMS_COLLECTION, itemId));
  } catch (error) {
    console.error('Error deleting item from Firestore:', error);
    throw error;
  }
};

// Sync local lists to Firestore (for when user logs in)
export const syncLocalListsToFirestore = async (localLists: ShoppingList[], userId: string): Promise<void> => {
  try {
    // Filter out education list and sync only user-created lists
    const userLists = localLists.filter(list => list.id !== 'education-list');
    
    for (const list of userLists) {
      await saveListToFirestore(list, userId);
    }
  } catch (error) {
    console.error('Error syncing local lists to Firestore:', error);
    throw error;
  }
};