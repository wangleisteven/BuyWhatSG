import { 
  FiUser, FiShoppingBag, FiHeart, FiDroplet, FiCoffee, 
  FiCloud, FiCircle, FiShield, FiTool, 
  FiSquare, FiHexagon, FiGrid, FiGift, FiStar, FiList,
  FiBox, FiTv
} from 'react-icons/fi';
import type { ReactNode } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: ReactNode;
}

export const categories: Category[] = [
  { id: 'general', name: 'General', icon: <FiList /> },
  { id: 'produce', name: 'Fruits & Vegetables', icon: <FiCircle /> },
  { id: 'dairy', name: 'Dairy, Chilled & Eggs', icon: <FiBox /> },
  { id: 'meat', name: 'Meat & Seafood', icon: <FiSquare /> },
  { id: 'bakery', name: 'Bakery', icon: <FiShoppingBag /> },
  { id: 'frozen', name: 'Frozen', icon: <FiCloud /> },
  { id: 'drinks', name: 'Drinks', icon: <FiCoffee /> },
  { id: 'alcohol', name: 'Beer, Wine & Spirits', icon: <FiDroplet /> },
  { id: 'snacks', name: 'Snacks & Confectionery', icon: <FiGift /> },
  { id: 'household', name: 'Household', icon: <FiTool /> },
  { id: 'beauty', name: 'Beauty & Personal Care', icon: <FiHeart /> },
  { id: 'health', name: 'Health & Wellness', icon: <FiShield /> },
  { id: 'baby', name: 'Baby, Child & Toys', icon: <FiUser /> },
  { id: 'pet', name: 'Pet Supplies', icon: <FiHexagon /> },
  { id: 'electronics', name: 'Electronics', icon: <FiTv /> },
  { id: 'lifestyle', name: 'Lifestyle', icon: <FiStar /> },
  { id: 'rice', name: 'Rice, Noodles & Ingredients', icon: <FiGrid /> },
];

// Helper function to get category by id
export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(category => category.id === id);
};

// Helper function to get category name by id
export const getCategoryName = (id: string): string => {
  const category = getCategoryById(id);
  return category ? category.name : 'General';
};

// Legacy category mapping for backward compatibility
export const legacyCategoryMap: { [key: string]: string } = {
  'default': 'general',
  'produce': 'produce',
  'dairy': 'dairy',
  'meat': 'meat',
  'bakery': 'bakery',
  'frozen': 'frozen',
  'pantry': 'general',
  'cupboard': 'general',
  'housebrand': 'general',
  'beverages': 'drinks',
  'household': 'household',
  'personal': 'beauty'
};

// Helper function to migrate old category IDs to new ones
export const migrateCategoryId = (oldId: string): string => {
  return legacyCategoryMap[oldId] || oldId;
};