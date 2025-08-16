// API Configuration
import { SECURE_CONFIG, validateSecrets } from './secrets';

export const API_CONFIG = {
  // API Keys from secure config
  GEMINI_API_KEY: SECURE_CONFIG.API_KEYS.GEMINI,
  OPENAI_API_KEY: SECURE_CONFIG.API_KEYS.OPENAI,
  
  // API Models
  GEMINI_MODEL: SECURE_CONFIG.API_MODELS.GEMINI_MODEL,
  WHISPER_MODEL: SECURE_CONFIG.API_MODELS.WHISPER_MODEL,
};

// Re-export validation function
export const validateApiKeys = validateSecrets;