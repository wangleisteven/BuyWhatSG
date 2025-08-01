interface GeminiItem {
  name: string;
  quantity: number;
  category: string;
}

interface GeminiResponse {
  items: GeminiItem[];
}

class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parseItemsFromText(text: string): Promise<GeminiItem[]> {
    const prompt = `
You are a shopping list assistant. Parse the following text and extract shopping items with their quantities and categories.

Text to parse:
"${text}"

Please return a JSON response with an array of items. Each item should have:
- name: the item name (cleaned and standardized)
- quantity: the quantity as a number (default to 1 if not specified)
- category: the most appropriate category from these options: "Produce", "Meat", "Dairy", "Bakery", "Pantry", "Frozen", "Beverages", "Snacks", "Health", "Household", "Other"

Rules:
1. Extract only actual food/grocery items
2. Ignore non-grocery items like "shopping list", "grocery store", etc.
3. Convert units to simple quantities (e.g., "1kg rice" becomes quantity: 1, name: "rice")
4. Standardize item names (e.g., "apples" not "red apples from store")
5. If quantity is unclear, default to 1
6. Return only valid JSON in this exact format:

{
  "items": [
    {"name": "apples", "quantity": 2, "category": "Produce"},
    {"name": "milk", "quantity": 1, "category": "Dairy"}
  ]
}
`;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
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
}

export default GeminiService;