/**
 * Consolidated Category Mapping Configuration
 * Single source of truth for all product categorization logic
 */

export interface CategoryPattern {
  pattern: RegExp;
  category: string;
  priority: number; // Higher number = higher priority
}

export interface CategoryConfig {
  // Direct item-to-category mappings (highest priority)
  directMappings: Record<string, string>;
  
  // Keyword-based mappings for fuzzy matching
  keywordMappings: Record<string, string[]>;
  
  // Pattern-based mappings with priority ordering
  patternMappings: CategoryPattern[];
  
  // Context-sensitive rules (special cases)
  contextRules: {
    pattern: RegExp;
    condition: RegExp;
    category: string;
    priority: number;
  }[];
}

/**
 * Consolidated category mapping configuration
 * Organized by priority: direct mappings > context rules > patterns > keywords
 */
export const categoryMappings: CategoryConfig = {
  // Direct exact mappings (case-insensitive)
  directMappings: {
    // Meat & Seafood
    "chicken": "meat",
    "beef": "meat",
    "pork": "meat",
    "fish": "meat",
    "prawns": "meat",
    "prawn": "meat",
    "white prawn": "meat",
    "white prawns": "meat",
    "crab": "meat",
    "lobster": "meat",
    "sea bass": "meat",
    "seabass": "meat",
    "salmon": "meat",
    "mackerel": "meat",
    "pomfret": "meat",
    "grouper": "meat",
    "threadfin": "meat",
    "red snapper": "meat",
    "duck": "meat",
    "mutton": "meat",
    "lamb": "meat",
    "char siu": "meat",
    "sausage": "meat",
    "bacon": "meat",
    "ham": "meat",
    "fishball": "meat",
    "fish ball": "meat",
    "fishcake": "meat",
    "fish cake": "meat",
    "sotong": "meat",
    "squid": "meat",
    "cockles": "meat",
    "clams": "meat",
    "mussels": "meat",
    "oysters": "meat",
    
    // Dairy & Eggs
    "milk": "dairy",
    "cheese": "dairy",
    "yogurt": "dairy",
    "butter": "dairy",
    "cream": "dairy",
    "egg": "dairy",
    "eggs": "dairy",
    
    // Beverages
    "water": "drinks",
    "juice": "drinks",
    "coffee": "drinks",
    "tea": "drinks",
    "kopi": "drinks",
    "teh": "drinks",
    "milo": "drinks",
    "horlicks": "drinks",
    "ovaltine": "drinks",
    "bandung": "drinks",
    "teh tarik": "drinks",
    "kopi tarik": "drinks",
    "yuan yang": "drinks",
    "michael jackson": "drinks",
    "neslo": "drinks",
    "milo dinosaur": "drinks",
    "milo godzilla": "drinks",
    "teh cino": "drinks",
    "milo cino": "drinks",
    
    // Alcohol
    "beer": "alcohol",
    "wine": "alcohol",
    "whiskey": "alcohol",
    "vodka": "alcohol",
    "gin": "alcohol",
    "rum": "alcohol",
    
    // Rice & Noodles
    "rice": "rice",
    "pasta": "rice",
    "noodles": "rice",
    "instant noodles": "rice",
    "bee hoon": "rice",
    "mee sua": "rice",
    "kway teow": "rice",
    "udon": "rice",
    "soba": "rice",
    "ramen": "rice",
    
    // Bakery
    "bread": "bakery",
    "cake": "bakery",
    "cookie": "bakery",
    "muffin": "bakery",
    "bagel": "bakery",
    "croissant": "bakery",
    "cereal": "bakery",
    "cereals": "bakery",
    "cornflakes": "bakery",
    "oats": "bakery",
    "oatmeal": "bakery",
    
    // Pantry
    "sugar": "pantry",
    "salt": "pantry",
    "oil": "pantry",
    "vinegar": "pantry",
    "flour": "pantry",
    "soy sauce": "pantry",
    "oyster sauce": "pantry",
    "sesame oil": "pantry",
    "fish sauce": "pantry",
    "maggi": "pantry"
  },
  
  // Keyword-based fuzzy matching
  keywordMappings: {
    "produce": [
      "fruit", "vegetable", "fresh", "organic", "apple", "banana", "orange", "tomato",
      "durian", "mango", "papaya", "rambutan", "longan", "lychee", "dragonfruit",
      "kangkung", "kailan", "chye sim", "bok choy", "bean sprouts", "taugeh",
      "chili", "chilli", "ginger", "garlic", "shallot", "lemongrass", "pandan"
    ],
    "meat": [
      "meat", "protein", "seafood", "tenderloin", "sirloin", "ribeye", "steak",
      "ground beef", "ground pork", "minced meat", "fillet", "cutlet", "chop", "ribs"
    ],
    "dairy": [
      "dairy", "condensed milk", "evaporated milk", "fresh milk", "low fat", "full cream"
    ],
    "drinks": [
      "drink", "beverage", "soda", "coconut water", "sugarcane juice", "barley water",
      "green tea", "oolong tea", "jasmine tea", "lemon tea", "chinese tea", "iced", "hot", "cold"
    ],
    "alcohol": [
      "alcohol", "alcoholic", "spirit", "liquor", "brandy", "champagne", "sake", "soju", "cocktail"
    ],
    "beauty": [
      "beauty", "care", "shampoo", "soap", "lotion", "cosmetic", "skin", "hair",
      "moisturizer", "cleanser", "toner", "serum", "makeup", "lipstick", "foundation",
      "perfume", "deodorant", "sunscreen", "nail polish"
    ],
    "health": [
      "health", "medicine", "medication", "pill", "tablet", "capsule", "vitamin",
      "supplement", "painkiller", "aspirin", "panadol", "antibiotic", "medical",
      "pharmaceutical", "therapeutic", "prescription", "first aid", "bandage"
    ],
    "household": [
      "clean", "household", "detergent", "paper", "tissue", "kitchen", "bathroom",
      "laundry", "bleach", "disinfectant", "sanitizer", "furniture", "chair", "table"
    ],
    "lifestyle": [
      "fashion", "clothing", "apparel", "wear", "style", "accessory", "hat", "jacket",
      "shirt", "dress", "pants", "shoes", "bag", "watch", "jewelry", "umbrella"
    ],
    "baby": [
      "baby", "infant", "child", "kid", "toddler", "nursery", "newborn", "formula",
      "diaper", "bottle", "pacifier", "toy", "stroller", "crib", "bib"
    ],
    "bakery": [
      "baked", "pastry", "toast", "bun", "loaf", "roll", "dough", "wheat", "grain",
      "muesli", "granola", "breakfast"
    ],
    "pantry": [
      "dry", "canned", "packaged", "preserved", "spice", "sauce", "instant",
      "curry powder", "turmeric", "coconut milk", "tamarind", "cornstarch", "baking"
    ]
  },
  
  // Context-sensitive rules (highest priority patterns)
  contextRules: [
    {
      pattern: /\b(baby|infant|newborn|toddler|child)\s+/,
      condition: /\b(baby|infant|newborn|toddler|child)\s+(shoe|hat|jacket|clothes|shirt|dress|pants|shorts|socks|mittens|gloves|bib|bottle|formula|food|cereal|toy|blanket|chair)\b/,
      category: "baby",
      priority: 100
    },
    {
      pattern: /\b(adult|men|women|man|woman|mens|womens)\s+/,
      condition: /\b(adult|men|women|man|woman|mens|womens)\s+(shoe|shoes|clothing|clothes|apparel)\b/,
      category: "lifestyle",
      priority: 90
    }
  ],
  
  // Pattern-based mappings (ordered by priority)
  patternMappings: [
    // Health items (high priority to avoid conflicts)
    { pattern: /\b(pill|pills|medicine|medication|tablet|tablets|capsule|capsules|drug|drugs)\b/, category: "health", priority: 80 },
    { pattern: /\b(vitamin|vitamins|supplement|supplements|painkiller|pain\s*relief|aspirin|panadol|ibuprofen|paracetamol)\b/, category: "health", priority: 80 },
    { pattern: /\b(antibiotic|antibiotics|antacid|antacids|laxative|laxatives|cough\s*syrup|cold\s*medicine|flu\s*medicine)\b/, category: "health", priority: 80 },
    { pattern: /\b(thermometer|bandage|bandages|plaster|plasters|antiseptic|ointment|nasal\s*spray|inhaler)\b/, category: "health", priority: 80 },
    { pattern: /\b(medical|pharmaceutical|therapeutic|prescription|otc|over\s*the\s*counter|first\s*aid)\b/, category: "health", priority: 80 },
    
    // Baby items
    { pattern: /\b(baby|infant|child|kid|toddler|newborn|formula|diaper|nappy|wipes|powder|bottle|pacifier|dummy|teether)\b/, category: "baby", priority: 70 },
    { pattern: /\b(toy|rattle|stroller|pram|car\s*seat|high\s*chair|baby\s*chair|gate|monitor|crib|cot|mattress|blanket|swaddle|bib|carrier|sling)\b/, category: "baby", priority: 70 },
    
    // Singapore-specific items
    { pattern: /\b(kopi|teh|milo|horlicks|ovaltine|bandung|yuan\s*yang|michael\s*jackson|neslo|clementi)\b/, category: "drinks", priority: 60 },
    { pattern: /\b(teh\s*tarik|kopi\s*tarik|milo\s*dinosaur|milo\s*godzilla|teh\s*cino|milo\s*cino)\b/, category: "drinks", priority: 60 },
    { pattern: /\b(durian|rambutan|longan|lychee|dragonfruit|starfruit|guava|jackfruit|calamansi)\b/, category: "produce", priority: 60 },
    { pattern: /\b(kangkung|kailan|chye\s*sim|bok\s*choy|taugeh|lady\s*finger|bitter\s*gourd|winter\s*melon|daikon)\b/, category: "produce", priority: 60 },
    { pattern: /\b(char\s*siu|fishball|fish\s*ball|fishcake|fish\s*cake|sotong|cockles|pomfret|threadfin|grouper)\b/, category: "meat", priority: 60 },
    { pattern: /\b(bee\s*hoon|mee\s*sua|kway\s*teow|maggi|sambal|belacan|gula\s*melaka|santan|assam)\b/, category: "pantry", priority: 60 },
    
    // General categories
    { pattern: /\b(meat|protein|chicken|beef|pork|duck|mutton|lamb|fish|seafood|prawns|prawn|shrimp|crab|lobster|bass|sea\s*bass)\b/, category: "meat", priority: 50 },
    { pattern: /\b(sausage|bacon|ham|squid|clams|mussels|oysters|salmon|mackerel|white\s*prawn)\b/, category: "meat", priority: 50 },
    { pattern: /\b(milk|dairy|cheese|yogurt|cream|butter|condensed\s*milk|evaporated\s*milk)\b/, category: "dairy", priority: 50 },
    { pattern: /\b(egg|eggs)\b/, category: "dairy", priority: 50 },
    { pattern: /\b(drink|beverage|juice|water|soda|coffee|tea|coconut\s*water|sugarcane\s*juice|barley\s*water)\b/, category: "drinks", priority: 50 },
    { pattern: /\b(beer|wine|alcohol|spirit|liquor|whiskey|vodka|gin|rum|brandy|champagne|sake|soju|cocktail)\b/, category: "alcohol", priority: 50 },
    { pattern: /\b(bread|baked|pastry|cake|cookie|muffin|toast|bun|croissant|bagel|loaf|roll|dough)\b/, category: "bakery", priority: 50 },
    { pattern: /\b(cereal|cereals|cornflakes|oats|oatmeal|muesli|granola|breakfast)\b/, category: "bakery", priority: 50 },
    { pattern: /\b(fruit|berry|citrus|tropical|fresh)\b/, category: "produce", priority: 40 },
    { pattern: /\b(vegetable|veggie|green|leafy|root|chili|chilli|ginger|garlic|shallot|lemongrass|pandan)\b/, category: "produce", priority: 40 },
    { pattern: /\b(shampoo|conditioner|soap|lotion|cream|beauty|care|cosmetic|moisturizer|cleanser|toner|serum)\b/, category: "beauty", priority: 40 },
    { pattern: /\b(makeup|lipstick|foundation|concealer|mascara|eyeliner|eyeshadow|blush|nail\s*polish|perfume|cologne)\b/, category: "beauty", priority: 40 },
    { pattern: /\b(clean|household|detergent|bleach|disinfectant|sanitizer|cleaner|dishwashing|fabric\s*softener)\b/, category: "household", priority: 40 },
    { pattern: /\b(paper|tissue|towel|napkin|toilet\s*paper|paper\s*towel|air\s*freshener|insecticide|mosquito)\b/, category: "household", priority: 40 },
    { pattern: /\b(hat|cap|jacket|coat|shirt|blouse|dress|skirt|pants|jeans|shorts|shoes|sneakers|sandals|slippers|boots|heels)\b/, category: "lifestyle", priority: 40 },
    { pattern: /\b(bag|handbag|backpack|wallet|purse|umbrella|clothing|fashion|wear|apparel|style)\b/, category: "lifestyle", priority: 40 },
    { pattern: /\b(flour|rice|noodles|pasta|vermicelli|spaghetti|macaroni)\b/, category: "rice", priority: 40 },
    { pattern: /\b(dry|canned|packaged|sauce|spice|grain|instant)\b/, category: "pantry", priority: 30 },
    { pattern: /\b(sugar|salt|oil|vinegar|soy\s*sauce|oyster\s*sauce|sesame\s*oil|fish\s*sauce|hoisin\s*sauce|chili\s*sauce)\b/, category: "pantry", priority: 30 }
  ]
};

/**
 * Get category mappings for a specific category
 */
export function getCategoryMappings(category: string): string[] {
  const mappings: string[] = [];
  
  // Add direct mappings
  Object.entries(categoryMappings.directMappings).forEach(([key, value]) => {
    if (value === category) {
      mappings.push(key);
    }
  });
  
  // Add keyword mappings
  if (categoryMappings.keywordMappings[category]) {
    mappings.push(...categoryMappings.keywordMappings[category]);
  }
  
  return [...new Set(mappings)]; // Remove duplicates
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  const categories = new Set<string>();
  
  // From direct mappings
  Object.values(categoryMappings.directMappings).forEach(cat => categories.add(cat));
  
  // From keyword mappings
  Object.keys(categoryMappings.keywordMappings).forEach(cat => categories.add(cat));
  
  // From pattern mappings
  categoryMappings.patternMappings.forEach(mapping => categories.add(mapping.category));
  
  // From context rules
  categoryMappings.contextRules.forEach(rule => categories.add(rule.category));
  
  return Array.from(categories).sort();
}