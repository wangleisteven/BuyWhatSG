import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiItem {
  name: string;
  quantity: number;
}

interface GeminiResponse {
  items: GeminiItem[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
}

export default GeminiService;