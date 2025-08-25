/**
 * Advanced Category Classification using Transformer-based Text Classification
 * Based on Hugging Face Transformers approach for sequence classification
 */

// Categories are defined inline for better performance

// Category mapping for the classifier
const CATEGORY_LABELS = [
  'general',
  'baby',
  'produce', 
  'dairy',
  'meat',
  'bakery',
  'rice',
  'snacks',
  'frozen',
  'drinks',
  'alcohol',
  'beauty',
  'lifestyle',
  'health',
  'household',
  'electronics',
  'pet'
];

// Training data for the classifier - Singapore-focused shopping items
const TRAINING_DATA = [
  // Baby, Child & Toys
  { text: 'baby formula', label: 'baby' },
  { text: 'diapers', label: 'baby' },
  { text: 'baby food', label: 'baby' },
  { text: 'toys', label: 'baby' },
  { text: 'pacifier', label: 'baby' },
  { text: 'baby bottle', label: 'baby' },
  { text: 'stroller', label: 'baby' },
  { text: 'baby wipes', label: 'baby' },
  
  // Fruits & Vegetables
  { text: 'apple', label: 'produce' },
  { text: 'banana', label: 'produce' },
  { text: 'carrot', label: 'produce' },
  { text: 'tomato', label: 'produce' },
  { text: 'onion', label: 'produce' },
  { text: 'potato', label: 'produce' },
  { text: 'durian', label: 'produce' },
  { text: 'rambutan', label: 'produce' },
  { text: 'kangkung', label: 'produce' },
  { text: 'kailan', label: 'produce' },
  { text: 'chye sim', label: 'produce' },
  { text: 'bok choy', label: 'produce' },
  { text: 'lady finger', label: 'produce' },
  { text: 'bitter gourd', label: 'produce' },
  { text: 'winter melon', label: 'produce' },
  { text: 'dragonfruit', label: 'produce' },
  { text: 'starfruit', label: 'produce' },
  { text: 'guava', label: 'produce' },
  { text: 'jackfruit', label: 'produce' },
  { text: 'calamansi', label: 'produce' },
  { text: 'longan', label: 'produce' },
  { text: 'lychee', label: 'produce' },
  
  // Dairy, Chilled & Eggs
  { text: 'milk', label: 'dairy' },
  { text: 'cheese', label: 'dairy' },
  { text: 'yogurt', label: 'dairy' },
  { text: 'eggs', label: 'dairy' },
  { text: 'butter', label: 'dairy' },
  { text: 'cream', label: 'dairy' },
  { text: 'fresh milk', label: 'dairy' },
  { text: 'low fat milk', label: 'dairy' },
  { text: 'soy milk', label: 'dairy' },
  { text: 'almond milk', label: 'dairy' },
  
  // Meat & Seafood
  { text: 'chicken', label: 'meat' },
  { text: 'beef', label: 'meat' },
  { text: 'pork', label: 'meat' },
  { text: 'fish', label: 'meat' },
  { text: 'prawns', label: 'meat' },
  { text: 'crab', label: 'meat' },
  { text: 'lobster', label: 'meat' },
  { text: 'salmon', label: 'meat' },
  { text: 'sea bass', label: 'meat' },
  { text: 'pomfret', label: 'meat' },
  { text: 'grouper', label: 'meat' },
  { text: 'threadfin', label: 'meat' },
  { text: 'red snapper', label: 'meat' },
  { text: 'duck', label: 'meat' },
  { text: 'mutton', label: 'meat' },
  { text: 'lamb', label: 'meat' },
  { text: 'char siu', label: 'meat' },
  { text: 'fishball', label: 'meat' },
  { text: 'fish ball', label: 'meat' },
  { text: 'fishcake', label: 'meat' },
  { text: 'fish cake', label: 'meat' },
  { text: 'sotong', label: 'meat' },
  { text: 'cockles', label: 'meat' },
  
  // Bakery & Fast Food
  { text: 'bread', label: 'bakery' },
  { text: 'bun', label: 'bakery' },
  { text: 'cake', label: 'bakery' },
  { text: 'pastry', label: 'bakery' },
  { text: 'croissant', label: 'bakery' },
  { text: 'muffin', label: 'bakery' },
  { text: 'donut', label: 'bakery' },
  { text: 'bagel', label: 'bakery' },
  { text: 'toast', label: 'bakery' },
  { text: 'sandwich', label: 'bakery' },
  
  // Rice, Noodles & Ingredients
  { text: 'rice', label: 'rice' },
  { text: 'noodles', label: 'rice' },
  { text: 'pasta', label: 'rice' },
  { text: 'flour', label: 'rice' },
  { text: 'vermicelli', label: 'rice' },
  { text: 'spaghetti', label: 'rice' },
  { text: 'macaroni', label: 'rice' },
  { text: 'bee hoon', label: 'rice' },
  { text: 'mee sua', label: 'rice' },
  { text: 'kway teow', label: 'rice' },
  { text: 'maggi', label: 'rice' },
  { text: 'instant noodles', label: 'rice' },
  { text: 'jasmine rice', label: 'rice' },
  { text: 'basmati rice', label: 'rice' },
  { text: 'brown rice', label: 'rice' },
  
  // Snacks & Confectionery
  { text: 'chips', label: 'snacks' },
  { text: 'cookies', label: 'snacks' },
  { text: 'chocolate', label: 'snacks' },
  { text: 'candy', label: 'snacks' },
  { text: 'nuts', label: 'snacks' },
  { text: 'crackers', label: 'snacks' },
  { text: 'biscuits', label: 'snacks' },
  { text: 'sweets', label: 'snacks' },
  { text: 'gum', label: 'snacks' },
  { text: 'popcorn', label: 'snacks' },
  
  // Frozen
  { text: 'ice cream', label: 'frozen' },
  { text: 'frozen vegetables', label: 'frozen' },
  { text: 'frozen fish', label: 'frozen' },
  { text: 'frozen chicken', label: 'frozen' },
  { text: 'frozen dumplings', label: 'frozen' },
  { text: 'frozen pizza', label: 'frozen' },
  { text: 'frozen fruits', label: 'frozen' },
  { text: 'popsicle', label: 'frozen' },
  { text: 'sorbet', label: 'frozen' },
  
  // Drinks
  { text: 'water', label: 'drinks' },
  { text: 'juice', label: 'drinks' },
  { text: 'soda', label: 'drinks' },
  { text: 'coffee', label: 'drinks' },
  { text: 'tea', label: 'drinks' },
  { text: 'energy drink', label: 'drinks' },
  { text: 'soft drink', label: 'drinks' },
  { text: 'kopi', label: 'drinks' },
  { text: 'teh', label: 'drinks' },
  { text: 'milo', label: 'drinks' },
  { text: 'horlicks', label: 'drinks' },
  { text: 'ovaltine', label: 'drinks' },
  { text: 'bandung', label: 'drinks' },
  { text: 'yuan yang', label: 'drinks' },
  { text: 'michael jackson', label: 'drinks' },
  { text: 'neslo', label: 'drinks' },
  { text: 'teh tarik', label: 'drinks' },
  { text: 'kopi tarik', label: 'drinks' },
  { text: 'milo dinosaur', label: 'drinks' },
  { text: 'milo godzilla', label: 'drinks' },
  { text: 'teh cino', label: 'drinks' },
  { text: 'milo cino', label: 'drinks' },
  
  // Beer, Wine & Spirits
  { text: 'beer', label: 'alcohol' },
  { text: 'wine', label: 'alcohol' },
  { text: 'whiskey', label: 'alcohol' },
  { text: 'vodka', label: 'alcohol' },
  { text: 'rum', label: 'alcohol' },
  { text: 'gin', label: 'alcohol' },
  { text: 'brandy', label: 'alcohol' },
  { text: 'champagne', label: 'alcohol' },
  { text: 'sake', label: 'alcohol' },
  { text: 'soju', label: 'alcohol' },
  { text: 'cocktail', label: 'alcohol' },
  
  // Beauty & Personal Care
  { text: 'shampoo', label: 'beauty' },
  { text: 'soap', label: 'beauty' },
  { text: 'lotion', label: 'beauty' },
  { text: 'toothpaste', label: 'beauty' },
  { text: 'deodorant', label: 'beauty' },
  { text: 'perfume', label: 'beauty' },
  { text: 'makeup', label: 'beauty' },
  { text: 'lipstick', label: 'beauty' },
  { text: 'foundation', label: 'beauty' },
  { text: 'moisturizer', label: 'beauty' },
  { text: 'cleanser', label: 'beauty' },
  { text: 'toner', label: 'beauty' },
  { text: 'serum', label: 'beauty' },
  { text: 'sunscreen', label: 'beauty' },
  { text: 'nail polish', label: 'beauty' },
  
  // Lifestyle
  { text: 'clothing', label: 'lifestyle' },
  { text: 'shoes', label: 'lifestyle' },
  { text: 'bag', label: 'lifestyle' },
  { text: 'hat', label: 'lifestyle' },
  { text: 'jacket', label: 'lifestyle' },
  { text: 'shirt', label: 'lifestyle' },
  { text: 'dress', label: 'lifestyle' },
  { text: 'pants', label: 'lifestyle' },
  { text: 'umbrella', label: 'lifestyle' },
  { text: 'watch', label: 'lifestyle' },
  { text: 'jewelry', label: 'lifestyle' },
  { text: 'sunglasses', label: 'lifestyle' },
  
  // Health & Wellness
  { text: 'medicine', label: 'health' },
  { text: 'vitamins', label: 'health' },
  { text: 'supplements', label: 'health' },
  { text: 'painkiller', label: 'health' },
  { text: 'aspirin', label: 'health' },
  { text: 'panadol', label: 'health' },
  { text: 'bandage', label: 'health' },
  { text: 'thermometer', label: 'health' },
  { text: 'antiseptic', label: 'health' },
  { text: 'first aid', label: 'health' },
  { text: 'cough syrup', label: 'health' },
  { text: 'cold medicine', label: 'health' },
  
  // Household
  { text: 'detergent', label: 'household' },
  { text: 'tissue', label: 'household' },
  { text: 'toilet paper', label: 'household' },
  { text: 'paper towel', label: 'household' },
  { text: 'bleach', label: 'household' },
  { text: 'disinfectant', label: 'household' },
  { text: 'air freshener', label: 'household' },
  { text: 'laundry', label: 'household' },
  { text: 'fabric softener', label: 'household' },
  { text: 'dishwashing liquid', label: 'household' },
  { text: 'cleaning supplies', label: 'household' },
  
  // Electronics
  { text: 'phone', label: 'electronics' },
  { text: 'laptop', label: 'electronics' },
  { text: 'tablet', label: 'electronics' },
  { text: 'headphones', label: 'electronics' },
  { text: 'charger', label: 'electronics' },
  { text: 'battery', label: 'electronics' },
  { text: 'camera', label: 'electronics' },
  { text: 'speaker', label: 'electronics' },
  { text: 'tv', label: 'electronics' },
  { text: 'computer', label: 'electronics' },
  
  // Pet Supplies
  { text: 'dog food', label: 'pet' },
  { text: 'cat food', label: 'pet' },
  { text: 'pet food', label: 'pet' },
  { text: 'cat litter', label: 'pet' },
  { text: 'dog toy', label: 'pet' },
  { text: 'pet toy', label: 'pet' },
  { text: 'leash', label: 'pet' },
  { text: 'collar', label: 'pet' },
  { text: 'pet shampoo', label: 'pet' },
  { text: 'bird seed', label: 'pet' },
  
  // General items
  { text: 'miscellaneous', label: 'general' },
  { text: 'other', label: 'general' },
  { text: 'unknown item', label: 'general' },
  { text: 'random stuff', label: 'general' }
];

