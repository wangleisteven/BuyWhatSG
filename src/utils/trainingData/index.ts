// Main training data index file
// Exports all category training data for the ML model

import { beerWineSpiritsTrainingData } from './beerWineSpirits';
import { beautyPersonalCareTrainingData } from './beautyPersonalCare';
import { lifestyleTrainingData } from './lifestyle';
import { householdTrainingData } from './household';
import { healthWellnessTrainingData } from './healthWellness';
import { electronicsTrainingData } from './electronics';
import { babyTrainingData } from './baby';
import { petSuppliesTrainingData } from './petSupplies';
import { fruitsVegetablesTrainingData } from './fruitsVegetables';
import { dairyChilledEggsTrainingData } from './dairyChilledEggs';
import { meatSeafoodTrainingData } from './meatSeafood';
import { bakeryFastFoodTrainingData } from './bakeryFastFood';
import { riceNoodlesIngredientsTrainingData } from './riceNoodlesIngredients';
import { snacksConfectioneryTrainingData } from './snacksConfectionery';
import { frozenTrainingData } from './frozen';
import { drinksTrainingData } from './drinks';

// Combine all training data
export const allTrainingData = [
  ...beerWineSpiritsTrainingData,
  ...beautyPersonalCareTrainingData,
  ...lifestyleTrainingData,
  ...householdTrainingData,
  ...healthWellnessTrainingData,
  ...electronicsTrainingData,
  ...babyTrainingData,
  ...petSuppliesTrainingData,
  ...fruitsVegetablesTrainingData,
  ...dairyChilledEggsTrainingData,
  ...meatSeafoodTrainingData,
  ...bakeryFastFoodTrainingData,
  ...riceNoodlesIngredientsTrainingData,
  ...snacksConfectioneryTrainingData,
  ...frozenTrainingData,
  ...drinksTrainingData
];

// Export individual category data
export {
  beerWineSpiritsTrainingData,
  beautyPersonalCareTrainingData,
  lifestyleTrainingData,
  householdTrainingData,
  healthWellnessTrainingData,
  electronicsTrainingData,
  babyTrainingData,
  petSuppliesTrainingData,
  fruitsVegetablesTrainingData,
  dairyChilledEggsTrainingData,
  meatSeafoodTrainingData,
  bakeryFastFoodTrainingData,
  riceNoodlesIngredientsTrainingData,
  snacksConfectioneryTrainingData,
  frozenTrainingData,
  drinksTrainingData
};

// Training data statistics
export const trainingDataStats = {
  totalItems: allTrainingData.length,
  categories: {
    'alcohol': beerWineSpiritsTrainingData.length,
    'beauty': beautyPersonalCareTrainingData.length,
    'lifestyle': lifestyleTrainingData.length,
    'household': householdTrainingData.length,
    'health': healthWellnessTrainingData.length,
    'electronics': electronicsTrainingData.length,
    'baby': babyTrainingData.length,
    'pet': petSuppliesTrainingData.length,
    'produce': fruitsVegetablesTrainingData.length,
    'dairy': dairyChilledEggsTrainingData.length,
    'meat': meatSeafoodTrainingData.length,
    'bakery': bakeryFastFoodTrainingData.length,
    'rice': riceNoodlesIngredientsTrainingData.length,
    'snacks': snacksConfectioneryTrainingData.length,
    'frozen': frozenTrainingData.length,
    'drinks': drinksTrainingData.length
  }
};

// Validation function to check for duplicates across categories
export const validateTrainingData = () => {
  const textSet = new Set();
  const duplicates: string[] = [];
  
  allTrainingData.forEach(item => {
    if (textSet.has(item.text)) {
      duplicates.push(item.text);
    } else {
      textSet.add(item.text);
    }
  });
  
  return {
    isValid: duplicates.length === 0,
    duplicates,
    totalUniqueItems: textSet.size
  };
};