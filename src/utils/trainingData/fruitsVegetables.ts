/**
 * Training data for Fruits & Vegetables category
 * Singapore-focused produce items including local and imported varieties
 */

export interface TrainingDataItem {
  text: string;
  label: string;
}

export const fruitsVegetablesTrainingData: TrainingDataItem[] = [
  // Local Fruits
  { text: 'durian', label: 'produce' },
  { text: 'rambutan', label: 'produce' },
  { text: 'mangosteen', label: 'produce' },
  { text: 'jackfruit', label: 'produce' },
  { text: 'starfruit', label: 'produce' },
  { text: 'dragonfruit', label: 'produce' },
  { text: 'longan', label: 'produce' },
  { text: 'lychee', label: 'produce' },
  { text: 'calamansi', label: 'produce' },
  { text: 'guava', label: 'produce' },
  { text: 'papaya', label: 'produce' },
  { text: 'coconut', label: 'produce' },
  { text: 'passion fruit', label: 'produce' },
  { text: 'soursop', label: 'produce' },
  { text: 'custard apple', label: 'produce' },
  
  // Common Fruits
  { text: 'apple', label: 'produce' },
  { text: 'banana', label: 'produce' },
  { text: 'orange', label: 'produce' },
  { text: 'grapes', label: 'produce' },
  { text: 'strawberry', label: 'produce' },
  { text: 'pineapple', label: 'produce' },
  { text: 'mango', label: 'produce' },
  { text: 'watermelon', label: 'produce' },
  { text: 'honeydew', label: 'produce' },
  { text: 'cantaloupe', label: 'produce' },
  { text: 'kiwi', label: 'produce' },
  { text: 'pear', label: 'produce' },
  { text: 'peach', label: 'produce' },
  { text: 'plum', label: 'produce' },
  { text: 'cherry', label: 'produce' },
  { text: 'blueberry', label: 'produce' },
  { text: 'blackberry', label: 'produce' },
  { text: 'raspberry', label: 'produce' },
  { text: 'avocado', label: 'produce' },
  { text: 'lemon', label: 'produce' },
  { text: 'lime', label: 'produce' },
  { text: 'grapefruit', label: 'produce' },
  { text: 'pomegranate', label: 'produce' },
  { text: 'fig', label: 'produce' },
  { text: 'dates', label: 'produce' },
  
  // Asian Fruits
  { text: 'persimmon', label: 'produce' },
  { text: 'asian pear', label: 'produce' },
  { text: 'loquat', label: 'produce' },
  { text: 'pomelo', label: 'produce' },
  { text: 'mandarin orange', label: 'produce' },
  { text: 'tangerine', label: 'produce' },
  { text: 'dragon eye', label: 'produce' },
  { text: 'water apple', label: 'produce' },
  { text: 'rose apple', label: 'produce' },
  { text: 'snake fruit', label: 'produce' },
  
  // Local Vegetables
  { text: 'kangkung', label: 'produce' },
  { text: 'kailan', label: 'produce' },
  { text: 'chye sim', label: 'produce' },
  { text: 'bok choy', label: 'produce' },
  { text: 'xiao bai cai', label: 'produce' },
  { text: 'nai bai', label: 'produce' },
  { text: 'tong ho', label: 'produce' },
  { text: 'spinach', label: 'produce' },
  { text: 'lettuce', label: 'produce' },
  { text: 'cabbage', label: 'produce' },
  { text: 'lady finger', label: 'produce' },
  { text: 'long bean', label: 'produce' },
  { text: 'french bean', label: 'produce' },
  { text: 'bitter gourd', label: 'produce' },
  { text: 'winter melon', label: 'produce' },
  { text: 'bottle gourd', label: 'produce' },
  { text: 'ridge gourd', label: 'produce' },
  { text: 'snake gourd', label: 'produce' },
  { text: 'cucumber', label: 'produce' },
  { text: 'brinjal', label: 'produce' },
  { text: 'eggplant', label: 'produce' },
  { text: 'tomato', label: 'produce' },
  { text: 'cherry tomato', label: 'produce' },
  
  // Root Vegetables
  { text: 'potato', label: 'produce' },
  { text: 'sweet potato', label: 'produce' },
  { text: 'carrot', label: 'produce' },
  { text: 'radish', label: 'produce' },
  { text: 'white radish', label: 'produce' },
  { text: 'turnip', label: 'produce' },
  { text: 'beetroot', label: 'produce' },
  { text: 'yam', label: 'produce' },
  { text: 'taro', label: 'produce' },
  { text: 'cassava', label: 'produce' },
  { text: 'ginger', label: 'produce' },
  { text: 'galangal', label: 'produce' },
  { text: 'turmeric', label: 'produce' },
  
  // Onions & Aromatics
  { text: 'onion', label: 'produce' },
  { text: 'red onion', label: 'produce' },
  { text: 'shallot', label: 'produce' },
  { text: 'spring onion', label: 'produce' },
  { text: 'scallion', label: 'produce' },
  { text: 'leek', label: 'produce' },
  { text: 'garlic', label: 'produce' },
  { text: 'lemongrass', label: 'produce' },
  { text: 'kaffir lime leaves', label: 'produce' },
  { text: 'pandan leaves', label: 'produce' },
  { text: 'curry leaves', label: 'produce' },
  
  // Peppers & Chilies
  { text: 'chili', label: 'produce' },
  { text: 'red chili', label: 'produce' },
  { text: 'green chili', label: 'produce' },
  { text: 'bird eye chili', label: 'produce' },
  { text: 'bell pepper', label: 'produce' },
  { text: 'red pepper', label: 'produce' },
  { text: 'green pepper', label: 'produce' },
  { text: 'yellow pepper', label: 'produce' },
  { text: 'capsicum', label: 'produce' },
  
  // Mushrooms
  { text: 'mushroom', label: 'produce' },
  { text: 'button mushroom', label: 'produce' },
  { text: 'shiitake mushroom', label: 'produce' },
  { text: 'oyster mushroom', label: 'produce' },
  { text: 'enoki mushroom', label: 'produce' },
  { text: 'shimeji mushroom', label: 'produce' },
  { text: 'portobello mushroom', label: 'produce' },
  { text: 'king oyster mushroom', label: 'produce' },
  
  // Herbs
  { text: 'basil', label: 'produce' },
  { text: 'thai basil', label: 'produce' },
  { text: 'holy basil', label: 'produce' },
  { text: 'mint', label: 'produce' },
  { text: 'coriander', label: 'produce' },
  { text: 'cilantro', label: 'produce' },
  { text: 'parsley', label: 'produce' },
  { text: 'dill', label: 'produce' },
  { text: 'rosemary', label: 'produce' },
  { text: 'thyme', label: 'produce' },
  { text: 'oregano', label: 'produce' },
  { text: 'sage', label: 'produce' },
  
  // Bean Sprouts & Shoots
  { text: 'bean sprout', label: 'produce' },
  { text: 'mung bean sprout', label: 'produce' },
  { text: 'soy bean sprout', label: 'produce' },
  { text: 'bamboo shoot', label: 'produce' },
  { text: 'corn', label: 'produce' },
  { text: 'baby corn', label: 'produce' },
  
  // Squash & Gourds
  { text: 'pumpkin', label: 'produce' },
  { text: 'butternut squash', label: 'produce' },
  { text: 'acorn squash', label: 'produce' },
  { text: 'zucchini', label: 'produce' },
  { text: 'yellow squash', label: 'produce' },
  
  // Specialty Asian Vegetables
  { text: 'water chestnut', label: 'produce' },
  { text: 'lotus root', label: 'produce' },
  { text: 'wood ear mushroom', label: 'produce' },
  { text: 'dried shiitake', label: 'produce' },
  { text: 'seaweed', label: 'produce' },
  { text: 'nori', label: 'produce' },
  { text: 'wakame', label: 'produce' },
  
  // Salad Greens
  { text: 'arugula', label: 'produce' },
  { text: 'rocket', label: 'produce' },
  { text: 'watercress', label: 'produce' },
  { text: 'kale', label: 'produce' },
  { text: 'swiss chard', label: 'produce' },
  { text: 'collard greens', label: 'produce' },
  { text: 'mustard greens', label: 'produce' },
  { text: 'iceberg lettuce', label: 'produce' },
  { text: 'romaine lettuce', label: 'produce' },
  { text: 'butter lettuce', label: 'produce' },
  
  // Exotic & Imported
  { text: 'artichoke', label: 'produce' },
  { text: 'asparagus', label: 'produce' },
  { text: 'brussels sprouts', label: 'produce' },
  { text: 'cauliflower', label: 'produce' },
  { text: 'broccoli', label: 'produce' },
  { text: 'celery', label: 'produce' },
  { text: 'fennel', label: 'produce' },
  { text: 'endive', label: 'produce' },
  { text: 'radicchio', label: 'produce' },
  
  // Packaged Produce
  { text: 'pre-cut vegetables', label: 'produce' },
  { text: 'salad mix', label: 'produce' },
  { text: 'fruit salad', label: 'produce' },
  { text: 'vegetable mix', label: 'produce' },
  { text: 'stir fry mix', label: 'produce' },
  { text: 'soup vegetables', label: 'produce' },
  
  // Dried Fruits
  { text: 'raisins', label: 'produce' },
  { text: 'dried apricot', label: 'produce' },
  { text: 'dried mango', label: 'produce' },
  { text: 'dried pineapple', label: 'produce' },
  { text: 'dried banana', label: 'produce' },
  { text: 'prunes', label: 'produce' },
  { text: 'dried cranberry', label: 'produce' },
  { text: 'dried goji berry', label: 'produce' },
  
  // Nuts (produce section)
  { text: 'coconut meat', label: 'produce' },
  { text: 'young coconut', label: 'produce' },
  { text: 'coconut water', label: 'produce' },
  
  // Seasonal Specialties
  { text: 'chinese new year oranges', label: 'produce' },
  { text: 'mandarin oranges', label: 'produce' },
  { text: 'mooncake fruit', label: 'produce' },
  { text: 'festive fruit basket', label: 'produce' },
  
  // Organic Varieties
  { text: 'organic apple', label: 'produce' },
  { text: 'organic banana', label: 'produce' },
  { text: 'organic carrot', label: 'produce' },
  { text: 'organic spinach', label: 'produce' },
  { text: 'organic tomato', label: 'produce' },
  { text: 'organic lettuce', label: 'produce' },
  { text: 'organic potato', label: 'produce' },
  { text: 'organic onion', label: 'produce' },
  
  // Baby Vegetables
  { text: 'baby carrot', label: 'produce' },
  { text: 'baby potato', label: 'produce' },
  { text: 'baby spinach', label: 'produce' },
  { text: 'baby bok choy', label: 'produce' },
  { text: 'baby corn', label: 'produce' },
  { text: 'baby cucumber', label: 'produce' },
  { text: 'baby eggplant', label: 'produce' },
  
  // Microgreens
  { text: 'microgreens', label: 'produce' },
  { text: 'pea shoots', label: 'produce' },
  { text: 'sunflower shoots', label: 'produce' },
  { text: 'radish microgreens', label: 'produce' },
  { text: 'broccoli microgreens', label: 'produce' },
  
  // Edible Flowers
  { text: 'edible flowers', label: 'produce' },
  { text: 'nasturtium', label: 'produce' },
  { text: 'viola', label: 'produce' },
  { text: 'chrysanthemum', label: 'produce' },
  
  // Specialty Items
  { text: 'aloe vera', label: 'produce' },
  { text: 'wheatgrass', label: 'produce' },
  { text: 'sprouts mix', label: 'produce' },
  { text: 'living lettuce', label: 'produce' },
  { text: 'hydroponic vegetables', label: 'produce' }
];

export default fruitsVegetablesTrainingData;