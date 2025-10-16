import { z } from 'zod';

/**
 * Input Validation Schemas for Production Security
 * 
 * This module provides comprehensive validation schemas for:
 * - Client data validation
 * - Integration configuration validation
 * - API request validation
 * - User input sanitization
 */

// ============================================================================
// CLIENT VALIDATION SCHEMAS
// ============================================================================

export const ClientCreateSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, 'Client name contains invalid characters'),
  
  type: z.enum(['Client', 'agency', 'enterprise'], {
    errorMap: () => ({ message: 'Client type must be Client, agency, or enterprise' })
  }),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters'),
  
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['active', 'paused', 'inactive']).default('active'),
  
  services: z.object({
    facebookAds: z.boolean().default(false),
    googleAds: z.boolean().default(false),
    crm: z.boolean().default(false),
    revenue: z.boolean().default(false),
  }),
  
  accounts: z.object({
    facebookAds: z.string()
      .regex(/^(act_)?\d+$/, 'Facebook Ads account ID must be numeric or start with act_')
      .optional()
      .or(z.literal('')),
    
    googleAds: z.string()
      .regex(/^(customers\/)?\d{10}$|^\d{3}-\d{3}-\d{4}$/, 'Google Ads customer ID must be 10 digits or in format XXX-XXX-XXXX')
      .optional()
      .or(z.literal('')),
    
    goHighLevel: z.string()
      .min(1, 'GoHighLevel location ID is required if CRM service is enabled')
      .optional()
      .or(z.literal('')),
    
    googleSheets: z.string()
      .optional()
      .or(z.literal('')),
    
    googleSheetsConfig: z.object({
      spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
      sheetName: z.string().min(1, 'Sheet name is required'),
    }).optional(),
  }).optional(),
  
  conversion_actions: z.object({
    facebookAds: z.string().optional(),
    googleAds: z.string().optional(),
  }).optional(),
}).refine((data) => {
  // Validate that if services are enabled, corresponding accounts are provided
  if (data.services.crm && data.accounts?.goHighLevel === '') {
    return false;
  }
  return true;
}, {
  message: 'GoHighLevel location ID is required when CRM service is enabled',
  path: ['accounts', 'goHighLevel']
});

export const ClientUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .max(100, 'Client name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.()]+$/, 'Client name contains invalid characters')
    .optional(),
  
  type: z.enum(['Client', 'agency', 'enterprise'], {
    errorMap: () => ({ message: 'Client type must be Client, agency, or enterprise' })
  }).optional(),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters')
    .optional(),
  
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['active', 'paused', 'inactive']).optional(),
  
  services: z.object({
    facebookAds: z.boolean().default(false),
    googleAds: z.boolean().default(false),
    crm: z.boolean().default(false),
    revenue: z.boolean().default(false),
  }).optional(),
  
  accounts: z.object({
    facebookAds: z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal('none'))
      .refine((val) => {
        if (!val || val === '' || val === 'none') {return true;}
        return /^(act_)?\d+$/.test(val);
      }, 'Facebook Ads account ID must be numeric or start with act_'),
    
    googleAds: z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal('none'))
      .refine((val) => {
        if (!val || val === '' || val === 'none') {return true;}
        return /^(customers\/)?\d{10}$|^\d{3}-\d{3}-\d{4}$/.test(val);
      }, 'Google Ads customer ID must be 10 digits or in format XXX-XXX-XXXX'),
    
    goHighLevel: z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal('none')),
    
    googleSheets: z.string()
      .optional()
      .or(z.literal(''))
      .or(z.literal('none')),
    
    googleSheetsConfig: z.object({
      spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
      sheetName: z.string().min(1, 'Sheet name is required'),
    }).optional(),
  }).optional(),
  
  conversion_actions: z.object({
    facebookAds: z.string().optional(),
    googleAds: z.string().optional(),
  }).optional(),
});

// ============================================================================
// INTEGRATION VALIDATION SCHEMAS
// ============================================================================

export const IntegrationConfigSchema = z.object({
  platform: z.enum(['facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai']),
  
  connected: z.boolean(),
  
  connectedAt: z.string()
    .datetime('Connected date must be a valid ISO datetime')
    .optional(),
  
  lastSync: z.string()
    .datetime('Last sync date must be a valid ISO datetime')
    .optional(),
  
  syncStatus: z.enum(['idle', 'syncing', 'error']).default('idle'),
  
  accountInfo: z.object({
    id: z.string().min(1, 'Account ID is required'),
    name: z.string().min(1, 'Account name is required'),
    email: z.string().email('Account email must be valid').optional(),
    currency: z.string().length(3, 'Currency must be 3 characters').optional(),
    timezone: z.string().optional(),
  }).optional(),
  
  tokens: z.object({
    accessToken: z.string().min(1, 'Access token is required'),
    refreshToken: z.string().optional(),
    expiresIn: z.number().positive('Expires in must be positive').optional(),
    expiresAt: z.string().datetime('Expires at must be valid ISO datetime').optional(),
    tokenType: z.string().default('Bearer'),
    scope: z.string().optional(),
  }).optional(),
  
  apiKey: z.object({
    apiKey: z.string().min(1, 'API key is required'),
    keyType: z.string().default('bearer'),
  }).optional(),
  
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
}).refine((data) => {
  // Either tokens or apiKey must be present for connected integrations
  if (data.connected && !data.tokens && !data.apiKey) {
    return false;
  }
  return true;
}, {
  message: 'Connected integrations must have either tokens or API key',
  path: ['connected']
});

