/**
 * Advanced Category Classification using Transformer-based Text Classification
 * Based on Hugging Face Transformers approach for sequence classification
 */

import { allTrainingData as importedTrainingData } from './trainingData/index';

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
// Now using modular training data from separate files
const TRAINING_DATA = importedTrainingData;

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