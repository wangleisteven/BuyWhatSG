import categoriesData from '../config/categories.json';
import { categories } from '../config/categories';

interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  subcategory: string;
  confidence: number;
}

// Import configuration data from categories.json
const ITEM_CATEGORY_MAPPING: Record<string, string> = categoriesData.itemCategoryMapping;
const CATEGORY_KEYWORDS: Record<string, string[]> = categoriesData.categoryKeywords;

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
 * Check if item matches semantic keywords for a category
 */
function getSemanticMatch(itemName: string): string | null {
  const normalizedItem = itemName.toLowerCase().trim();
  
  // Special handling for baby items - check baby-specific patterns first
  if (/\b(baby|infant|newborn|toddler|child)\s+/.test(normalizedItem)) {
    // Check if it's a baby-specific item
    if (/\b(baby|infant|newborn|toddler|child)\s+(chair|shoe|shoes|hat|jacket|clothes|shirt|dress|pants|shorts|socks|mittens|gloves|bib|bottle|formula|food|cereal|toy|blanket)\b/.test(normalizedItem)) {
      return 'baby';
    }
  }
  
  // Special handling for health items - check health-specific patterns before general mappings
  if (/\b(pill|pills|medicine|medication|tablet|tablets|capsule|capsules|drug|drugs|vitamin|vitamins|supplement|supplements|painkiller|pain\s*relief|aspirin|panadol|ibuprofen|paracetamol|acetaminophen|antibiotic|antibiotics|antacid|antacids|laxative|laxatives|cough\s*syrup|cold\s*medicine|flu\s*medicine|thermometer|bandage|bandages|plaster|plasters|antiseptic|ointment|nasal\s*spray|inhaler|multivitamin|fish\s*oil|omega\s*3|calcium|iron\s*supplement|zinc|magnesium|probiotics|protein\s*powder|sleeping\s*pill|sleep\s*aid|melatonin|allergy\s*medicine|antihistamine|decongestant|expectorant|medical|pharmaceutical|therapeutic|prescription|otc|over\s*the\s*counter|first\s*aid)\b/.test(normalizedItem)) {
    return 'health';
  }
  
  // First check direct mapping
  if (ITEM_CATEGORY_MAPPING[normalizedItem]) {
    return ITEM_CATEGORY_MAPPING[normalizedItem];
  }
  
  // Check for partial matches in the mapping, but be careful with health items
  for (const [key, categoryId] of Object.entries(ITEM_CATEGORY_MAPPING)) {
    // Skip partial matches that might conflict with health items
    if (categoryId === 'household' && (normalizedItem.includes('tablet') || normalizedItem.includes('capsule'))) {
      continue;
    }
    if (categoryId === 'lifestyle' && normalizedItem.includes('capsule')) {
      continue;
    }
    if (categoryId === 'drinks' && normalizedItem.includes('medicine')) {
      continue;
    }
    
    if (normalizedItem.includes(key) || key.includes(normalizedItem)) {
      return categoryId;
    }
  }
  
  // Check semantic keywords
  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedItem.includes(keyword) || keyword.includes(normalizedItem)) {
        return categoryId;
      }
    }
  }
  
  return null;
}

/**
 * Enhanced recommendation using semantic knowledge + string similarity
 */
