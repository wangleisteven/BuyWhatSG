/**
 * Gemini-powered Category Classification Service
 * Uses Firebase AI Logic SDK with Gemini API for intelligent category classification
 */

import GeminiService from '../services/geminiService';
import { getCachedCategory, setCachedCategory } from '../services/firestore';

interface ClassificationResult {
  category: string;
  confidence: number;
  method: string;
}

// Initialize Gemini service
const geminiService = new GeminiService();

/**
 * Main classification function using Gemini AI
 */
export async function classifyItemCategory(itemName: string): Promise<ClassificationResult> {
  if (!itemName || itemName.trim().length === 0) {
    return {
      category: 'general',
      confidence: 0.1,
      method: 'default'
    };
  }

  try {
    const result = await geminiService.classifyItemCategory(itemName);
    return {
      category: result.category,
      confidence: result.confidence,
      method: 'gemini-ai'
    };
  } catch (error) {
    console.error('Gemini classification failed:', error);
    // Fallback to general category
    return {
      category: 'general',
      confidence: 0.1,
      method: 'fallback'
    };
  }
}

/**
 * Synchronous version for backward compatibility
 * Note: This will return 'general' immediately and classify in background
 */
export function recommendCategory(itemName: string): string {
  // For immediate response, return general and classify in background
  if (!itemName || itemName.trim().length === 0) {
    return 'general';
  }

  // Trigger background classification (fire and forget)
  classifyItemCategory(itemName).catch(error => {
    console.error('Background classification failed:', error);
  });

  // Return general for immediate use
  return 'general';
}

/**
 * Async version of recommendCategory for better UX
 */
export async function recommendCategoryAsync(itemName: string): Promise<string> {
  if (!itemName || itemName.trim().length === 0) {
    return 'general';
  }

  try {
    // Check cache first
    const cachedCategory = await getCachedCategory(itemName);
    if (cachedCategory) {
      return cachedCategory;
    }

    // If not in cache, call AI API
    const result = await classifyItemCategory(itemName);
    
    // Cache the result for future use
    await setCachedCategory(itemName, result.category);
    
    return result.category;
  } catch (error) {
    console.error('Error in recommendCategoryAsync:', error);
    return 'general';
  }
}

/**
 * Get detailed classification results for debugging
 */
export async function getDetailedClassification(itemName: string): Promise<{
  result: ClassificationResult;
  categoryScores: { [key: string]: number };
  topMatches: { text: string; label: string; similarity: number }[];
}> {
  const result = await classifyItemCategory(itemName);
  
  // For Gemini-based classification, we don't have detailed scores
  // Return simplified structure for compatibility
  return {
    result,
    categoryScores: { [result.category]: result.confidence },
    topMatches: [{
      text: itemName,
      label: result.category,
      similarity: result.confidence
    }]
  };
}

/**
 * Test the classifier with sample items
 */
export async function testClassifier(): Promise<void> {
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
    'gin',
    'pants',
    'ice cream',
    'table',
    'rice cooker'
  ];
  
  console.log('=== Gemini-Powered Category Classifier Test Results ===');
  
  for (const item of testItems) {
    try {
      const result = await classifyItemCategory(item);
      console.log(`\nItem: "${item}"`);
      console.log(`Predicted: ${result.category} (confidence: ${result.confidence.toFixed(3)})`);
      console.log(`Method: ${result.method}`);
    } catch (error) {
      console.error(`Error classifying "${item}":`, error);
    }
  }
}