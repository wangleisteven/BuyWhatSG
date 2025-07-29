// Define types for our shopping list data
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  category: string;
  photoURL?: string;
  position: number;
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
};