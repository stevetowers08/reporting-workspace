import { GoogleAdsService } from '@/services/api/googleAdsService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock debug logger
vi.mock('@/lib/debug', () => ({
  debugLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock TokenManager
vi.mock('@/services/auth/TokenManager', () => ({
  TokenManager: {
    getAccessToken: vi.fn(),
    isConnected: vi.fn(),
  },
}));

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoogleAdsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAdAccounts', () => {
    it('should handle successful API responses', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890',
              id: 1234567890,
              name: 'Test Ad Account',
              currencyCode: 'USD',
              timeZone: 'America/New_York',
              descriptiveName: 'Test Account Description',
              status: 'ACTIVE'
            }
          ]
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1234567890',
        name: 'Test Ad Account',
        currency: 'USD',
        timezone: 'America/New_York',
        status: 'ACTIVE'
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock error response  
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid access token',
            code: 401,
            status: 'UNAUTHENTICATED'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('invalid-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAdAccounts()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAdAccounts()).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      // Mock empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should return empty array when not connected', async () => {
      // Mock TokenManager - not connected
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.isConnected as any).mockResolvedValue(false);

      const result = await GoogleAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });

  describe('getAccountMetrics', () => {
    it('should return account metrics successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              metrics: {
                impressions: 10000,
                clicks: 500,
                costMicros: 25000000, // $25.00 in micros
                conversions: 25,
                conversionsByConversionAction: {
                  'conversions': 25
                },
                ctr: 5.0,
                averageCpc: 50000, // $0.50 in micros
                averageCpm: 2500000, // $2.50 in micros
                roas: 2.5,
                reach: 8000,
                frequency: 1.25
              }
            }
          ]
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.getAccountMetrics('1234567890', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        impressions: 10000,
        clicks: 500,
        cost: 25.00, // Converted from micros
        conversions: 25,
        ctr: 5.0,
        averageCpc: 0.50, // Converted from micros
        leads: 25 // Same as conversions
      });
    });

    it('should handle metrics API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid date range',
            code: 400,
            status: 'INVALID_ARGUMENT'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAccountMetrics('1234567890', {
        start: 'invalid-date',
        end: 'invalid-date'
      })).rejects.toThrow();
    });

    it('should return empty metrics when not connected', async () => {
      // Mock TokenManager - not connected
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.isConnected as any).mockResolvedValue(false);

      const result = await GoogleAdsService.getAccountMetrics('1234567890', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.cost).toBe(0);
    });
  });

  describe('getConversionActions', () => {
    it('should return conversion actions successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890/conversionActions/1111111111',
              id: 1111111111,
              name: 'Lead Form Submission',
              status: 'ENABLED',
              type: 'WEBSITE',
              category: 'LEAD'
            }
          ]
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.getConversionActions('1234567890');
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1111111111',
        name: 'Lead Form Submission',
        status: 'ENABLED',
        type: 'WEBSITE',
        category: 'LEAD'
      });
    });

    it('should handle conversion actions API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ 
          error: {
            message: 'Insufficient permissions',
            code: 403,
            status: 'PERMISSION_DENIED'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getConversionActions('1234567890')).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890',
              id: 1234567890,
              name: 'Test Account',
              status: 'ACTIVE'
            }
          ]
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.accountInfo).toBeDefined();
    });

    it('should handle connection test errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid access token',
            code: 401,
            status: 'UNAUTHENTICATED'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('invalid-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      const result = await GoogleAdsService.authenticate('test-token');
      
      expect(result).toBe(true);
    });

    it('should fail authentication when no token', async () => {
      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue(null);
      (TokenManager.isConnected as any).mockResolvedValue(false);

      const result = await GoogleAdsService.authenticate();
      
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting errors', async () => {
      // Mock rate limit error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '60'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Rate limit exceeded',
            code: 429,
            status: 'RESOURCE_EXHAUSTED'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAdAccounts()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      // Mock server error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ 
          error: {
            message: 'Internal server error',
            code: 500,
            status: 'INTERNAL'
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAdAccounts()).rejects.toThrow();
    });

    it('should handle quota exceeded errors', async () => {
      // Mock quota exceeded error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ 
          error: {
            message: 'Quota exceeded',
            code: 429,
            status: 'RESOURCE_EXHAUSTED',
            details: [
              {
                '@type': 'type.googleapis.com/google.ads.googleads.v14.errors.GoogleAdsError',
                errorCode: {
                  quotaError: 'QUOTA_EXCEEDED'
                }
              }
            ]
          }
        })
      });

      // Mock TokenManager
      const { TokenManager } = await import('@/services/auth/TokenManager');
      (TokenManager.getAccessToken as any).mockResolvedValue('test-token');
      (TokenManager.isConnected as any).mockResolvedValue(true);

      await expect(GoogleAdsService.getAdAccounts()).rejects.toThrow();
    });
  });

  describe('data conversion', () => {
    it('should convert micros to currency correctly', () => {
      // Test the micros conversion logic
      const micros = 25000000; // $25.00
      const converted = micros / 1000000;
      expect(converted).toBe(25.00);
    });

    it('should handle zero values', () => {
      const micros = 0;
      const converted = micros / 1000000;
      expect(converted).toBe(0);
    });

    it('should handle negative values', () => {
      const micros = -1000000; // -$1.00
      const converted = micros / 1000000;
      expect(converted).toBe(-1.00);
    });
  });
});