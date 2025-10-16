// Debug Configuration
// Controls debug output across the application without removing debug code

export const DEBUG_CONFIG = {
  enabled: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  platforms: {
    facebook: import.meta.env.VITE_DEBUG_FACEBOOK === 'true',
    google: import.meta.env.VITE_DEBUG_GOOGLE === 'true',
    ghl: import.meta.env.VITE_DEBUG_GHL === 'true',
    sheets: import.meta.env.VITE_DEBUG_SHEETS === 'true',
    auth: import.meta.env.VITE_DEBUG_AUTH === 'true',
    api: import.meta.env.VITE_DEBUG_API === 'true',
    database: import.meta.env.VITE_DEBUG_DATABASE === 'true'
  },
  features: {
    performance: import.meta.env.VITE_DEBUG_PERFORMANCE === 'true',
    network: import.meta.env.VITE_DEBUG_NETWORK === 'true',
    cache: import.meta.env.VITE_DEBUG_CACHE === 'true',
    tokens: import.meta.env.VITE_DEBUG_TOKENS === 'true'
  }
};

// Type definitions for better TypeScript support
export type DebugPlatform = keyof typeof DEBUG_CONFIG.platforms;
export type DebugFeature = keyof typeof DEBUG_CONFIG.features;
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Helper function to check if logging should be enabled
export const shouldLog = (platform?: DebugPlatform, feature?: DebugFeature): boolean => {
  if (!DEBUG_CONFIG.enabled) {return false;}
  
  if (platform && !DEBUG_CONFIG.platforms[platform]) {return false;}
  if (feature && !DEBUG_CONFIG.features[feature]) {return false;}
  
  return true;
};

// Helper function to get current debug status
export const getDebugStatus = () => ({
  enabled: DEBUG_CONFIG.enabled,
  logLevel: DEBUG_CONFIG.logLevel,
  platforms: Object.entries(DEBUG_CONFIG.platforms)
    .filter(([_, enabled]) => enabled)
    .map(([platform, _]) => platform),
  features: Object.entries(DEBUG_CONFIG.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature)
});

export default DEBUG_CONFIG;
