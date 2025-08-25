/**
 * Training data for Bakery & Fast Food category
 * Singapore-focused bakery items and fast food products
 */

export interface TrainingDataItem {
  text: string;
  label: string;
}

export const bakeryFastFoodTrainingData: TrainingDataItem[] = [
  // Bread
  { text: 'bread', label: 'bakery' },
  { text: 'white bread', label: 'bakery' },
  { text: 'wholemeal bread', label: 'bakery' },
  { text: 'whole wheat bread', label: 'bakery' },
  { text: 'multigrain bread', label: 'bakery' },
  { text: 'sourdough bread', label: 'bakery' },
  { text: 'rye bread', label: 'bakery' },
  { text: 'french bread', label: 'bakery' },
  { text: 'baguette', label: 'bakery' },
  { text: 'ciabatta', label: 'bakery' },
  { text: 'focaccia', label: 'bakery' },
  { text: 'pita bread', label: 'bakery' },
  { text: 'naan bread', label: 'bakery' },
  { text: 'garlic bread', label: 'bakery' },
  { text: 'toast', label: 'bakery' },
  { text: 'sliced bread', label: 'bakery' },
  { text: 'sandwich bread', label: 'bakery' },
  
  // Asian Bread
  { text: 'kaya toast', label: 'bakery' },
  { text: 'pandan bread', label: 'bakery' },
  { text: 'coconut bread', label: 'bakery' },
  { text: 'red bean bread', label: 'bakery' },
  { text: 'curry bread', label: 'bakery' },
  { text: 'char siu bao', label: 'bakery' },
  { text: 'steamed bun', label: 'bakery' },
  { text: 'mantou', label: 'bakery' },
  { text: 'japanese melon pan', label: 'bakery' },
  { text: 'korean cream bread', label: 'bakery' },
  
  // Buns & Rolls
  { text: 'bun', label: 'bakery' },
  { text: 'hamburger bun', label: 'bakery' },
  { text: 'hot dog bun', label: 'bakery' },
  { text: 'dinner roll', label: 'bakery' },
  { text: 'kaiser roll', label: 'bakery' },
  { text: 'brioche bun', label: 'bakery' },
  { text: 'sesame bun', label: 'bakery' },
  { text: 'pretzel roll', label: 'bakery' },
  { text: 'cinnamon roll', label: 'bakery' },
  { text: 'sweet bun', label: 'bakery' },
  { text: 'cream bun', label: 'bakery' },
  { text: 'custard bun', label: 'bakery' },
  
  // Cakes
  { text: 'cake', label: 'bakery' },
  { text: 'birthday cake', label: 'bakery' },
  { text: 'chocolate cake', label: 'bakery' },
  { text: 'vanilla cake', label: 'bakery' },
  { text: 'strawberry cake', label: 'bakery' },
  { text: 'cheesecake', label: 'bakery' },
  { text: 'carrot cake', label: 'bakery' },
  { text: 'red velvet cake', label: 'bakery' },
  { text: 'black forest cake', label: 'bakery' },
  { text: 'tiramisu cake', label: 'bakery' },
  { text: 'sponge cake', label: 'bakery' },
  { text: 'pound cake', label: 'bakery' },
  { text: 'fruit cake', label: 'bakery' },
  { text: 'layer cake', label: 'bakery' },
  { text: 'cupcake', label: 'bakery' },
  
  // Pastries
  { text: 'pastry', label: 'bakery' },
  { text: 'croissant', label: 'bakery' },
  { text: 'pain au chocolat', label: 'bakery' },
  { text: 'danish pastry', label: 'bakery' },
  { text: 'puff pastry', label: 'bakery' },
  { text: 'eclair', label: 'bakery' },
  { text: 'profiterole', label: 'bakery' },
  { text: 'cream puff', label: 'bakery' },
  { text: 'choux pastry', label: 'bakery' },
  { text: 'napoleon', label: 'bakery' },
  { text: 'mille-feuille', label: 'bakery' },
  { text: 'palmier', label: 'bakery' },
  { text: 'turnover', label: 'bakery' },
  { text: 'apple turnover', label: 'bakery' },
  
  // Muffins & Quick Breads
  { text: 'muffin', label: 'bakery' },
  { text: 'blueberry muffin', label: 'bakery' },
  { text: 'chocolate chip muffin', label: 'bakery' },
  { text: 'banana muffin', label: 'bakery' },
  { text: 'bran muffin', label: 'bakery' },
  { text: 'english muffin', label: 'bakery' },
  { text: 'scone', label: 'bakery' },
  { text: 'bagel', label: 'bakery' },
  { text: 'everything bagel', label: 'bakery' },
  { text: 'sesame bagel', label: 'bakery' },
  { text: 'poppy seed bagel', label: 'bakery' },
  
  // Donuts
  { text: 'donut', label: 'bakery' },
  { text: 'doughnut', label: 'bakery' },
  { text: 'glazed donut', label: 'bakery' },
  { text: 'chocolate donut', label: 'bakery' },
  { text: 'jelly donut', label: 'bakery' },
  { text: 'cream donut', label: 'bakery' },
  { text: 'old fashioned donut', label: 'bakery' },
  { text: 'cake donut', label: 'bakery' },
  { text: 'yeast donut', label: 'bakery' },
  { text: 'boston cream donut', label: 'bakery' },
  
  // Pies & Tarts
  { text: 'pie', label: 'bakery' },
  { text: 'apple pie', label: 'bakery' },
  { text: 'pumpkin pie', label: 'bakery' },
  { text: 'pecan pie', label: 'bakery' },
  { text: 'cherry pie', label: 'bakery' },
  { text: 'meat pie', label: 'bakery' },
  { text: 'chicken pie', label: 'bakery' },
  { text: 'shepherd pie', label: 'bakery' },
  { text: 'quiche', label: 'bakery' },
  { text: 'tart', label: 'bakery' },
  { text: 'fruit tart', label: 'bakery' },
  { text: 'egg tart', label: 'bakery' },
  { text: 'custard tart', label: 'bakery' },
  { text: 'lemon tart', label: 'bakery' },
  
  // Cookies & Biscuits
  { text: 'cookie', label: 'bakery' },
  { text: 'chocolate chip cookie', label: 'bakery' },
  { text: 'oatmeal cookie', label: 'bakery' },
  { text: 'sugar cookie', label: 'bakery' },
  { text: 'gingerbread cookie', label: 'bakery' },
  { text: 'shortbread cookie', label: 'bakery' },
  { text: 'biscuit', label: 'bakery' },
  { text: 'digestive biscuit', label: 'bakery' },
  { text: 'marie biscuit', label: 'bakery' },
  { text: 'cream cracker', label: 'bakery' },
  { text: 'water biscuit', label: 'bakery' },
  
  // Fast Food - Burgers
  { text: 'burger', label: 'bakery' },
  { text: 'hamburger', label: 'bakery' },
  { text: 'cheeseburger', label: 'bakery' },
  { text: 'chicken burger', label: 'bakery' },
  { text: 'fish burger', label: 'bakery' },
  { text: 'veggie burger', label: 'bakery' },
  { text: 'beef burger', label: 'bakery' },
  { text: 'double burger', label: 'bakery' },
  { text: 'whopper', label: 'bakery' },
  { text: 'big mac', label: 'bakery' },
  
  // Fast Food - Sandwiches
  { text: 'sandwich', label: 'bakery' },
  { text: 'club sandwich', label: 'bakery' },
  { text: 'blt sandwich', label: 'bakery' },
  { text: 'grilled cheese', label: 'bakery' },
  { text: 'tuna sandwich', label: 'bakery' },
  { text: 'chicken sandwich', label: 'bakery' },
  { text: 'ham sandwich', label: 'bakery' },
  { text: 'egg sandwich', label: 'bakery' },
  { text: 'submarine sandwich', label: 'bakery' },
  { text: 'sub', label: 'bakery' },
  { text: 'hoagie', label: 'bakery' },
  { text: 'panini', label: 'bakery' },
  
  // Fast Food - Wraps
  { text: 'wrap', label: 'bakery' },
  { text: 'chicken wrap', label: 'bakery' },
  { text: 'caesar wrap', label: 'bakery' },
  { text: 'veggie wrap', label: 'bakery' },
  { text: 'tuna wrap', label: 'bakery' },
  { text: 'burrito', label: 'bakery' },
  { text: 'quesadilla', label: 'bakery' },
  { text: 'tortilla', label: 'bakery' },
  { text: 'flatbread', label: 'bakery' },
  
  // Fast Food - Pizza
  { text: 'pizza', label: 'bakery' },
  { text: 'margherita pizza', label: 'bakery' },
  { text: 'pepperoni pizza', label: 'bakery' },
  { text: 'hawaiian pizza', label: 'bakery' },
  { text: 'meat lovers pizza', label: 'bakery' },
  { text: 'veggie pizza', label: 'bakery' },
  { text: 'cheese pizza', label: 'bakery' },
  { text: 'thin crust pizza', label: 'bakery' },
  { text: 'thick crust pizza', label: 'bakery' },
  { text: 'personal pizza', label: 'bakery' },
  
  // Asian Fast Food
  { text: 'fried chicken', label: 'bakery' },
  { text: 'chicken nuggets', label: 'bakery' },
  { text: 'chicken tenders', label: 'bakery' },
  { text: 'popcorn chicken', label: 'bakery' },
  { text: 'fish and chips', label: 'bakery' },
  { text: 'onion rings', label: 'bakery' },
  { text: 'french fries', label: 'bakery' },
  { text: 'hash browns', label: 'bakery' },
  { text: 'chicken rice', label: 'bakery' },
  { text: 'nasi lemak', label: 'bakery' },
  { text: 'laksa', label: 'bakery' },
  { text: 'mee goreng', label: 'bakery' },
  
  // Breakfast Items
  { text: 'pancake', label: 'bakery' },
  { text: 'waffle', label: 'bakery' },
  { text: 'french toast', label: 'bakery' },
  { text: 'breakfast sandwich', label: 'bakery' },
  { text: 'egg mcmuffin', label: 'bakery' },
  { text: 'hash brown', label: 'bakery' },
  { text: 'sausage roll', label: 'bakery' },
  { text: 'bacon roll', label: 'bakery' },
  { text: 'breakfast burrito', label: 'bakery' },
  { text: 'breakfast wrap', label: 'bakery' },
  
  // Specialty Breads
  { text: 'pretzel', label: 'bakery' },
  { text: 'soft pretzel', label: 'bakery' },
  { text: 'breadstick', label: 'bakery' },
  { text: 'garlic breadstick', label: 'bakery' },
  { text: 'cornbread', label: 'bakery' },
  { text: 'banana bread', label: 'bakery' },
  { text: 'zucchini bread', label: 'bakery' },
  { text: 'pumpkin bread', label: 'bakery' },
  { text: 'monkey bread', label: 'bakery' },
  { text: 'pull apart bread', label: 'bakery' },
  
  // Frozen Bakery
  { text: 'frozen bread', label: 'bakery' },
  { text: 'frozen pastry', label: 'bakery' },
  { text: 'frozen pizza', label: 'bakery' },
  { text: 'frozen waffle', label: 'bakery' },
  { text: 'frozen pancake', label: 'bakery' },
  { text: 'frozen croissant', label: 'bakery' },
  { text: 'frozen bun', label: 'bakery' },
  { text: 'frozen cake', label: 'bakery' },
  
  // Gluten-Free Options
  { text: 'gluten free bread', label: 'bakery' },
  { text: 'gluten free cake', label: 'bakery' },
  { text: 'gluten free cookie', label: 'bakery' },
  { text: 'gluten free muffin', label: 'bakery' },
  { text: 'gluten free pastry', label: 'bakery' },
  { text: 'gluten free pizza', label: 'bakery' },
  
  // Artisanal & Premium
  { text: 'artisan bread', label: 'bakery' },
  { text: 'handmade bread', label: 'bakery' },
  { text: 'organic bread', label: 'bakery' },
  { text: 'stone baked bread', label: 'bakery' },
  { text: 'wood fired pizza', label: 'bakery' },
  { text: 'gourmet sandwich', label: 'bakery' },
  { text: 'premium cake', label: 'bakery' },
  { text: 'custom cake', label: 'bakery' }
];

export default bakeryFastFoodTrainingData;