function getEnhancedRecommendation(itemName: string): string {
  const normalizedItemName = itemName.toLowerCase().trim();
  
  // First try semantic matching
  const semanticMatch = getSemanticMatch(normalizedItemName);
  if (semanticMatch) {
    return semanticMatch;
  }
  
  // Fall back to string similarity with improved scoring
  const matches: CategoryMatch[] = [];

  Object.entries(categoriesData.categories).forEach(([categoryName, subcategories]) => {
    const categoryConfig = categories.find(cat => cat.name === categoryName);
    if (!categoryConfig) return;

    subcategories.forEach((subcategory: string) => {
      const normalizedSubcategory = subcategory.toLowerCase();
      
      // Calculate similarity scores
      const levenshteinDist = levenshteinDistance(normalizedItemName, normalizedSubcategory);
      const diceCoeff = diceCoefficient(normalizedItemName, normalizedSubcategory);
      
      // Check for exact substring matches
      const exactMatch = normalizedSubcategory.includes(normalizedItemName) || normalizedItemName.includes(normalizedSubcategory);
      
      // Word-level matching
      const itemWords = normalizedItemName.split(/\s+/);
      const subcategoryWords = normalizedSubcategory.split(/\s+/);
      const wordMatches = itemWords.filter(word => 
        subcategoryWords.some(subWord => 
          subWord.includes(word) || word.includes(subWord) || 
          levenshteinDistance(word, subWord) <= 1
        )
      ).length;
      
      // Enhanced confidence calculation
      let confidence = 0;
      
      if (exactMatch) {
        confidence += 0.5;
      }
      
      confidence += (wordMatches / Math.max(itemWords.length, subcategoryWords.length)) * 0.3;
      confidence += diceCoeff * 0.2;
      
      // Bonus for shorter, more specific matches
      if (normalizedSubcategory.length <= normalizedItemName.length + 3) {
        confidence += 0.1;
      }
      
      if (confidence > 0.15) {
        matches.push({
          categoryId: categoryConfig.id,
          categoryName,
          subcategory,
          confidence
        });
      }
    });
  });

  matches.sort((a, b) => b.confidence - a.confidence);
  
  if (matches.length > 0 && matches[0].confidence > 0.25) {
    return matches[0].categoryId;
  }
  
  return 'general';
}

/**
 * Simple LLM-style categorization using pattern matching
 * This is a lightweight alternative to calling an external LLM
 */
