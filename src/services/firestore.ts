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
  
  const firestoreItem = {
    ...cleanItem,
    listId,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  console.log('🔧 itemToFirestore: Converting item for Firestore:', {
    originalId: item.id,
    name: item.name,
    listId: listId,
    userId: userId
  });
  
  return firestoreItem;
};

// Get all lists for a user
export const getUserLists = async (userId: string): Promise<ShoppingList[]> => {
  try {
    console.log('🔍 getUserLists: Starting to fetch lists for userId:', userId);
    
    const listsQuery = query(
      collection(db, LISTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const listsSnapshot = await getDocs(listsQuery);
    console.log('📋 getUserLists: Found', listsSnapshot.docs.length, 'list documents');
    
    const lists: ShoppingList[] = [];
    
    for (const listDoc of listsSnapshot.docs) {
      const listData = listDoc.data();
      console.log('📄 getUserLists: Processing list document:', listDoc.id, 'with data:', {
        id: listData.id,
        name: listData.name,
        deleted: listData.deleted,
        userId: listData.userId
      });
      
      // Skip deleted lists
      if (listData.deleted === true) {
        console.log('🗑️ getUserLists: Skipping deleted list:', listDoc.id);
        continue;
      }
      
      // Get items for this list using the stored original ID (not Firestore document ID)
      // This is crucial for education-list which uses its original ID for item relationships
      const listIdForQuery = listData.id || listDoc.id; // Use stored original ID, fallback to Firestore ID
      console.log('🔗 getUserLists: Querying items with listId:', listIdForQuery, 'for list document:', listDoc.id);
      
      const itemsQuery = query(
        collection(db, ITEMS_COLLECTION),
        where('listId', '==', listIdForQuery),
        where('userId', '==', userId)
      );
      
      const itemsSnapshot = await getDocs(itemsQuery);
      console.log('🛒 getUserLists: Found', itemsSnapshot.docs.length, 'items for list:', listDoc.id);
      
      const items: ShoppingItem[] = itemsSnapshot.docs
        .map(itemDoc => {
          const data = itemDoc.data();
          console.log('🔧 getUserLists: Processing item:', itemDoc.id, 'with original id:', data.id);
          return {
            ...data,
            id: data.id, // Use the stored original ID from Firestore
            firestoreId: itemDoc.id // Store Firestore document ID for operations
          } as ShoppingItem;
        })
        .filter(item => {
          const isDeleted = item.deleted === true;
          if (isDeleted) {
            console.log('🗑️ getUserLists: Filtering out deleted item:', item.id);
          }
          return !isDeleted;
        })
        .sort((a, b) => (a.position || 0) - (b.position || 0)); // Sort by position
      
      const processedList = {
        ...listData,
        id: listData.id, // Use the stored original ID from Firestore
        firestoreId: listDoc.id, // Store Firestore document ID for operations
        items,
        createdAt: timestampToNumber(listData.createdAt),
        updatedAt: timestampToNumber(listData.updatedAt)
      } as ShoppingList;
      
      console.log('✅ getUserLists: Added list to results:', {
        id: processedList.id,
        firestoreId: processedList.firestoreId,
        name: processedList.name,
        itemCount: processedList.items.length
      });
      
      lists.push(processedList);
    }
    
    console.log('🎯 getUserLists: Returning', lists.length, 'lists total');
    return lists;
  } catch (error) {
    console.error('❌ getUserLists: Error fetching lists:', error);
    throw error;
  }
};

// Save a list to Firestore
export const saveListToFirestore = async (list: ShoppingList, userId: string): Promise<string> => {
  try {
    console.log('💾 saveListToFirestore: Starting to save list:', {
      listId: list.id,
      listName: list.name,
      userId: userId,
      itemCount: list.items.length
    });
    
    const listData = listToFirestore(list, userId);
    console.log('📝 saveListToFirestore: Prepared list data for Firestore:', {
      ...listData,
      createdAt: '[serverTimestamp]',
      updatedAt: '[serverTimestamp]'
    });
    
    let docRef;
    let documentId: string;
    
    // For education list, use its fixed ID as the document ID
    if (list.id === 'education-list') {
      console.log('🎓 saveListToFirestore: Processing education-list');
      const educationDocRef = doc(db, LISTS_COLLECTION, 'education-list');
      
      // Check if education list already exists by directly querying the document
      // This avoids the circular dependency issue with getUserLists
      try {
        const educationSnapshot = await getDocs(query(
          collection(db, LISTS_COLLECTION),
          where('userId', '==', userId),
          where('id', '==', 'education-list')
        ));
        const educationExists = !educationSnapshot.empty;
        console.log('🔍 saveListToFirestore: Education list exists check:', educationExists);
        
        if (!educationExists) {
          console.log('➕ saveListToFirestore: Creating new education list document');
          await setDoc(educationDocRef, listData, { merge: true });
          
          // Only save items if the education list doesn't exist
          console.log('📦 saveListToFirestore: Saving', list.items.length, 'education items');
          for (const item of list.items) {
            const itemData = itemToFirestore(item, 'education-list', userId);
            console.log('🛒 saveListToFirestore: Saving education item:', item.id, item.name);
            await addDoc(collection(db, ITEMS_COLLECTION), itemData);
          }
        } else {
          console.log('⏭️ saveListToFirestore: Education list already exists, skipping');
        }
      } catch (checkError) {
        console.log('⚠️ saveListToFirestore: Error checking education list existence, proceeding with merge:', checkError);
        // If we can't check, use merge to avoid overwriting
        await setDoc(educationDocRef, listData, { merge: true });
      }
      
      documentId = 'education-list';
    } else {
      console.log('📋 saveListToFirestore: Processing regular list');
      // For regular lists, let Firebase generate the ID
      docRef = await addDoc(collection(db, LISTS_COLLECTION), listData);
      documentId = docRef.id;
      console.log('🆔 saveListToFirestore: Generated Firestore document ID:', documentId);
      
      // Save items for regular lists
      console.log('📦 saveListToFirestore: Saving', list.items.length, 'items for regular list');
      for (const item of list.items) {
        const itemData = itemToFirestore(item, documentId, userId);
        console.log('🛒 saveListToFirestore: Saving item:', item.id, item.name, 'to listId:', documentId);
        await addDoc(collection(db, ITEMS_COLLECTION), itemData);
      }
    }
    
    console.log('✅ saveListToFirestore: List saved successfully with Firestore ID:', documentId);
    console.log('✅ saveListToFirestore: All items saved successfully');
    
    return documentId;
  } catch (error: any) {
    console.error('❌ saveListToFirestore: Error saving list to Firestore:', error);
    
    // Handle ERR_BLOCKED_BY_CLIENT gracefully
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.warn('⚠️ saveListToFirestore: ERR_BLOCKED_BY_CLIENT detected, using fallback ID');
      return list.id; // Return the original list ID as fallback
    }
    
    throw error;
  }
};

// Update a list in Firestore
export const updateListInFirestore = async (listId: string, updates: Partial<ShoppingList>, userId: string): Promise<string> => {
  try {
    console.log('📝 updateListInFirestore: Starting update for list:', {
      listId: listId,
      userId: userId,
      updates: Object.keys(updates),
      firestoreId: updates.firestoreId
    });
    
    // Use firestoreId if available, otherwise use the provided listId
    const firestoreDocId = updates.firestoreId || listId;
    const listRef = doc(db, LISTS_COLLECTION, firestoreDocId);
    
    // Filter out undefined values, firestoreId, and items to prevent Firestore errors
    const { firestoreId, items, ...cleanUpdates } = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    console.log('🚫 updateListInFirestore: Filtered out items field and firestoreId from updates');
    if (items && Array.isArray(items)) {
      console.log('📦 updateListInFirestore: Items field was present and filtered out, count:', items.length);
    }
    
    console.log('🔧 updateListInFirestore: Prepared clean updates:', cleanUpdates);
    
    await updateDoc(listRef, {
      ...cleanUpdates,
      userId, // Always include userId to satisfy security rules
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ updateListInFirestore: Successfully updated list:', listId);
    return listId; // Return the logical ID
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
    
    // Handle ERR_BLOCKED_BY_CLIENT gracefully
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.warn('ERR_BLOCKED_BY_CLIENT detected during list update, ignoring to prevent app disruption');
      return listId; // Return the original ID and continue
    }
    
    console.error('Error updating list in Firestore:', error);
    throw error;
  }
};

// Delete a list from Firestore
export const deleteListFromFirestore = async (listId: string, userId: string, firestoreId?: string): Promise<void> => {
  try {
    console.log('🗑️ deleteListFromFirestore: Starting deletion for list:', {
      listId: listId,
      userId: userId,
      firestoreId: firestoreId
    });
    
    // Use firestoreId if available, otherwise use the provided listId
    const firestoreDocId = firestoreId || listId;
    
    console.log('🔍 deleteListFromFirestore: Using Firestore document ID:', firestoreDocId);
    
    // Soft delete all items in the list (query by firestoreDocId)
    const itemsQuery = query(
      collection(db, ITEMS_COLLECTION),
      where('listId', '==', firestoreDocId),
      where('userId', '==', userId)
    );
    
    const itemsSnapshot = await getDocs(itemsQuery);
    console.log('📦 deleteListFromFirestore: Found', itemsSnapshot.docs.length, 'items to delete');
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
    console.log('✅ deleteListFromFirestore: Successfully soft-deleted all items');
    
    try {
      // Soft delete the list using the correct Firestore document ID
      console.log('🗑️ deleteListFromFirestore: Soft-deleting list document:', firestoreDocId);
      await updateDoc(doc(db, LISTS_COLLECTION, firestoreDocId), {
        deleted: true,
        updatedAt: serverTimestamp()
      });
      console.log('✅ deleteListFromFirestore: Successfully soft-deleted list:', listId);
    } catch (listError: any) {
      // If list doesn't exist, just continue
      if (listError.code === 'not-found') {
        console.log('⚠️ deleteListFromFirestore: List document not found, exiting gracefully');
        return; // Exit gracefully
      }
      console.error('❌ deleteListFromFirestore: Error deleting list document:', listError);
      throw listError; // Re-throw other errors
    }
  } catch (error) {
    console.error('❌ deleteListFromFirestore: Error in deletion process:', error);
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
    
    // Handle ERR_BLOCKED_BY_CLIENT gracefully
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.warn('ERR_BLOCKED_BY_CLIENT detected during item save, using fallback ID');
      return item.id; // Return the original item ID as fallback
    }
    
    throw error;
  }
};

// Save or update an item with a specific document ID
export const saveOrUpdateItemInFirestore = async (item: ShoppingItem, listId: string, userId: string, firestoreId?: string): Promise<string> => {
  try {
    const itemData = itemToFirestore(item, listId, userId);
    
    if (firestoreId) {
      // Update existing document
      console.log('📝 saveOrUpdateItemInFirestore: Updating existing item with firestoreId:', firestoreId);
      const itemRef = doc(db, ITEMS_COLLECTION, firestoreId);
      await setDoc(itemRef, itemData, { merge: true });
      return firestoreId;
    } else {
      // Create new document with auto-generated ID
      console.log('📝 saveOrUpdateItemInFirestore: Creating new item');
      const docRef = await addDoc(collection(db, ITEMS_COLLECTION), itemData);
      return docRef.id;
    }
  } catch (error: any) {
    console.error('Error saving/updating item to Firestore:', error);
    
    // Handle ERR_BLOCKED_BY_CLIENT gracefully
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      console.warn('ERR_BLOCKED_BY_CLIENT detected during item save/update, using fallback ID');
      return firestoreId || item.id; // Return the firestoreId or item ID as fallback
    }
    
    throw error;
  }
};

