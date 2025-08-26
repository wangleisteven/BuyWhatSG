import { getGenerativeModel } from 'firebase/ai';
import { ai } from '../config/firebase';
import { categories } from '../config/categories';
import { SECURE_CONFIG } from '../config/secrets';

interface GeminiItem {
  name: string;
  quantity: number;
}

interface GeminiResponse {
  items: GeminiItem[];
}

interface CategoryClassificationResult {
  category: string;
  confidence: number;
}

class GeminiService {
  private model: any;

  constructor() {
    // Initialize the Gemini model using Firebase AI Logic SDK
    this.model = getGenerativeModel(ai, { model: SECURE_CONFIG.API_MODELS.GEMINI_MODEL });
  }

  async parseItemsFromText(text: string): Promise<GeminiItem[]> {
    const prompt = `
Analyze this text and extract grocery/shopping items with their quantities:

"${text}"

Please return a JSON response with an array of items. Each item should have:
- name: the item name (cleaned and standardized)
- quantity: the quantity as a number (default to 1 if not specified)

Rules:
1. Extract only actual food/grocery items
2. Ignore non-grocery items like "shopping list", "grocery store", etc.
3. Convert units to simple quantities (e.g., "1kg rice" becomes quantity: 1, name: "rice"). Do not mistakenly take the serial number as quantity.
4. Standardize item names (e.g., "red apple" not "red apples from store")
5. If quantity is unclear, default to 1
6. Return only valid JSON in this exact format:

{
  "items": [
    {"name": "apples", "quantity": 2},
    {"name": "milk", "quantity": 1}
  ]
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();
      
      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = generatedText;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }
      
      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsedResponse: GeminiResponse = JSON.parse(jsonMatch[0]);
      return parsedResponse.items || [];

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to parse items with AI. Please try again.');
    }
  }

  async classifyItemCategory(itemName: string): Promise<CategoryClassificationResult> {
    if (!itemName || itemName.trim().length === 0) {
      return {
        category: 'general',
        confidence: 0.1
      };
    }

    // Get category names for the prompt
    const categoryNames = categories.map(cat => cat.name).join('\n').replace('General\n', '');
    
    const prompt = `
Classify the following item into one of these categories:

Available categories: 
${categoryNames}

Item to classify: "${itemName.trim()}"

Rules:
1. Choose the most appropriate category from the list above
2. If no category fits well, use "General"
3. Consider the context of grocery/shopping items in different category section areas in a supermarket
4. Return only a JSON response in this exact format:

{
  "category": "category_name",
  "confidence": 0.95
}

Where:
- category: exact category name from the list (case-sensitive)
- confidence: a number between 0 and 1 indicating how confident you are
`;

    try {
      // console.log('Prompt:', prompt);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();
      
      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from the response
      let jsonText = generatedText;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }
      
      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate the response
      if (!parsedResponse.category) {
        throw new Error('Invalid response format');
      }

      // Find the matching category ID
      const matchedCategory = categories.find(cat => 
        cat.name.toLowerCase() === parsedResponse.category.toLowerCase()
      );

      const categoryId = matchedCategory ? matchedCategory.id : 'general';
      const confidence = Math.max(0, Math.min(1, parsedResponse.confidence || 0.5));

      return {
        category: categoryId,
        confidence
      };

    } catch (error) {
      console.error('Gemini category classification error:', error);
      // Fallback to general category
      return {
        category: 'general',
        confidence: 0.1
      };
    }
  }
}

export default GeminiService;