// Test script to verify recommendation system improvements
const { recommendCategory } = require('./src/utils/categoryRecommendation.ts');

// Test cases that were problematic
const testItems = [
  'cereal',
  'cornflakes', 
  'oats',
  'flour',
  'rice',
  'pasta',
  'noodles',
  'banana', // Should work from previous fixes
  'apple',  // Should work from previous fixes
  'unknown item that should default to general'
];

console.log('Testing recommendation system:');
console.log('=====================================');

testItems.forEach(item => {
  const category = recommendCategory(item);
  console.log(`"${item}" -> "${category}"`);
});

console.log('\nExpected results:');
console.log('- cereal, cornflakes, oats -> bakery');
console.log('- flour, rice, pasta, noodles -> rice');
console.log('- banana, apple -> produce');
console.log('- unknown items -> general');