// Update an item in Firestore
export const updateItemInFirestore = async (itemId: string, updates: Partial<ShoppingItem>, userId: string): Promise<string> => {
  try {
    console.log('📝 updateItemInFirestore: Starting update for item:', {
      itemId: itemId,
      userId: userId,
      updates: Object.keys(updates),
      firestoreId: updates.firestoreId
    });
    
    // Use firestoreId if available in updates, otherwise use the provided itemId
    const firestoreDocId = updates.firestoreId || itemId;
    console.log('🔍 updateItemInFirestore: Using Firestore document ID:', firestoreDocId);
    
    const itemRef = doc(db, ITEMS_COLLECTION, firestoreDocId);
    
    // Filter out undefined values and firestoreId to prevent Firestore errors
    const { firestoreId, ...cleanUpdates } = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    console.log('🔧 updateItemInFirestore: Prepared clean updates:', cleanUpdates);
    
    try {
      await updateDoc(itemRef, {
        ...cleanUpdates,
        userId, // Always include userId to satisfy security rules
        updatedAt: serverTimestamp()
      });
    } catch (updateError: any) {
      // If document doesn't exist, we can't update it
      if (updateError.code === 'not-found') {
        console.log('📝 updateItemInFirestore: Document not found, cannot update non-existent item');
        throw new Error('Cannot update item that does not exist in Firestore. Use saveItemToFirestore instead.');
      }
      throw updateError;
    }
    
    console.log('✅ updateItemInFirestore: Successfully updated item:', itemId);
    return itemId;
  } catch (error: any) {
    console.error('❌ updateItemInFirestore: Error updating item:', error);
    
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
      // For ERR_BLOCKED_BY_CLIENT, don't throw the error to prevent app crashes
      if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        console.warn('Ignoring ERR_BLOCKED_BY_CLIENT error to prevent app disruption');
        return itemId; // Return the itemId and exit gracefully
      }
    }
    
    throw error;
  }
};

