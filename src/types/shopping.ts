// Define types for our shopping list data
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  category: string;
  photoURL?: string;
  position: number;
  firestoreId?: string; // ID of the document in Firestore, may be different from local id
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
};