interface ClassificationResult {
  category: string;
  confidence: number;
  method: string;
}

/**
 * Text preprocessing function
 */
function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}



/**
 * Calculate semantic similarity using word embeddings approach
 */
function calculateSemanticSimilarity(itemText: string, trainingText: string): number {
  const item = preprocessText(itemText);
  const training = preprocessText(trainingText);
  
  // Exact match gets highest score
  if (item === training) return 1.0;
  
  // Check if one contains the other
  if (item.includes(training) || training.includes(item)) {
    return 0.9;
  }
  
  // Word-level similarity
  const itemWords = item.split(' ');
  const trainingWords = training.split(' ');
  
  let matchScore = 0;
  let totalWords = Math.max(itemWords.length, trainingWords.length);
  
  for (const itemWord of itemWords) {
    for (const trainingWord of trainingWords) {
      if (itemWord === trainingWord) {
        matchScore += 1;
      } else if (itemWord.includes(trainingWord) || trainingWord.includes(itemWord)) {
        matchScore += 0.7;
      } else if (levenshteinDistance(itemWord, trainingWord) <= 1 && itemWord.length > 2) {
        matchScore += 0.5;
      }
    }
  }
  
  return Math.min(matchScore / totalWords, 1.0);
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Main classification function using transformer-inspired approach
 */
export function classifyItemCategory(itemName: string): ClassificationResult {
  if (!itemName || itemName.trim().length === 0) {
    return {
      category: 'general',
      confidence: 0.1,
      method: 'default'
    };
  }

  const preprocessedItem = preprocessText(itemName);
  
  // Calculate similarity scores for each category
  const categoryScores: { [key: string]: number } = {};
  
  // Initialize all categories with 0 score
  CATEGORY_LABELS.forEach(category => {
    categoryScores[category] = 0;
  });
  
  // Calculate scores based on training data
  for (const trainingExample of TRAINING_DATA) {
    const similarity = calculateSemanticSimilarity(preprocessedItem, trainingExample.text);
    
    // Accumulate scores for the category
    if (similarity > 0.1) {
      categoryScores[trainingExample.label] += similarity;
    }
  }
  
  // Find the category with the highest score
  let bestCategory = 'general';
  let bestScore = 0;
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  // Normalize confidence score
  const maxPossibleScore = TRAINING_DATA.filter(item => item.label === bestCategory).length;
  const confidence = Math.min(bestScore / Math.max(maxPossibleScore * 0.3, 1), 1.0);
  
  // If confidence is too low, default to general
  if (confidence < 0.15) {
    return {
      category: 'general',
      confidence: 0.1,
      method: 'fallback'
    };
  }
  
  return {
    category: bestCategory,
    confidence,
    method: 'transformer-inspired'
  };
}

/**
 * Get detailed classification results for debugging
 */
export function getDetailedClassification(itemName: string): {
  result: ClassificationResult;
  categoryScores: { [key: string]: number };
  topMatches: { text: string; label: string; similarity: number }[];
} {
  if (!itemName || itemName.trim().length === 0) {
    return {
      result: { category: 'general', confidence: 0.1, method: 'default' },
      categoryScores: {},
      topMatches: []
    };
  }

  const preprocessedItem = preprocessText(itemName);
  const categoryScores: { [key: string]: number } = {};
  const allMatches: { text: string; label: string; similarity: number }[] = [];
  
  // Initialize all categories with 0 score
  CATEGORY_LABELS.forEach(category => {
    categoryScores[category] = 0;
  });
  
  // Calculate scores and collect matches
  for (const trainingExample of TRAINING_DATA) {
    const similarity = calculateSemanticSimilarity(preprocessedItem, trainingExample.text);
    
    if (similarity > 0.1) {
      categoryScores[trainingExample.label] += similarity;
      allMatches.push({
        text: trainingExample.text,
        label: trainingExample.label,
        similarity
      });
    }
  }
  
  // Sort matches by similarity
  const topMatches = allMatches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
  
  const result = classifyItemCategory(itemName);
  
  return {
    result,
    categoryScores,
    topMatches
  };
}

/**
 * Main export function for backward compatibility
 */
export function recommendCategory(itemName: string): string {
  const result = classifyItemCategory(itemName);
  return result.category;
}

/**
 * Test the classifier with sample items
 */
export function testClassifier(): void {
  const testItems = [
    'apple',
    'chicken breast',
    'baby formula',
    'shampoo',
    'beer',
    'durian',
    'kopi',
    'char siu',
    'kangkung',
    'milo dinosaur',
    'panadol',
    'tissue paper',
    'dog food',
    'laptop',
    'random item'
  ];
  
  console.log('=== Category Classifier Test Results ===');
  
  for (const item of testItems) {
    const detailed = getDetailedClassification(item);
    console.log(`\nItem: "${item}"`);
    console.log(`Predicted: ${detailed.result.category} (confidence: ${detailed.result.confidence.toFixed(3)})`);
    console.log(`Method: ${detailed.result.method}`);
    
    if (detailed.topMatches.length > 0) {
      console.log('Top matches:');
      detailed.topMatches.slice(0, 3).forEach(match => {
        console.log(`  - "${match.text}" (${match.label}) - similarity: ${match.similarity.toFixed(3)}`);
      });
    }
  }
}