function getLLMStyleRecommendation(itemName: string): string {
  const lowerItem = itemName.toLowerCase();
  
  // Context-sensitive categorization - check for baby items first
  if (/\b(baby|infant|newborn|toddler|child)\s+/.test(lowerItem)) {
    // Baby-specific items override general categories
    if (/\b(baby|infant|newborn|toddler|child)\s+(shoe|hat|jacket|clothes|shirt|dress|pants|shorts|socks|mittens|gloves|bib|bottle|formula|food|cereal|toy|blanket|chair)\b/.test(lowerItem)) {
      return 'baby';
    }
  }
  
  // Handle adult-specific items that should go to lifestyle
  if (/\b(adult|men|women|man|woman|mens|womens)\s+(shoe|shoes|clothing|clothes|apparel)\b/.test(lowerItem)) {
    return 'lifestyle';
  }
  
  // Pattern-based categorization using semantic understanding
  const patterns = [
    // Baby items (check first to override general categories)
    { pattern: /\b(baby|infant|child|kid|toddler|newborn|formula|diaper|nappy|wipes|powder|bottle|pacifier|dummy|teether)\b/, category: 'baby' },
    { pattern: /\b(toy|rattle|stroller|pram|car\s*seat|high\s*chair|baby\s*chair|gate|monitor|crib|cot|mattress|blanket|swaddle|bib|carrier|sling)\b/, category: 'baby' },
    
    // Health & Wellness items (high priority)
    { pattern: /\b(pill|pills|medicine|medication|tablet|tablets|capsule|capsules|drug|drugs)\b/, category: 'health' },
    { pattern: /\b(vitamin|vitamins|supplement|supplements|painkiller|pain\s*relief|aspirin|panadol|ibuprofen|paracetamol|acetaminophen)\b/, category: 'health' },
    { pattern: /\b(antibiotic|antibiotics|antacid|antacids|laxative|laxatives|cough\s*syrup|cold\s*medicine|flu\s*medicine)\b/, category: 'health' },
    { pattern: /\b(thermometer|bandage|bandages|plaster|plasters|antiseptic|ointment|nasal\s*spray|inhaler)\b/, category: 'health' },
    { pattern: /\b(multivitamin|fish\s*oil|omega\s*3|calcium|iron\s*supplement|zinc|magnesium|probiotics|protein\s*powder)\b/, category: 'health' },
    { pattern: /\b(sleeping\s*pill|sleep\s*aid|melatonin|allergy\s*medicine|antihistamine|decongestant|expectorant)\b/, category: 'health' },
    { pattern: /\b(medical|pharmaceutical|therapeutic|prescription|otc|over\s*the\s*counter|first\s*aid)\b/, category: 'health' },
    
    // Singapore-specific beverages
    { pattern: /\b(kopi|teh|milo|horlicks|ovaltine|bandung|yuan\s*yang|michael\s*jackson|neslo|clementi)\b/, category: 'drinks' },
    { pattern: /\b(teh\s*tarik|kopi\s*tarik|milo\s*dinosaur|milo\s*godzilla|teh\s*cino|milo\s*cino)\b/, category: 'drinks' },
    
    // Singapore-specific food items
    { pattern: /\b(durian|rambutan|longan|lychee|dragonfruit|starfruit|guava|jackfruit|calamansi)\b/, category: 'produce' },
    { pattern: /\b(kangkung|kailan|chye\s*sim|bok\s*choy|taugeh|lady\s*finger|bitter\s*gourd|winter\s*melon|daikon)\b/, category: 'produce' },
    { pattern: /\b(char\s*siu|fishball|fish\s*ball|fishcake|fish\s*cake|sotong|cockles|pomfret|threadfin|grouper)\b/, category: 'meat' },
    { pattern: /\b(bee\s*hoon|mee\s*sua|kway\s*teow|maggi|sambal|belacan|gula\s*melaka|santan|assam)\b/, category: 'pantry' },
    
    // Lifestyle items (clothing, accessories, etc.)
    { pattern: /\b(hat|cap|jacket|coat|shirt|blouse|dress|skirt|pants|jeans|shorts|shoes|sneakers|sandals|slippers|boots|heels)\b/, category: 'lifestyle' },
    { pattern: /\b(underwear|bra|socks|stockings|belt|tie|scarf|gloves|sunglasses|watch|jewelry|necklace|earrings|bracelet|ring)\b/, category: 'lifestyle' },
    { pattern: /\b(bag|handbag|backpack|wallet|purse|umbrella)\b/, category: 'lifestyle' },
    { pattern: /\b(clothing|fashion|wear|apparel|style|outfit|garment|trendy|casual|formal|sporty|elegant)\b/, category: 'lifestyle' },
    
    // Fruits and vegetables
    { pattern: /\b(fruit|berry|citrus|tropical|fresh)\b/, category: 'produce' },
    { pattern: /\b(vegetable|veggie|green|leafy|root|chili|chilli|ginger|garlic|shallot|lemongrass|pandan)\b/, category: 'produce' },
    
    // Dairy and eggs
    { pattern: /\b(milk|dairy|cheese|yogurt|cream|butter|condensed\s*milk|evaporated\s*milk)\b/, category: 'dairy' },
    { pattern: /\b(egg|eggs)\b/, category: 'dairy' },
    
    // Meat and seafood
    { pattern: /\b(meat|protein|chicken|beef|pork|duck|mutton|lamb|fish|seafood|prawns|shrimp|crab|lobster)\b/, category: 'meat' },
    { pattern: /\b(sausage|bacon|ham|squid|clams|mussels|oysters|salmon|mackerel)\b/, category: 'meat' },
    
    // Beverages (general)
    { pattern: /\b(drink|beverage|juice|water|soda|coffee|tea|coconut\s*water|sugarcane\s*juice|barley\s*water)\b/, category: 'drinks' },
    { pattern: /\b(green\s*tea|oolong\s*tea|jasmine\s*tea|lemon\s*tea|ice\s*lemon\s*tea|chinese\s*tea|chrysanthemum\s*tea)\b/, category: 'drinks' },
    { pattern: /\b(beer|wine|alcohol|spirit|liquor|whiskey|vodka|gin|rum|brandy|champagne|sake|soju|cocktail)\b/, category: 'alcohol' },
    
    // Personal care and beauty
    { pattern: /\b(shampoo|conditioner|soap|lotion|cream|beauty|care|cosmetic|moisturizer|cleanser|toner|serum)\b/, category: 'beauty' },
    { pattern: /\b(makeup|lipstick|foundation|concealer|mascara|eyeliner|eyeshadow|blush|nail\s*polish|perfume|cologne)\b/, category: 'beauty' },
    { pattern: /\b(deodorant|antiperspirant|sunscreen|face\s*wash|body\s*wash|hair\s*mask|face\s*mask)\b/, category: 'beauty' },
    
    // Household items
    { pattern: /\b(clean|household|detergent|bleach|disinfectant|sanitizer|cleaner|dishwashing|fabric\s*softener)\b/, category: 'household' },
    { pattern: /\b(paper|tissue|towel|napkin|toilet\s*paper|paper\s*towel|air\s*freshener|insecticide|mosquito)\b/, category: 'household' },
    { pattern: /\b(trash|garbage|foil|wrap|candle|battery|bulb|gloves|sponge|brush|mop|broom|vacuum)\b/, category: 'household' },
    { pattern: /\b(chair|table|desk|shelf|cabinet|drawer|furniture|sofa|couch|bed|mattress|pillow|cushion|lamp|mirror)\b/, category: 'household' },
    
    // Pantry and dry goods
    { pattern: /\b(dry|canned|packaged|sauce|spice|grain|instant)\b/, category: 'pantry' },
    { pattern: /\b(flour|rice|noodles|pasta|vermicelli|spaghetti|macaroni)\b/, category: 'rice' },
    { pattern: /\b(sugar|salt|oil|vinegar|soy\s*sauce|oyster\s*sauce|sesame\s*oil|fish\s*sauce|hoisin\s*sauce|chili\s*sauce)\b/, category: 'pantry' },
    { pattern: /\b(curry\s*powder|turmeric|coriander|cumin|coconut\s*milk|tamarind|palm\s*sugar|cornstarch|baking)\b/, category: 'pantry' },
    
    // Bakery items
    { pattern: /\b(bread|baked|pastry|cake|cookie|muffin|toast|bun|croissant|bagel|loaf|roll|dough)\b/, category: 'bakery' },
    { pattern: /\b(cereal|cereals|cornflakes|oats|oatmeal|muesli|granola|breakfast)\b/, category: 'bakery' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(lowerItem)) {
      return category;
    }
  }
  
  return 'general';
}