// ============================================================================
// API KEY VALIDATION SCHEMAS
// ============================================================================

export const ApiKeyValidationSchema = z.object({
  platform: z.enum(['facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai']),
  
  apiKey: z.string()
    .min(10, 'API key must be at least 10 characters')
    .max(500, 'API key must be less than 500 characters')
    .regex(/^[a-zA-Z0-9\-_\.]+$/, 'API key contains invalid characters'),
  
  keyType: z.enum(['bearer', 'basic', 'api-key']).default('bearer'),
  
  accountInfo: z.object({
    id: z.string().min(1, 'Account ID is required'),
    name: z.string().min(1, 'Account name is required'),
    email: z.string().email('Account email must be valid').optional(),
  }),
}).refine((data) => {
  // Platform-specific validation
  if (data.platform === 'google-ai') {
    return data.apiKey.startsWith('AIza') || data.apiKey.includes('google');
  }
  return true;
}, {
  message: 'Google AI API key format is invalid',
  path: ['apiKey']
});

// ============================================================================
// OAUTH TOKEN VALIDATION SCHEMAS
// ============================================================================

export const OAuthTokenValidationSchema = z.object({
  platform: z.enum(['facebookAds', 'googleAds', 'goHighLevel', 'googleSheets']),
  
  accessToken: z.string()
    .min(10, 'Access token must be at least 10 characters')
    .max(1000, 'Access token must be less than 1000 characters'),
  
  refreshToken: z.string()
    .min(10, 'Refresh token must be at least 10 characters')
    .max(1000, 'Refresh token must be less than 1000 characters')
    .optional(),
  
  expiresIn: z.number()
    .positive('Expires in must be positive')
    .max(86400, 'Expires in cannot exceed 24 hours')
    .optional(),
  
  tokenType: z.string().default('Bearer'),
  scope: z.string().optional(),
  
  accountInfo: z.object({
    id: z.string().min(1, 'Account ID is required'),
    name: z.string().min(1, 'Account name is required'),
    email: z.string().email('Account email must be valid').optional(),
  }),
});

// ============================================================================
// METRICS VALIDATION SCHEMAS
// ============================================================================

export const MetricsDataSchema = z.object({
  clientId: z.string().uuid('Client ID must be a valid UUID'),
  
  platform: z.enum(['facebookAds', 'googleAds', 'goHighLevel', 'googleSheets']),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  metrics: z.object({
    // Facebook Ads metrics
    impressions: z.number().min(0).optional(),
    clicks: z.number().min(0).optional(),
    spend: z.number().min(0).optional(),
    conversions: z.number().min(0).optional(),
    cpm: z.number().min(0).optional(),
    cpc: z.number().min(0).optional(),
    ctr: z.number().min(0).max(100).optional(),
    
    // Google Ads metrics
    cost: z.number().min(0).optional(),
    conversions_value: z.number().min(0).optional(),
    cost_per_conversion: z.number().min(0).optional(),
    
    // Common metrics
    leads: z.number().min(0).optional(),
    revenue: z.number().min(0).optional(),
    roi: z.number().optional(),
  }),
});

// ============================================================================
// USER INPUT SANITIZATION
// ============================================================================

export const SanitizedStringSchema = z.string()
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, 'String cannot be empty after trimming')
  .refine((str) => !/<script|javascript:|data:|vbscript:/i.test(str), 'String contains potentially dangerous content');

export const SanitizedUrlSchema = z.string()
  .url('Must be a valid URL')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL must use HTTP or HTTPS protocol');

export const SanitizedEmailSchema = z.string()
  .email('Must be a valid email address')
  .transform((email) => email.toLowerCase().trim())
  .refine((email) => email.length <= 254, 'Email address is too long');

// ============================================================================
// RATE LIMITING SCHEMAS
// ============================================================================

export const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000, 'Window must be at least 1 second').default(60000), // 1 minute
  maxRequests: z.number().min(1, 'Max requests must be at least 1').default(100),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  keyGenerator: z.function().optional(),
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.path.join('.'),
        firstError.message,
        'VALIDATION_ERROR'
      );
    }
    throw error;
  }
};

export const validateInputSafe = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: ValidationError;
} => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: new ValidationError(
          firstError.path.join('.'),
          firstError.message,
          'VALIDATION_ERROR'
        )
      };
    }
    return {
      success: false,
      error: new ValidationError('unknown', 'Unknown validation error', 'UNKNOWN_ERROR')
    };
  }
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const ValidationSchemas = {
  ClientCreate: ClientCreateSchema,
  ClientUpdate: ClientUpdateSchema,
  IntegrationConfig: IntegrationConfigSchema,
  ApiKeyValidation: ApiKeyValidationSchema,
  OAuthTokenValidation: OAuthTokenValidationSchema,
  MetricsData: MetricsDataSchema,
  SanitizedString: SanitizedStringSchema,
  SanitizedUrl: SanitizedUrlSchema,
  SanitizedEmail: SanitizedEmailSchema,
  RateLimitConfig: RateLimitConfigSchema,
} as const;
