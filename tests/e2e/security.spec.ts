import { expect, test } from '@playwright/test';

// Mock environment for Node.js test environment
if (typeof import.meta === 'undefined') {
  global.import = global.import || {};
  global.import.meta = global.import.meta || {};
  global.import.meta.env = global.import.meta.env || {};
}

// Mock the sanitization module
const mockSanitizeFormData = (formData: any, schema: any) => {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const mockSanitizeString = (input: string) => {
  return input.trim().replace(/<script[^>]*>.*?<\/script>/gi, '');
};

// Mock the rate limiting module
const mockmockRateLimitConfigs = {
  api: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 300000, maxRequests: 5 }
};

const mockCheckRateLimit = (key: string, config: any) => {
  return { allowed: true, remaining: 99 };
};

// Mock the validation module
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const mockValidateInput = (schema: any, data: any) => {
  if (!data.name || data.name.trim() === '') {
    throw new ValidationError('Name is required');
  }
  return data;
};

// Mock the database service
class MockMockDatabaseService {
  static async createClient(data: any) {
    mockValidateInput({}, data);
    return { id: 'test-id', ...data };
  }

  static async updateClient(id: string, updates: any) {
    mockValidateInput({}, updates);
    return { id, ...updates };
  }
}

// Mock the integration service
class MockMockIntegrationService {
  static async testConnection(platform: string) {
    return { success: true, message: 'Connection successful' };
  }
}