/**
 * Main recommendation function with hybrid approach
 */
export function recommendCategory(itemName: string): string {
  if (!itemName || itemName.trim().length === 0) {
    return 'general';
  }

  // Try enhanced recommendation first
  const enhancedResult = getEnhancedRecommendation(itemName);
  if (enhancedResult !== 'general') {
    return enhancedResult;
  }
  
  // Fall back to LLM-style pattern matching
  const llmResult = getLLMStyleRecommendation(itemName);
  return llmResult;
}

/**
 * Get detailed recommendation information for debugging
 */
export function getRecommendationDetails(itemName: string): CategoryMatch[] {
  if (!itemName || itemName.trim().length === 0) {
    return [];
  }

  const normalizedItemName = itemName.toLowerCase().trim();
  const matches: CategoryMatch[] = [];

  // Add semantic match if found
  const semanticMatch = getSemanticMatch(normalizedItemName);
  if (semanticMatch) {
    const categoryConfig = categories.find(cat => cat.id === semanticMatch);
    if (categoryConfig) {
      matches.push({
        categoryId: semanticMatch,
        categoryName: categoryConfig.name,
        subcategory: 'Semantic Match',
        confidence: 0.9
      });
    }
  }

  // Add string similarity matches
  Object.entries(categoriesData.categories).forEach(([categoryName, subcategories]) => {
    const categoryConfig = categories.find(cat => cat.name === categoryName);
    if (!categoryConfig) return;

    subcategories.forEach((subcategory: string) => {
      const normalizedSubcategory = subcategory.toLowerCase();
      
      const levenshteinDist = levenshteinDistance(normalizedItemName, normalizedSubcategory);
      const diceCoeff = diceCoefficient(normalizedItemName, normalizedSubcategory);
      
      const exactMatch = normalizedSubcategory.includes(normalizedItemName) || normalizedItemName.includes(normalizedSubcategory);
      
      const itemWords = normalizedItemName.split(/\s+/);
      const subcategoryWords = normalizedSubcategory.split(/\s+/);
      const wordMatches = itemWords.filter(word => 
        subcategoryWords.some(subWord => 
          subWord.includes(word) || word.includes(subWord) || 
          levenshteinDistance(word, subWord) <= 1
        )
      ).length;
      
      let confidence = 0;
      
      if (exactMatch) {
        confidence += 0.5;
      }
      
      confidence += (wordMatches / Math.max(itemWords.length, subcategoryWords.length)) * 0.3;
      confidence += diceCoeff * 0.2;
      
      if (normalizedSubcategory.length <= normalizedItemName.length + 3) {
        confidence += 0.1;
      }
      
      if (confidence > 0.1) {
        matches.push({
          categoryId: categoryConfig.id,
          categoryName,
          subcategory,
          confidence
        });
      }
    });
  });

  return matches.sort((a, b) => b.confidence - a.confidence);
}