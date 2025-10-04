import { test, expect } from '@playwright/test';
import { 
  validateInput, 
  validateInputSafe, 
  ValidationSchemas, 
  ValidationError 
} from '../src/lib/validation';

test.describe('Input Validation Tests', () => {
  
  test.describe('Client Validation', () => {
    test('should validate valid client data', async () => {
      const validClient = {
        name: 'Test Client',
        type: 'venue' as const,
        location: 'New York, NY',
        logo_url: 'https://example.com/logo.png',
        status: 'active' as const,
        services: {
          facebookAds: true,
          googleAds: false,
          crm: true,
          revenue: false,
        },
        accounts: {
          facebookAds: '123456789',
          googleAds: '123-456-7890',
          goHighLevel: 'location123',
          googleSheets: 'https://docs.google.com/spreadsheets/d/123',
        },
        conversion_actions: {
          facebookAds: 'conversion123',
          googleAds: 'conversion456',
        },
      };

      const result = validateInput(ValidationSchemas.ClientCreate, validClient);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Client');
      expect(result.type).toBe('venue');
    });

    test('should reject invalid client name', async () => {
      const invalidClient = {
        name: '', // Empty name
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: false,
          revenue: false,
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });

    test('should reject client name with invalid characters', async () => {
      const invalidClient = {
        name: 'Test <script>alert("xss")</script> Client',
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: false,
          revenue: false,
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });

    test('should reject invalid client type', async () => {
      const invalidClient = {
        name: 'Test Client',
        type: 'invalid_type' as any,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: false,
          revenue: false,
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });

    test('should reject invalid Facebook Ads account ID', async () => {
      const invalidClient = {
        name: 'Test Client',
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: true,
          googleAds: false,
          crm: false,
          revenue: false,
        },
        accounts: {
          facebookAds: 'invalid-id', // Should be numeric
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });

    test('should reject invalid Google Ads customer ID format', async () => {
      const invalidClient = {
        name: 'Test Client',
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: true,
          crm: false,
          revenue: false,
        },
        accounts: {
          googleAds: 'invalid-format', // Should be XXX-XXX-XXXX
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });

    test('should require GoHighLevel ID when CRM service is enabled', async () => {
      const invalidClient = {
        name: 'Test Client',
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: true, // CRM enabled
          revenue: false,
        },
        accounts: {
          goHighLevel: '', // Empty GoHighLevel ID
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ClientCreate, invalidClient);
      }).toThrow(ValidationError);
    });
  });

  test.describe('Integration Validation', () => {
    test('should validate valid OAuth integration', async () => {
      const validIntegration = {
        platform: 'facebookAds' as const,
        connected: true,
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncStatus: 'idle' as const,
        accountInfo: {
          id: '123456789',
          name: 'Test Account',
          email: 'test@example.com',
          currency: 'USD',
          timezone: 'America/New_York',
        },
        tokens: {
          accessToken: 'valid_access_token_12345',
          refreshToken: 'valid_refresh_token_67890',
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          tokenType: 'Bearer',
          scope: 'ads_read,ads_management',
        },
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
        },
        settings: {
          autoSync: true,
          syncInterval: 300,
        },
      };

      const result = validateInput(ValidationSchemas.IntegrationConfig, validIntegration);
      expect(result).toBeDefined();
      expect(result.platform).toBe('facebookAds');
      expect(result.connected).toBe(true);
    });

    test('should validate valid API key integration', async () => {
      const validIntegration = {
        platform: 'google-ai' as const,
        connected: true,
        connectedAt: new Date().toISOString(),
        syncStatus: 'idle' as const,
        accountInfo: {
          id: 'ai-user-123',
          name: 'Google AI Account',
          email: 'ai@example.com',
        },
        apiKey: {
          apiKey: 'AIzaSyBvOkBwXcFdEfGhIjKlMnOpQrStUvWxYz',
          keyType: 'bearer',
        },
        metadata: {
          version: '1.0',
        },
      };

      const result = validateInput(ValidationSchemas.IntegrationConfig, validIntegration);
      expect(result).toBeDefined();
      expect(result.platform).toBe('google-ai');
      expect(result.apiKey).toBeDefined();
    });

    test('should reject integration without tokens or API key when connected', async () => {
      const invalidIntegration = {
        platform: 'facebookAds' as const,
        connected: true, // Connected but no tokens or API key
        syncStatus: 'idle' as const,
      };

      expect(() => {
        validateInput(ValidationSchemas.IntegrationConfig, invalidIntegration);
      }).toThrow(ValidationError);
    });

    test('should reject invalid platform', async () => {
      const invalidIntegration = {
        platform: 'invalid-platform' as any,
        connected: false,
        syncStatus: 'idle' as const,
      };

      expect(() => {
        validateInput(ValidationSchemas.IntegrationConfig, invalidIntegration);
      }).toThrow(ValidationError);
    });
  });

  test.describe('API Key Validation', () => {
    test('should validate valid Google AI API key', async () => {
      const validApiKey = {
        platform: 'google-ai' as const,
        apiKey: 'AIzaSyBvOkBwXcFdEfGhIjKlMnOpQrStUvWxYz',
        keyType: 'bearer' as const,
        accountInfo: {
          id: 'ai-user-123',
          name: 'Google AI Account',
          email: 'ai@example.com',
        },
      };

      const result = validateInput(ValidationSchemas.ApiKeyValidation, validApiKey);
      expect(result).toBeDefined();
      expect(result.platform).toBe('google-ai');
      expect(result.apiKey).toBe('AIzaSyBvOkBwXcFdEfGhIjKlMnOpQrStUvWxYz');
    });

    test('should reject API key that is too short', async () => {
      const invalidApiKey = {
        platform: 'google-ai' as const,
        apiKey: 'short', // Too short
        keyType: 'bearer' as const,
        accountInfo: {
          id: 'ai-user-123',
          name: 'Google AI Account',
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ApiKeyValidation, invalidApiKey);
      }).toThrow(ValidationError);
    });

    test('should reject API key with invalid characters', async () => {
      const invalidApiKey = {
        platform: 'google-ai' as const,
        apiKey: 'invalid@key#with$special%chars',
        keyType: 'bearer' as const,
        accountInfo: {
          id: 'ai-user-123',
          name: 'Google AI Account',
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.ApiKeyValidation, invalidApiKey);
      }).toThrow(ValidationError);
    });
  });

  test.describe('OAuth Token Validation', () => {
    test('should validate valid OAuth tokens', async () => {
      const validTokens = {
        platform: 'facebookAds' as const,
        accessToken: 'valid_access_token_12345',
        refreshToken: 'valid_refresh_token_67890',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'ads_read,ads_management',
        accountInfo: {
          id: '123456789',
          name: 'Test Account',
          email: 'test@example.com',
        },
      };

      const result = validateInput(ValidationSchemas.OAuthTokenValidation, validTokens);
      expect(result).toBeDefined();
      expect(result.platform).toBe('facebookAds');
      expect(result.accessToken).toBe('valid_access_token_12345');
    });

    test('should reject access token that is too short', async () => {
      const invalidTokens = {
        platform: 'facebookAds' as const,
        accessToken: 'short', // Too short
        refreshToken: 'valid_refresh_token_67890',
        tokenType: 'Bearer',
        accountInfo: {
          id: '123456789',
          name: 'Test Account',
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.OAuthTokenValidation, invalidTokens);
      }).toThrow(ValidationError);
    });

    test('should reject invalid expires in value', async () => {
      const invalidTokens = {
        platform: 'facebookAds' as const,
        accessToken: 'valid_access_token_12345',
        refreshToken: 'valid_refresh_token_67890',
        expiresIn: -1, // Invalid negative value
        tokenType: 'Bearer',
        accountInfo: {
          id: '123456789',
          name: 'Test Account',
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.OAuthTokenValidation, invalidTokens);
      }).toThrow(ValidationError);
    });
  });

  test.describe('Input Sanitization', () => {
    test('should sanitize valid string', async () => {
      const validString = '  Test String  ';
      const result = validateInput(ValidationSchemas.SanitizedString, validString);
      expect(result).toBe('Test String');
    });

    test('should reject string with dangerous content', async () => {
      const dangerousString = '<script>alert("xss")</script>';
      
      expect(() => {
        validateInput(ValidationSchemas.SanitizedString, dangerousString);
      }).toThrow(ValidationError);
    });

    test('should validate valid URL', async () => {
      const validUrl = 'https://example.com/path';
      const result = validateInput(ValidationSchemas.SanitizedUrl, validUrl);
      expect(result).toBe('https://example.com/path');
    });

    test('should reject invalid URL', async () => {
      const invalidUrl = 'not-a-url';
      
      expect(() => {
        validateInput(ValidationSchemas.SanitizedUrl, invalidUrl);
      }).toThrow(ValidationError);
    });

    test('should reject non-HTTP URL', async () => {
      const invalidUrl = 'ftp://example.com';
      
      expect(() => {
        validateInput(ValidationSchemas.SanitizedUrl, invalidUrl);
      }).toThrow(ValidationError);
    });

    test('should validate and normalize email', async () => {
      const email = 'TEST@EXAMPLE.COM'; // Remove whitespace for validation
      const result = validateInput(ValidationSchemas.SanitizedEmail, email);
      expect(result).toBe('test@example.com');
    });

    test('should reject invalid email', async () => {
      const invalidEmail = 'not-an-email';
      
      expect(() => {
        validateInput(ValidationSchemas.SanitizedEmail, invalidEmail);
      }).toThrow(ValidationError);
    });
  });

  test.describe('Safe Validation', () => {
    test('should return success for valid input', async () => {
      const validClient = {
        name: 'Test Client',
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: false,
          revenue: false,
        },
      };

      const result = validateInputSafe(ValidationSchemas.ClientCreate, validClient);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('should return error for invalid input', async () => {
      const invalidClient = {
        name: '', // Invalid empty name
        type: 'venue' as const,
        location: 'New York, NY',
        status: 'active' as const,
        services: {
          facebookAds: false,
          googleAds: false,
          crm: false,
          revenue: false,
        },
      };

      const result = validateInputSafe(ValidationSchemas.ClientCreate, invalidClient);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(ValidationError);
    });
  });

  test.describe('Metrics Validation', () => {
    test('should validate valid metrics data', async () => {
      const validMetrics = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'facebookAds' as const,
        date: '2024-01-15',
        metrics: {
          impressions: 1000,
          clicks: 50,
          spend: 25.50,
          conversions: 5,
          cpm: 25.50,
          cpc: 0.51,
          ctr: 5.0,
        },
      };

      const result = validateInput(ValidationSchemas.MetricsData, validMetrics);
      expect(result).toBeDefined();
      expect(result.clientId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.platform).toBe('facebookAds');
    });

    test('should reject invalid UUID', async () => {
      const invalidMetrics = {
        clientId: 'not-a-uuid',
        platform: 'facebookAds' as const,
        date: '2024-01-15',
        metrics: {
          impressions: 1000,
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.MetricsData, invalidMetrics);
      }).toThrow(ValidationError);
    });

    test('should reject invalid date format', async () => {
      const invalidMetrics = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'facebookAds' as const,
        date: '2024/01/15', // Wrong format
        metrics: {
          impressions: 1000,
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.MetricsData, invalidMetrics);
      }).toThrow(ValidationError);
    });

    test('should reject negative metrics', async () => {
      const invalidMetrics = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'facebookAds' as const,
        date: '2024-01-15',
        metrics: {
          impressions: -1000, // Negative value
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.MetricsData, invalidMetrics);
      }).toThrow(ValidationError);
    });

    test('should reject CTR over 100%', async () => {
      const invalidMetrics = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'facebookAds' as const,
        date: '2024-01-15',
        metrics: {
          impressions: 1000,
          clicks: 50,
          ctr: 150.0, // Over 100%
        },
      };

      expect(() => {
        validateInput(ValidationSchemas.MetricsData, invalidMetrics);
      }).toThrow(ValidationError);
    });
  });
});
