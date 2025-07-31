import { FiList } from 'react-icons/fi';
import { FaBaby, FaWineGlassAlt } from "react-icons/fa";
import { GiFruitBowl, GiMilkCarton, GiMeat, GiSlicedBread, GiStrong } from "react-icons/gi";
import { IoIosIceCream } from "react-icons/io";
import { RiDrinksFill } from "react-icons/ri";
import { FaCookie, FaBowlRice, FaSuitcaseRolling } from "react-icons/fa6";
import { PiPaintBrushHouseholdFill } from "react-icons/pi";
import { MdFaceRetouchingNatural, MdPets } from "react-icons/md";
import { HiTv } from "react-icons/hi2";

import type { ReactNode } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: ReactNode;
}

export const categories: Category[] = [
  { id: 'general', name: 'General', icon: <FiList /> },
  { id: 'baby', name: 'Baby, Child & Toys', icon: <FaBaby /> },
  { id: 'produce', name: 'Fruits & Vegetables', icon: <GiFruitBowl /> },
  { id: 'dairy', name: 'Dairy, Chilled & Eggs', icon: <GiMilkCarton /> },
  { id: 'meat', name: 'Meat & Seafood', icon: <GiMeat /> },
  { id: 'bakery', name: 'Bakery & Fast Food', icon: <GiSlicedBread /> },
  { id: 'rice', name: 'Rice, Noodles & Ingredients', icon: <FaBowlRice /> },
  { id: 'snacks', name: 'Snacks & Confectionery', icon: <FaCookie /> },
  { id: 'frozen', name: 'Frozen', icon: <IoIosIceCream /> },
  { id: 'drinks', name: 'Drinks', icon: <RiDrinksFill /> },
  { id: 'alcohol', name: 'Beer, Wine & Spirits', icon: <FaWineGlassAlt /> },
  { id: 'beauty', name: 'Beauty & Personal Care', icon: <MdFaceRetouchingNatural /> },
  { id: 'lifestyle', name: 'Lifestyle', icon: <FaSuitcaseRolling /> },
  { id: 'health', name: 'Health & Wellness', icon: <GiStrong /> },
  { id: 'household', name: 'Household', icon: <PiPaintBrushHouseholdFill /> },
  { id: 'electronics', name: 'Electronics', icon: <HiTv /> },
  { id: 'pet', name: 'Pet Supplies', icon: <MdPets /> },
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
