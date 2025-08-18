import { categoryMappings } from '../config/categoryMappings';
import { categories } from '../config/categories';

interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  subcategory: string;
  confidence: number;
}

interface RecommendationResult {
  category: string;
  confidence: number;
  method: 'direct' | 'context' | 'pattern' | 'keyword' | 'similarity';
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate Dice coefficient between two strings
 */
function diceCoefficient(str1: string, str2: string): number {
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);
  
  if (bigrams1.length === 0 && bigrams2.length === 0) return 1;
  if (bigrams1.length === 0 || bigrams2.length === 0) return 0;
  
  const intersection = bigrams1.filter(bigram => bigrams2.includes(bigram));
  return (2 * intersection.length) / (bigrams1.length + bigrams2.length);
}

/**
 * Get bigrams from a string
 */
function getBigrams(str: string): string[] {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Check for direct mapping match
 */
function getDirectMatch(itemName: string): RecommendationResult | null {
  const normalizedItem = itemName.toLowerCase().trim();
  
  if (categoryMappings.directMappings[normalizedItem]) {
    return {
      category: categoryMappings.directMappings[normalizedItem],
      confidence: 1.0,
      method: 'direct'
    };
  }
  
  return null;
}

/**
 * Check for context-sensitive matches
 */
function getContextMatch(itemName: string): RecommendationResult | null {
  const normalizedItem = itemName.toLowerCase().trim();
  
  // Sort context rules by priority (highest first)
  const sortedRules = [...categoryMappings.contextRules].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    if (rule.pattern.test(normalizedItem) && rule.condition.test(normalizedItem)) {
      return {
        category: rule.category,
        confidence: 0.95,
        method: 'context'
      };
    }
  }
  
  return null;
}

/**
 * Check for pattern-based matches
 */
function getPatternMatch(itemName: string): RecommendationResult | null {
  const normalizedItem = itemName.toLowerCase().trim();
  
  // Sort patterns by priority (highest first)
  const sortedPatterns = [...categoryMappings.patternMappings].sort((a, b) => b.priority - a.priority);
  
  for (const pattern of sortedPatterns) {
    if (pattern.pattern.test(normalizedItem)) {
      const confidence = Math.min(0.9, 0.5 + (pattern.priority / 100));
      return {
        category: pattern.category,
        confidence,
        method: 'pattern'
      };
    }
  }
  
  return null;
}

/**
 * Check for keyword-based matches
 */
function getKeywordMatch(itemName: string): RecommendationResult | null {
  const normalizedItem = itemName.toLowerCase().trim();
  const itemWords = normalizedItem.split(/\s+/);
  
  let bestMatch: RecommendationResult | null = null;
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(categoryMappings.keywordMappings)) {
    let matchScore = 0;
    let matchCount = 0;
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact substring match
      if (normalizedItem.includes(keywordLower) || keywordLower.includes(normalizedItem)) {
        matchScore += 1.0;
        matchCount++;
        continue;
      }
      
      // Word-level matching
      for (const word of itemWords) {
        if (word.includes(keywordLower) || keywordLower.includes(word)) {
          matchScore += 0.8;
          matchCount++;
        } else if (levenshteinDistance(word, keywordLower) <= 1 && word.length > 2) {
          matchScore += 0.6;
          matchCount++;
        }
      }
    }
    
    if (matchCount > 0) {
      const confidence = Math.min(0.8, (matchScore / keywords.length) * 0.8);
      if (confidence > bestScore) {
        bestScore = confidence;
        bestMatch = {
          category,
          confidence,
          method: 'keyword'
        };
      }
    }
  }
  
  return bestMatch && bestScore > 0.3 ? bestMatch : null;
}

/**
 * Enhanced recommendation using consolidated configuration
 */
function getEnhancedRecommendation(itemName: string): RecommendationResult {
  if (!itemName || itemName.trim().length === 0) {
    return { category: 'general', confidence: 0, method: 'direct' };
  }
  
  // Try methods in order of priority
  const methods = [
    () => getDirectMatch(itemName),
    () => getContextMatch(itemName),
    () => getPatternMatch(itemName),
    () => getKeywordMatch(itemName)
  ];
  
  for (const method of methods) {
    const result = method();
    if (result && result.confidence > 0.5) {
      return result;
    }
  }
  
  // If no good match found, try similarity matching with category subcategories
  const similarityResult = getSimilarityMatch(itemName);
  if (similarityResult && similarityResult.confidence > 0.3) {
    return similarityResult;
  }
  
  return { category: 'general', confidence: 0.1, method: 'similarity' };
}