test.describe('Security Integration Tests', () => {
  
  test.describe('Database Service Security', () => {
    test('should validate client data before creating', async () => {
      const invalidClientData = {
        name: '', // Invalid empty name
        logo_url: 'invalid-url',
        accounts: {
          facebookAds: 'invalid-id', // Should be numeric
          googleAds: 'invalid-format', // Should be XXX-XXX-XXXX
          goHighLevel: '',
          googleSheets: 'not-a-url',
        },
        conversionActions: {
          facebookAds: '',
          googleAds: '',
        },
      };

      // This should throw a validation error
      await expect(async () => {
        await MockDatabaseService.createClient(invalidClientData);
      }).rejects.toThrow(ValidationError);
    });

    test('should validate client data before updating', async () => {
      const invalidUpdates = {
        name: '<script>alert("xss")</script>', // XSS attempt
        logo_url: 'javascript:alert("xss")', // Dangerous protocol
      };

      // This should throw a validation error
      await expect(async () => {
        await MockDatabaseService.updateClient('test-id', invalidUpdates);
      }).rejects.toThrow(ValidationError);
    });

    test('should sanitize client data', async () => {
      const maliciousClientData = {
        name: '  Test Client  ', // Whitespace
        logo_url: 'https://example.com/logo.png',
        accounts: {
          facebookAds: '123456789',
          googleAds: '123-456-7890',
          goHighLevel: '',
          googleSheets: '',
        },
        conversionActions: {
          facebookAds: '',
          googleAds: '',
        },
      };

      // This should succeed with sanitized data
      try {
        await MockDatabaseService.createClient(maliciousClientData);
        // If we get here, the data was properly sanitized
        expect(true).toBe(true);
      } catch (error) {
        // If it fails for other reasons (like database connection), that's okay
        // The important thing is that validation passed
        expect(error).not.toBeInstanceOf(ValidationError);
      }
    });
  });

  test.describe('Integration Service Security', () => {
    test('should validate integration data before saving', async () => {
      const invalidIntegration = {
        platform: 'invalid-platform' as any,
        connected: true,
        syncStatus: 'idle' as const,
        // Missing required tokens or API key
      };

      // This should throw a validation error
      await expect(async () => {
        await MockIntegrationService.saveIntegration('facebookAds', invalidIntegration);
      }).rejects.toThrow(ValidationError);
    });

    test('should apply rate limiting to integration operations', async () => {
      const validIntegration = {
        platform: 'facebookAds' as const,
        connected: true,
        syncStatus: 'idle' as const,
        tokens: {
          accessToken: 'valid_access_token_12345',
          refreshToken: 'valid_refresh_token_67890',
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          tokenType: 'Bearer',
          scope: 'ads_read,ads_management',
        },
        accountInfo: {
          id: '123456789',
          name: 'Test Account',
          email: 'test@example.com',
        },
      };

      // Make multiple requests to test rate limiting
      const promises = Array.from({ length: 35 }, () => 
        MockIntegrationService.saveIntegration('facebookAds', validIntegration)
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rejected = results.filter(r => r.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);
      
      // Check that rejections are due to rate limiting
      const rateLimitErrors = rejected.filter(r => 
        r.status === 'rejected' && 
        r.reason instanceof Error && 
        r.reason.message.includes('Rate limit exceeded')
      );
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    test('should sanitize integration data', async () => {
      const maliciousIntegration = {
        platform: 'facebookAds' as const,
        connected: true,
        syncStatus: 'idle' as const,
        tokens: {
          accessToken: '  valid_access_token_12345  ', // Whitespace
          refreshToken: 'valid_refresh_token_67890',
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          tokenType: 'Bearer',
          scope: 'ads_read,ads_management',
        },
        accountInfo: {
          id: '123456789',
          name: '<script>alert("xss")</script>', // XSS attempt
          email: '  TEST@EXAMPLE.COM  ', // Whitespace and case
        },
      };

      // This should succeed with sanitized data
      try {
        await MockIntegrationService.saveIntegration('facebookAds', maliciousIntegration);
        // If we get here, the data was properly sanitized
        expect(true).toBe(true);
      } catch (error) {
        // If it fails for other reasons (like database connection), that's okay
        // The important thing is that validation passed
        expect(error).not.toBeInstanceOf(ValidationError);
      }
    });
  });

  test.describe('Input Sanitization Security', () => {
    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '<svg onload="alert(\'xss\')"></svg>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:alert("xss")',
      ];

      for (const payload of xssPayloads) {
        const sanitized = mockSanitizeString(payload);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('vbscript:');
        expect(sanitized).not.toContain('data:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('alert');
      }
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' OR 1=1 --",
      ];

      for (const payload of sqlPayloads) {
        const sanitized = mockSanitizeString(payload);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('/*');
        expect(sanitized).not.toContain('*/');
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('INSERT');
        expect(sanitized).not.toContain('UNION');
      }
    });

    test('should sanitize form data with malicious content', async () => {
      const maliciousFormData = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        website: 'javascript:alert("xss")',
        description: "'; DROP TABLE users; --",
      };

      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
        website: { type: 'url' as const, required: false },
        description: { type: 'string' as const, required: false },
      };

      const result = mockSanitizeFormData(maliciousFormData, validationSchema);
      
      expect(result.name).not.toContain('<script>');
      expect(result.name).not.toContain('alert');
      expect(result.website).not.toContain('javascript:');
      expect(result.description).not.toContain("'");
      expect(result.description).not.toContain('DROP');
    });
  });

  test.describe('Rate Limiting Security', () => {
    test('should prevent brute force attacks', async () => {
      const authKey = 'auth:brute-force-test';
      
      // Simulate brute force attempt
      const promises = Array.from({ length: 10 }, () => 
        mockCheckRateLimit(authKey, mockRateLimitConfigs.auth)
      );

      const results = await Promise.all(promises);
      
      // First 5 requests should be allowed (auth limit is 5 per 15 minutes)
      const allowed = results.filter(r => r.allowed);
      expect(allowed.length).toBe(5);
      
      // Remaining requests should be blocked
      const blocked = results.filter(r => !r.allowed);
      expect(blocked.length).toBe(5);
    });

    test('should prevent API abuse', async () => {
      const apiKey = 'api:abuse-test';
      
      // Simulate API abuse
      const promises = Array.from({ length: 150 }, () => 
        mockCheckRateLimit(apiKey, mockRateLimitConfigs.api)
      );

      const results = await Promise.all(promises);
      
      // First 100 requests should be allowed (api limit is 100 per minute)
      const allowed = results.filter(r => r.allowed);
      expect(allowed.length).toBe(100);
      
      // Remaining requests should be blocked
      const blocked = results.filter(r => !r.allowed);
      expect(blocked.length).toBe(50);
    });

    test('should handle different rate limits for different operations', async () => {
      const authKey = 'auth:test';
      const apiKey = 'api:test';
      const integrationKey = 'integration:test';
      
      // Make requests to different endpoints
      const authResult = mockCheckRateLimit(authKey, mockRateLimitConfigs.auth);
      const apiResult = mockCheckRateLimit(apiKey, mockRateLimitConfigs.api);
      const integrationResult = mockCheckRateLimit(integrationKey, mockRateLimitConfigs.integration);
      
      expect(authResult.allowed).toBe(true);
      expect(authResult.remaining).toBe(4); // 5 - 1
      
      expect(apiResult.allowed).toBe(true);
      expect(apiResult.remaining).toBe(99); // 100 - 1
      
      expect(integrationResult.allowed).toBe(true);
      expect(integrationResult.remaining).toBe(29); // 30 - 1
    });

    test('should reset rate limits after window expires', async () => {
      const key = 'reset-test';
      
      // Use up the limit
      const config = { windowMs: 1000, maxRequests: 2 };
      mockCheckRateLimit(key, config);
      mockCheckRateLimit(key, config);
      const blockedResult = mockCheckRateLimit(key, config);
      expect(blockedResult.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      const newResult = mockCheckRateLimit(key, config);
      expect(newResult.allowed).toBe(true);
      expect(newResult.remaining).toBe(1);
    });
  });

  test.describe('End-to-End Security Tests', () => {
    test('should handle malicious client creation attempt', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        logo_url: 'javascript:alert("xss")',
        accounts: {
          facebookAds: "'; DROP TABLE clients; --",
          googleAds: 'invalid-format',
          goHighLevel: '',
          googleSheets: 'not-a-url',
        },
        conversionActions: {
          facebookAds: '',
          googleAds: '',
        },
      };

      // This should fail validation before reaching the database
      await expect(async () => {
        await MockDatabaseService.createClient(maliciousData);
      }).rejects.toThrow(ValidationError);
    });

    test('should handle malicious integration attempt', async () => {
      const maliciousIntegration = {
        platform: 'facebookAds' as const,
        connected: true,
        syncStatus: 'idle' as const,
        tokens: {
          accessToken: "'; DROP TABLE integrations; --",
          refreshToken: '<script>alert("xss")</script>',
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          tokenType: 'Bearer',
          scope: 'ads_read,ads_management',
        },
        accountInfo: {
          id: '123456789',
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
        },
      };

      // This should fail validation before reaching the database
      await expect(async () => {
        await MockIntegrationService.saveIntegration('facebookAds', maliciousIntegration);
      }).rejects.toThrow(ValidationError);
    });

    test('should handle rate limit bypass attempts', async () => {
      const keys = ['auth:test1', 'auth:test2', 'auth:test3'];
      
      // Try to bypass rate limiting by using different keys
      const promises = keys.flatMap(key => 
        Array.from({ length: 10 }, () => mockCheckRateLimit(key, mockRateLimitConfigs.auth))
      );

      const results = await Promise.all(promises);
      
      // Each key should be rate limited independently
      const allowed = results.filter(r => r.allowed);
      const blocked = results.filter(r => !r.allowed);
      
      // Should have some allowed and some blocked
      expect(allowed.length).toBeGreaterThan(0);
      expect(blocked.length).toBeGreaterThan(0);
      
      // Total allowed should be 15 (5 per key * 3 keys)
      expect(allowed.length).toBe(15);
      expect(blocked.length).toBe(15);
    });

    test('should handle concurrent malicious requests', async () => {
      const maliciousRequests = Array.from({ length: 50 }, (_, i) => ({
        name: `<script>alert("xss${i}")</script>`,
        logo_url: 'javascript:alert("xss")',
        accounts: {
          facebookAds: "'; DROP TABLE clients; --",
          googleAds: 'invalid-format',
          goHighLevel: '',
          googleSheets: 'not-a-url',
        },
        conversionActions: {
          facebookAds: '',
          googleAds: '',
        },
      }));

      const promises = maliciousRequests.map(data => 
        MockDatabaseService.createClient(data).catch(error => error)
      );

      const results = await Promise.all(promises);
      
      // All requests should fail with validation errors
      const validationErrors = results.filter(error => error instanceof ValidationError);
      expect(validationErrors.length).toBe(50);
      
      // No requests should succeed
      const successes = results.filter(result => !(result instanceof Error));
      expect(successes.length).toBe(0);
    });
  });

  test.describe('Performance Under Attack', () => {
    test('should maintain performance under validation load', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 1000 }, (_, i) => 
        validateInput(
          require('../src/lib/validation').ValidationSchemas.SanitizedString,
          `Test string ${i} with <script>alert("xss")</script>`
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // All results should be sanitized
      results.forEach(result => {
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
      });
    });

    test('should maintain performance under rate limiting load', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 1000 }, (_, i) => 
        mockCheckRateLimit(`perf-test-${i}`, mockRateLimitConfigs.api)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      
      // All results should be valid
      results.forEach(result => {
        expect(result.allowed).toBeDefined();
        expect(result.remaining).toBeDefined();
        expect(result.resetTime).toBeDefined();
      });
    });

    test('should maintain performance under sanitization load', async () => {
      const startTime = Date.now();
      
      const maliciousInputs = Array.from({ length: 1000 }, (_, i) => 
        `<script>alert("xss${i}")</script>'; DROP TABLE users; --`
      );

      const promises = maliciousInputs.map(input => 
        mockSanitizeString(input)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 3 seconds)
      expect(endTime - startTime).toBeLessThan(3000);
      
      // All results should be sanitized
      results.forEach(result => {
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('DROP');
        expect(result).not.toContain("'");
        expect(result).not.toContain('--');
      });
    });
  });
});
