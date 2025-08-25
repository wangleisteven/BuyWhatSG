# Training Data Refactoring - To-Do List

## ✅ Completed Tasks

### Training Data Files Created
- [x] `babyChildToys.ts` - Baby, Child & Toys category (300+ items)
- [x] `fruitsVegetables.ts` - Fruits & Vegetables category (300+ items)
- [x] `dairyChilledEggs.ts` - Dairy, Chilled & Eggs category (300+ items)
- [x] `meatSeafood.ts` - Meat & Seafood category (300+ items)
- [x] `bakeryFastFood.ts` - Bakery & Fast Food category (100+ items)
- [x] `riceNoodlesIngredients.ts` - Rice, Noodles & Ingredients category (300+ items)
- [x] `snacksConfectionery.ts` - Snacks & Confectionery category (300+ items)
- [x] `frozen.ts` - Frozen category (300+ items)
- [x] `drinks.ts` - Drinks category (100+ items)
- [x] `householdCleaning.ts` - Household & Cleaning category (900+ items)

## 🔄 Remaining Tasks

### 1. Create Missing Training Data Files
Based on categories.tsx, the following training data files still need to be created:

- [ ] `beerWineSpirits.ts` - Beer, Wine & Spirits category (100+ items)
- [ ] `beautyPersonalCare.ts` - Beauty & Personal Care category (100+ items)
- [ ] `lifestyle.ts` - Lifestyle category (100+ items)
- [ ] `healthWellness.ts` - Health & Wellness category (100+ items)
- [ ] `electronics.ts` - Electronics category (100+ items)
- [ ] `petSupplies.ts` - Pet Supplies category (100+ items)

### 2. Update Category Classifier
- [ ] Update `categoryClassifier.ts` to import and use the new training data structure
- [ ] Create a consolidated training data aggregator that imports all category files
- [ ] Update the TRAINING_DATA constant to use the new modular structure
- [ ] Ensure category labels match the ones in `categories.tsx`
- [ ] Test the updated classifier with the new comprehensive training data

### 3. Remove Old Training Data
- [ ] Remove the old `trainingData.ts` file (contains only partial data)
- [ ] Update any imports that reference the old training data file

### 4. Create Training Data Index File
- [ ] Create `src/utils/trainingData/index.ts` to export all training data
- [ ] Aggregate all category training data into a single export
- [ ] Ensure proper TypeScript interfaces are exported

### 5. Update Category Mapping
- [ ] Ensure category IDs in training data match category IDs in `categories.tsx`:
  - `general` → General
  - `baby` → Baby, Child & Toys
  - `produce` → Fruits & Vegetables
  - `dairy` → Dairy, Chilled & Eggs
  - `meat` → Meat & Seafood
  - `bakery` → Bakery & Fast Food
  - `rice` → Rice, Noodles & Ingredients
  - `snacks` → Snacks & Confectionery
  - `frozen` → Frozen
  - `drinks` → Drinks
  - `alcohol` → Beer, Wine & Spirits
  - `beauty` → Beauty & Personal Care
  - `lifestyle` → Lifestyle
  - `health` → Health & Wellness
  - `household` → Household & Cleaning
  - `electronics` → Electronics
  - `pet` → Pet Supplies

### 6. Quality Assurance
- [ ] Verify each category has at least 100 unique items
- [ ] Check for duplicate item names across categories
- [ ] Ensure all training data follows the same format: `{ text: string, label: string }`
- [ ] Test category classification accuracy with the new training data

### 7. API Integration
- [ ] Create API endpoint for auto-labeling item categories
- [ ] Implement model training pipeline (if needed)
- [ ] Add category prediction confidence scores
- [ ] Create UI integration for auto-category suggestions

### 8. Documentation
- [ ] Update README with new training data structure
- [ ] Document the category classification API
- [ ] Add examples of how to add new training data
- [ ] Document the category mapping system

### 9. Testing
- [ ] Create unit tests for category classifier
- [ ] Test with real-world Singapore grocery items
- [ ] Validate classification accuracy across all categories
- [ ] Performance testing with large training datasets

### 10. Deployment
- [ ] Push completed training data to GitHub
- [ ] Deploy updated classifier to production
- [ ] Monitor classification performance in production
- [ ] Gather user feedback on auto-categorization accuracy

## 📊 Progress Summary

**Training Data Files:** 10/16 completed (62.5%)
**Categories with 100+ items:** 10/17 completed (58.8%)
**Missing categories:** 6 (Beer Wine Spirits, Beauty Personal Care, Lifestyle, Health Wellness, Electronics, Pet Supplies)

## 🎯 Next Priority

1. **Create remaining 6 training data files** - This will complete the training data collection phase
2. **Update categoryClassifier.ts** - Critical for making the new training data functional
3. **Create training data index file** - Needed for proper module organization
4. **Test and validate** - Ensure the classifier works with the new comprehensive dataset

## 📝 Notes

- Each training data file should contain 100+ unique items minimum
- Focus on Singapore-specific items where applicable
- Maintain consistent naming conventions across all files
- Ensure no duplicate items across different categories
- The 'General' category should be excluded from having training data as per requirements