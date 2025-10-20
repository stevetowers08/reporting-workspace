/**
 * Production-Ready Environment Configuration
 * Handles environment variables with proper validation and fallbacks
 */

interface EnvConfig {
  // Core App
  appName: string;
  appVersion: string;
  appEnv: 'development' | 'production' | 'test';
  appUrl: string;
  
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Feature Flags
  enableDebug: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  
  // Performance
  cacheTtl: number;
  cacheMaxSize: number;
  apiTimeout: number;
  
  // Security
  encryptionKey: string;
}

class EnvConfigManager {
  private static instance: EnvConfigManager;
  private config: EnvConfig | null = null;
  private isBuildTime = typeof window === 'undefined';

  static getInstance(): EnvConfigManager {
    if (!EnvConfigManager.instance) {
      EnvConfigManager.instance = new EnvConfigManager();
    }
    return EnvConfigManager.instance;
  }

  private getEnvVar(key: string, defaultValue?: string): string {
    const value = import.meta.env[key];
    
    // During build time, use defaults to prevent failures
    if (!value && this.isBuildTime) {
      return defaultValue || '';
    }
    
    return value || defaultValue || '';
  }

  private getBooleanEnvVar(key: string, defaultValue = false): boolean {
    const value = this.getEnvVar(key);
    return value === 'true' || (defaultValue && value !== 'false');
  }

  private getNumberEnvVar(key: string, defaultValue = 0): number {
    const value = this.getEnvVar(key);
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getConfig(): EnvConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      // Core App
      appName: this.getEnvVar('VITE_APP_NAME', 'Marketing Analytics Dashboard'),
      appVersion: this.getEnvVar('VITE_APP_VERSION', '1.0.0'),
      appEnv: (this.getEnvVar('VITE_APP_ENV', 'development') as any) || 'development',
      appUrl: this.getEnvVar('VITE_APP_URL', 'http://localhost:5173'),
      
      // Supabase
      supabaseUrl: this.getEnvVar('VITE_SUPABASE_URL', 'https://placeholder.supabase.co'),
      supabaseAnonKey: this.getEnvVar('VITE_SUPABASE_ANON_KEY', 'placeholder-key'),
      
      // Feature Flags
      enableDebug: this.getBooleanEnvVar('VITE_ENABLE_DEBUG', false),
      enableAnalytics: this.getBooleanEnvVar('VITE_ENABLE_ANALYTICS', true),
      enableErrorReporting: this.getBooleanEnvVar('VITE_ENABLE_ERROR_REPORTING', true),
      
      // Performance
      cacheTtl: this.getNumberEnvVar('VITE_CACHE_TTL', 300000), // 5 minutes
      cacheMaxSize: this.getNumberEnvVar('VITE_CACHE_MAX_SIZE', 100),
      apiTimeout: this.getNumberEnvVar('VITE_API_TIMEOUT', 30000), // 30 seconds
      
      // Security
      encryptionKey: this.getEnvVar('VITE_ENCRYPTION_KEY', 'dev-key-change-in-production'),
    };

    // Runtime validation (only in browser)
    if (!this.isBuildTime) {
      this.validateRuntimeConfig();
    }

    return this.config;
  }

  private validateRuntimeConfig(): void {
    const errors: string[] = [];
    
    if (!this.config!.supabaseUrl || this.config!.supabaseUrl.includes('placeholder')) {
      errors.push('VITE_SUPABASE_URL is required');
    }
    
    if (!this.config!.supabaseAnonKey || this.config!.supabaseAnonKey.includes('placeholder')) {
      errors.push('VITE_SUPABASE_ANON_KEY is required');
    }

    if (errors.length > 0) {
      console.error('❌ Environment validation failed:', errors);
      // Don't throw in production to prevent app crashes
      if (this.config!.appEnv === 'development') {
        throw new Error(`Missing required environment variables: ${errors.join(', ')}`);
      }
    }
  }

  // Convenience methods
  isDevelopment(): boolean {
    return this.getConfig().appEnv === 'development';
  }

  isProduction(): boolean {
    return this.getConfig().appEnv === 'production';
  }

  getSupabaseConfig() {
    const config = this.getConfig();
    return {
      url: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
    };
  }
}

// Export singleton instance
export const envConfig = EnvConfigManager.getInstance();

// Export convenience functions
export const getEnvConfig = () => envConfig.getConfig();
export const isDevelopment = () => envConfig.isDevelopment();
export const isProduction = () => envConfig.isProduction();
export const getSupabaseConfig = () => envConfig.getSupabaseConfig();






