/**
 * Unified Integration Schema
 * 
 * This file defines the standardized data structure for all integrations
 * to replace the current inconsistent storage patterns.
 */

// Base integration platform types
export type IntegrationPlatform = 
  | 'facebookAds' 
  | 'googleAds' 
  | 'goHighLevel' 
  | 'googleSheets' 
  | 'google-ai';

// OAuth token structure for platforms that use OAuth 2.0
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
  expiresAt?: string; // ISO timestamp when token expires
}

// API key structure for platforms that use API keys
export interface ApiKeyConfig {
  apiKey: string;
  keyType?: 'bearer' | 'basic' | 'custom';
  customHeader?: string; // For custom header names
}

// Account information structure
export interface AccountInfo {
  id: string;
  name: string;
  email?: string;
  currency?: string;
  timezone?: string;
  businessId?: string; // For platforms that have business accounts
  permissions?: string[]; // Scopes/permissions granted
}

// Platform-specific metadata
export interface PlatformMetadata {
  // Facebook Ads specific
  facebookAds?: {
    adAccountId?: string;
    businessManagerId?: string;
    appId?: string;
    appSecret?: string;
  };
  
  // Google Ads specific
  googleAds?: {
    customerId?: string;
    developerToken?: string;
    clientId?: string;
    clientSecret?: string;
  };
  
  // GoHighLevel specific
  goHighLevel?: {
    locationId?: string;
    clientId?: string;
    clientSecret?: string;
  };
  
  // Google Sheets specific
  googleSheets?: {
    spreadsheetId?: string;
    sheetName?: string;
    range?: string;
  };
  
  // Google AI Studio specific
  googleAI?: {
    modelId?: string;
    projectId?: string;
    region?: string;
  };
}

// Main integration configuration interface
export interface IntegrationConfig {
  // Connection status
  connected: boolean;
  
  // OAuth tokens (for OAuth-based platforms)
  tokens?: OAuthTokens;
  
  // API key (for API key-based platforms)
  apiKey?: ApiKeyConfig;
  
  // Account information
  accountInfo?: AccountInfo;
  
  // Platform-specific metadata
  metadata?: PlatformMetadata;
  
  // Sync information
  lastSync?: string; // ISO timestamp
  lastError?: string; // Last error message if any
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success';
  
  // Connection metadata
  connectedAt?: string; // ISO timestamp when first connected
  expiresAt?: string; // ISO timestamp when connection expires
  
  // Additional configuration
  settings?: Record<string, any>; // Platform-specific settings
}

// Database row interface (matches Supabase schema)
export interface IntegrationRow {
  id: string;
  platform: IntegrationPlatform;
  connected: boolean;
  account_name?: string;
  account_id?: string;
  last_sync?: string;
  config: IntegrationConfig;
  created_at: string;
  updated_at: string;
}

// Insert interface for creating new integrations
export interface IntegrationInsert {
  id?: string;
  platform: IntegrationPlatform;
  connected: boolean;
  account_name?: string;
  account_id?: string;
  last_sync?: string;
  config: IntegrationConfig;
  created_at?: string;
  updated_at?: string;
}

// Update interface for modifying integrations
export interface IntegrationUpdate {
  id?: string;
  platform?: IntegrationPlatform;
  connected?: boolean;
  account_name?: string;
  account_id?: string;
  last_sync?: string;
  config?: IntegrationConfig;
  updated_at?: string;
}

// Service layer interfaces
export interface IntegrationService {
  getIntegration(platform: IntegrationPlatform): Promise<IntegrationRow | null>;
  saveIntegration(platform: IntegrationPlatform, config: IntegrationConfig): Promise<IntegrationRow>;
  deleteIntegration(platform: IntegrationPlatform): Promise<void>;
  getAllIntegrations(): Promise<IntegrationRow[]>;
}

// Display interface for UI components
export interface IntegrationDisplay {
  id: string;
  name: string;
  platform: IntegrationPlatform;
  status: 'connected' | 'not connected' | 'error' | 'expired' | 'syncing';
  lastSync: string;
  clientsUsing: number;
  accountName?: string;
  accountId?: string;
  errorMessage?: string;
}

// Validation schemas
export interface IntegrationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Migration helpers
export interface LegacyIntegrationConfig {
  // Old Facebook Ads format
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  
  // Old Google AI format
  apiKey?: string;
  
  // Old nested tokens format
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  };
  
  // Old user info format
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  
  // Any other legacy fields
  [key: string]: any;
}

// Utility types
export type IntegrationStatus = 'connected' | 'not connected' | 'error' | 'expired' | 'syncing';
export type TokenType = 'oauth' | 'api_key' | 'custom';

// Platform configuration
export interface PlatformIntegrationConfig {
  platform: IntegrationPlatform;
  name: string;
  icon: string;
  color: string;
  usesOAuth: boolean;
  tokenType: TokenType;
  requiredScopes?: string[];
  defaultSettings?: Record<string, any>;
}