/**
 * Similarity-based matching with category names and keywords
 */
function getSimilarityMatch(itemName: string): RecommendationResult | null {
  const normalizedItemName = itemName.toLowerCase().trim();
  const matches: CategoryMatch[] = [];

  // Check similarity with category names
  categories.forEach(categoryConfig => {
    const normalizedCategoryName = categoryConfig.name.toLowerCase();
    
    // Calculate similarity scores
    const diceCoeff = diceCoefficient(normalizedItemName, normalizedCategoryName);
    
    // Check for exact substring matches
    const exactMatch = normalizedCategoryName.includes(normalizedItemName) || 
                      normalizedItemName.includes(normalizedCategoryName);
    
    // Word-level matching
    const itemWords = normalizedItemName.split(/\s+/);
    const categoryWords = normalizedCategoryName.split(/\s+/);
    const wordMatches = itemWords.filter(word => 
      categoryWords.some(catWord => 
        catWord.includes(word) || word.includes(catWord) || 
        levenshteinDistance(word, catWord) <= 1
      )
    ).length;
    
    // Enhanced confidence calculation
    let confidence = 0;
    
    if (exactMatch) {
      confidence += 0.4;
    }
    
    confidence += (wordMatches / Math.max(itemWords.length, categoryWords.length)) * 0.3;
    confidence += diceCoeff * 0.2;
    
    // Bonus for shorter, more specific matches
    if (normalizedCategoryName.length <= normalizedItemName.length + 5) {
      confidence += 0.1;
    }
    
    if (confidence > 0.15) {
      matches.push({
        categoryId: categoryConfig.id,
        categoryName: categoryConfig.name,
        subcategory: 'category name match',
        confidence
      });
    }
  });

  // Also check similarity with keywords from keywordMappings
  Object.entries(categoryMappings.keywordMappings).forEach(([categoryId, keywords]) => {
    const categoryConfig = categories.find(cat => cat.id === categoryId);
    if (!categoryConfig) return;
    
    keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      
      // Calculate similarity scores
      const diceCoeff = diceCoefficient(normalizedItemName, normalizedKeyword);
      
      // Check for exact substring matches
      const exactMatch = normalizedKeyword.includes(normalizedItemName) || 
                        normalizedItemName.includes(normalizedKeyword);
      
      // Word-level matching
      const itemWords = normalizedItemName.split(/\s+/);
      const keywordWords = normalizedKeyword.split(/\s+/);
      const wordMatches = itemWords.filter(word => 
        keywordWords.some(kwWord => 
          kwWord.includes(word) || word.includes(kwWord) || 
          levenshteinDistance(word, kwWord) <= 1
        )
      ).length;
      
      // Enhanced confidence calculation
      let confidence = 0;
      
      if (exactMatch) {
        confidence += 0.3;
      }
      
      confidence += (wordMatches / Math.max(itemWords.length, keywordWords.length)) * 0.25;
      confidence += diceCoeff * 0.15;
      
      if (confidence > 0.2) {
        matches.push({
          categoryId: categoryConfig.id,
          categoryName: categoryConfig.name,
          subcategory: `keyword: ${keyword}`,
          confidence
        });
      }
    });
  });

  matches.sort((a, b) => b.confidence - a.confidence);
  
  if (matches.length > 0 && matches[0].confidence > 0.25) {
    return {
      category: matches[0].categoryId,
      confidence: matches[0].confidence,
      method: 'similarity'
    };
  }
  
  return null;
}

/**
 * Main recommendation function with hybrid approach
 */
export function recommendCategory(itemName: string): string {
  const result = getEnhancedRecommendation(itemName);
  return result.category;
}

/**
 * Get detailed recommendation information for debugging
 */
export function getRecommendationDetails(itemName: string): CategoryMatch[] {
  if (!itemName || itemName.trim().length === 0) {
    return [];
  }

  const result = getEnhancedRecommendation(itemName);
  const categoryConfig = categories.find(cat => cat.id === result.category);
  
  if (!categoryConfig) {
    return [];
  }

  const match: CategoryMatch = {
    categoryId: result.category,
    categoryName: categoryConfig.name,
    subcategory: `${result.method} match`,
    confidence: result.confidence
  };

  return [match];
}

/**
 * Get recommendation with detailed information
 */
export function getDetailedRecommendation(itemName: string): RecommendationResult {
  return getEnhancedRecommendation(itemName);
}