// API Configuration
// Note: In production, these should be environment variables or stored securely

export const API_CONFIG = {
  // Google Gemini API Key - Replace with your actual key
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: 'gemini-2.0-flash',
  
  // OpenAI API Key - Replace with your actual key  
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
};

// Validation function to check if API keys are configured
export const validateApiKeys = () => {
  const errors: string[] = [];
  
  if (!API_CONFIG.GEMINI_API_KEY) {
    errors.push('Gemini API key is not configured');
  }
  
  if (!API_CONFIG.OPENAI_API_KEY) {
    errors.push('OpenAI API key is not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};