// Delete an item from Firestore
export const deleteItemFromFirestore = async (itemId: string, userId: string, firestoreId?: string): Promise<void> => {
  try {
    console.log('🗑️ deleteItemFromFirestore: Starting deletion for item:', {
      itemId: itemId,
      userId: userId,
      firestoreId: firestoreId
    });
    
    // Use firestoreId if available, otherwise use the provided itemId
    const firestoreDocId = firestoreId || itemId;
    console.log('🔍 deleteItemFromFirestore: Using Firestore document ID:', firestoreDocId);
    
    await updateDoc(doc(db, ITEMS_COLLECTION, firestoreDocId), {
      deleted: true,
      userId, // Always include userId to satisfy security rules
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ deleteItemFromFirestore: Successfully soft-deleted item:', itemId);
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
      console.warn('Network error during soft delete:', errorMessage);
      // For ERR_BLOCKED_BY_CLIENT, don't throw the error to prevent app crashes
      if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        console.warn('Ignoring ERR_BLOCKED_BY_CLIENT error during delete to prevent app disruption');
        return; // Exit gracefully
      }
    }
    
    throw error;
  }
};

// Sync local lists to Firestore (for when user logs in)
export const syncLocalListsToFirestore = async (localLists: ShoppingList[], userId: string): Promise<void> => {
  try {
    console.log('🔄 syncLocalListsToFirestore: Starting sync for', localLists.length, 'local lists to userId:', userId);
    
    // Sync all lists including education list to Firebase
    for (const list of localLists) {
      console.log('📋 syncLocalListsToFirestore: Syncing list:', {
        id: list.id,
        name: list.name,
        itemCount: list.items.length
      });
      await saveListToFirestore(list, userId);
    }
    
    console.log('✅ syncLocalListsToFirestore: Successfully synced all lists');
  } catch (error) {
    console.error('❌ syncLocalListsToFirestore: Error syncing local lists to Firestore:', error);
    throw error;
  }
};