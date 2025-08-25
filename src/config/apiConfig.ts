// API Configuration
import { SECURE_CONFIG, validateSecrets } from './secrets';
import { CURRENT_ENV, envLog } from './envConfig';

// Environment-specific API endpoints
const API_ENDPOINTS = {
  development: {
    openaiApi: 'https://api.openai.com',
  },
  production: {
    openaiApi: 'https://api.openai.com',
  }
};

export const API_CONFIG = {
  // API Keys
  OPENAI_API_KEY: SECURE_CONFIG.API_KEYS.OPENAI,
  
  // API Models
  WHISPER_MODEL: SECURE_CONFIG.API_MODELS.WHISPER_MODEL,
   
  // API Endpoints based on environment
  ENDPOINTS: API_ENDPOINTS[CURRENT_ENV],
};

// Log API configuration in development environment
envLog('API Configuration initialized for', CURRENT_ENV);
envLog('Using endpoints:', API_CONFIG.ENDPOINTS);

// Re-export validation function
export const validateApiKeys = validateSecrets;