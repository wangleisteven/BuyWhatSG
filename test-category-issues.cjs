// Test script to check category recommendation issues
const fs = require('fs');
const path = require('path');

// Read categories.json
const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/config/categories.json'), 'utf8'));

// Simple test function to simulate the recommendation logic
function testRecommendation(itemName) {
  const normalizedItem = itemName.toLowerCase().trim();
  
  console.log(`\nTesting: "${itemName}" -> normalized: "${normalizedItem}"`);
  
  // Special handling for baby items - check baby-specific patterns first
  if (/\b(baby|infant|newborn|toddler|child)\s+/.test(normalizedItem)) {
    console.log('  - Matches baby prefix pattern');
    // Check if it's a baby-specific item
    if (/\b(baby|infant|newborn|toddler|child)\s+(chair|shoe|shoes|hat|jacket|clothes|shirt|dress|pants|shorts|socks|mittens|gloves|bib|bottle|formula|food|cereal|toy|blanket)\b/.test(normalizedItem)) {
      console.log('  - Matches baby-specific item pattern -> baby');
      return 'baby';
    } else {
      console.log('  - Does NOT match baby-specific item pattern');
    }
  }
  
  // Check direct mapping first
  if (categoriesData.itemCategoryMapping[normalizedItem]) {
    console.log(`  - Found direct mapping: ${categoriesData.itemCategoryMapping[normalizedItem]}`);
    return categoriesData.itemCategoryMapping[normalizedItem];
  }
  
  // Check for partial matches in the mapping
  for (const [key, categoryId] of Object.entries(categoriesData.itemCategoryMapping)) {
    if (normalizedItem.includes(key) || key.includes(normalizedItem)) {
      console.log(`  - Found partial mapping match: "${key}" -> ${categoryId}`);
      return categoryId;
    }
  }
  
  // Check semantic keywords
  for (const [categoryId, keywords] of Object.entries(categoriesData.categoryKeywords)) {
    for (const keyword of keywords) {
      if (normalizedItem.includes(keyword) || keyword.includes(normalizedItem)) {
        console.log(`  - Found keyword match: "${keyword}" in ${categoryId}`);
        return categoryId;
      }
    }
  }
  
  console.log('  - No matches found -> general');
  return 'general';
}

console.log('=== COMPREHENSIVE MEAT CATEGORIZATION TEST ===');
console.log('\nTesting tender loin variations:');
console.log('tender loin:', testRecommendation('tender loin'));
console.log('tenderloin:', testRecommendation('tenderloin'));
console.log('pork tenderloin:', testRecommendation('pork tenderloin'));
console.log('beef tenderloin:', testRecommendation('beef tenderloin'));
console.log('chicken tenderloin:', testRecommendation('chicken tenderloin'));

console.log('\nTesting other meat cuts:');
console.log('sirloin:', testRecommendation('sirloin'));
console.log('ribeye:', testRecommendation('ribeye'));
console.log('t bone:', testRecommendation('t bone'));
console.log('t-bone:', testRecommendation('t-bone'));
console.log('filet mignon:', testRecommendation('filet mignon'));
console.log('strip steak:', testRecommendation('strip steak'));
console.log('chuck roast:', testRecommendation('chuck roast'));
console.log('brisket:', testRecommendation('brisket'));
console.log('short ribs:', testRecommendation('short ribs'));
console.log('pork chop:', testRecommendation('pork chop'));
console.log('ground beef:', testRecommendation('ground beef'));
console.log('minced meat:', testRecommendation('minced meat'));

console.log('\nTesting existing meat items:');
console.log('lobster:', testRecommendation('lobster'));
console.log('chicken:', testRecommendation('chicken'));
console.log('beef:', testRecommendation('beef'));
console.log('pork:', testRecommendation('pork'));