// Environment Configuration
// This file manages environment-specific configurations

// Environment Types
export type Environment = 'development' | 'production';

// Determine current environment
// In Vite, import.meta.env.MODE is set to 'development' during development
// and 'production' during production builds
export const CURRENT_ENV: Environment = 
  (import.meta.env.MODE as Environment) || 'development';

// Environment-specific configurations
export const ENV_CONFIG = {
  // Base URLs
  BASE_URL: {
    development: 'https://localhost:5173',
    production: 'https://buywhatsg-production.web.app' // Production Firebase Hosting URL
  },
  
  // API Endpoints
  API_ENDPOINTS: {
    development: {
      // Development API endpoints
    },
    production: {
      // Production API endpoints
    }
  },
  
  // Feature Flags
  FEATURES: {
    development: {
      enableConsoleLogging: true,
      enableDetailedErrors: true,
      enableMockData: true
    },
    production: {
      enableConsoleLogging: false,
      enableDetailedErrors: false,
      enableMockData: false
    }
  }
};

// Helper function to get environment-specific configuration
export function getEnvConfig<T>(configKey: keyof typeof ENV_CONFIG): T {
  return ENV_CONFIG[configKey][CURRENT_ENV] as T;
}

// Export current environment configurations
export const BASE_URL = getEnvConfig<string>('BASE_URL');
export const API_ENDPOINTS = getEnvConfig<typeof ENV_CONFIG['API_ENDPOINTS']['development']>('API_ENDPOINTS');
export const FEATURES = getEnvConfig<typeof ENV_CONFIG['FEATURES']['development']>('FEATURES');

// Logging utility that respects environment settings
export const envLog = (...args: any[]): void => {
  if (FEATURES.enableConsoleLogging) {
    console.log(`[${CURRENT_ENV}]`, ...args);
  }
};