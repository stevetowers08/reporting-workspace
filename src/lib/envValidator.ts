/**
 * Environment Validation Utility
 * Validates required environment variables and provides helpful error messages
 */

import { debugLogger } from './debug';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appName: string;
  appVersion: string;
  appEnv: string;
  appUrl: string;
  enableDebug: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  logLevel: string;
  cacheTtl: number;
  cacheMaxSize: number;
  apiBaseUrl: string;
  apiTimeout: number;
  apiRateLimit: number;
  apiRateWindow: number;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvConfig | null = null;
  private errors: string[] = [];

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  validate(): EnvConfig {
    if (this.config) {
      return this.config;
    }

    this.errors = [];
    const env = import.meta.env;

    // Required variables
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      this.errors.push('VITE_SUPABASE_URL is required');
    }

    if (!supabaseAnonKey) {
      this.errors.push('VITE_SUPABASE_ANON_KEY is required');
    }

    if (this.errors.length > 0) {
      debugLogger.error('EnvironmentValidator', 'Environment validation failed', this.errors);
      throw new Error(`Missing required environment variables: ${this.errors.join(', ')}`);
    }

    // Optional variables with defaults
    this.config = {
      supabaseUrl,
      supabaseAnonKey,
      appName: env.VITE_APP_NAME || 'Marketing Analytics Dashboard',
      appVersion: env.VITE_APP_VERSION || '1.0.0-dev',
      appEnv: env.VITE_APP_ENV || 'development',
      appUrl: env.VITE_APP_URL || 'http://localhost:5173',
      enableDebug: env.VITE_ENABLE_DEBUG === 'true',
      enableAnalytics: env.VITE_ENABLE_ANALYTICS === 'true',
      enableErrorReporting: env.VITE_ENABLE_ERROR_REPORTING === 'true',
      logLevel: env.VITE_LOG_LEVEL || 'info',
      cacheTtl: parseInt(env.VITE_CACHE_TTL || '30000', 10),
      cacheMaxSize: parseInt(env.VITE_CACHE_MAX_SIZE || '25', 10),
      apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3000',
      apiTimeout: parseInt(env.VITE_API_TIMEOUT || '5000', 10),
      apiRateLimit: parseInt(env.VITE_API_RATE_LIMIT || '1000', 10),
      apiRateWindow: parseInt(env.VITE_API_RATE_WINDOW || '60000', 10),
    };

    // Development-specific optimizations
    if (this.config.appEnv === 'development') {
      this.config.enableDebug = true;
      this.config.enableAnalytics = false;
      this.config.enableErrorReporting = false;
      this.config.logLevel = 'info';
      this.config.cacheTtl = Math.min(this.config.cacheTtl, 30000); // Max 30s for dev
    }

    debugLogger.info('EnvironmentValidator', 'Environment validation passed');
    debugLogger.info('EnvironmentValidator', 'App Config', {
      name: this.config.appName,
      version: this.config.appVersion,
      env: this.config.appEnv,
      debug: this.config.enableDebug,
      analytics: this.config.enableAnalytics,
    });

    return this.config;
  }

  getConfig(): EnvConfig {
    if (!this.config) {
      return this.validate();
    }
    return this.config;
  }

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
export const envValidator = EnvironmentValidator.getInstance();

// Export convenience functions
export const getEnvConfig = () => envValidator.getConfig();
export const isDevelopment = () => envValidator.isDevelopment();
export const isProduction = () => envValidator.isProduction();
export const getSupabaseConfig = () => envValidator.getSupabaseConfig();

// Validate on import
try {
  envValidator.validate();
} catch (error) {
  debugLogger.error('EnvironmentValidator', 'Environment validation failed on import', error);
}
