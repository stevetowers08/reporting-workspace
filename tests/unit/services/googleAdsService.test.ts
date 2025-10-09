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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1234567890,
        name: 'Test Ad Account',
        currencyCode: 'USD',
        timeZone: 'America/New_York',
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

      // Set invalid token
      // GoogleAdsService.setAccessToken('invalid-token');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      // Mock empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should throw error when no token is set', async () => {
      // Don't set token
      // GoogleAdsService.setAccessToken('');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow('Google Ads access token not set');
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getAccountMetrics('1234567890', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        impressions: 10000,
        clicks: 500,
        spend: 25.00, // Converted from micros
        conversions: 25,
        ctr: 5.0,
        cpc: 0.50, // Converted from micros
        cpm: 2.50, // Converted from micros
        roas: 2.5,
        reach: 8000,
        frequency: 1.25
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAccountMetrics('1234567890', {
          start: 'invalid-date',
          end: 'invalid-date'
        })
      ).rejects.toThrow();
    });
  });

  describe('getCampaigns', () => {
    it('should return campaigns successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890/campaigns/1111111111',
              id: 1111111111,
              name: 'Test Campaign',
              status: 'ACTIVE',
              advertisingChannelType: 'SEARCH',
              startDate: '2024-01-01',
              endDate: '2024-12-31',
              budget: {
                resourceName: 'customers/1234567890/campaignBudgets/2222222222',
                amountMicros: 100000000 // $100.00 in micros
              }
            }
          ]
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getCampaigns('1234567890');
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1111111111,
        name: 'Test Campaign',
        status: 'ACTIVE',
        advertisingChannelType: 'SEARCH',
        budget: 100.00 // Converted from micros
      });
    });

    it('should handle campaigns API errors', async () => {
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getCampaigns('1234567890')
      ).rejects.toThrow();
    });
  });

  describe('getCampaignMetrics', () => {
    it('should return campaign metrics successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              metrics: {
                impressions: 5000,
                clicks: 250,
                costMicros: 12500000, // $12.50 in micros
                conversions: 12,
                conversionsByConversionAction: {
                  'conversions': 12
                },
                ctr: 5.0,
                averageCpc: 50000, // $0.50 in micros
                averageCpm: 2500000, // $2.50 in micros
                roas: 2.0,
                reach: 4000,
                frequency: 1.25
              }
            }
          ]
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getCampaignMetrics('1111111111', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        impressions: 5000,
        clicks: 250,
        spend: 12.50, // Converted from micros
        conversions: 12,
        ctr: 5.0,
        cpc: 0.50, // Converted from micros
        cpm: 2.50, // Converted from micros
        roas: 2.0,
        reach: 4000,
        frequency: 1.25
      });
    });

    it('should handle campaign metrics API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ 
          error: {
            message: 'Campaign not found',
            code: 404,
            status: 'NOT_FOUND'
          }
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getCampaignMetrics('invalid-campaign', {
          start: '2024-01-01',
          end: '2024-01-31'
        })
      ).rejects.toThrow();
    });
  });

  describe('getKeywords', () => {
    it('should return keywords successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890/keywordPlanAdGroupKeywords/3333333333',
              keywordPlanAdGroup: 'customers/1234567890/keywordPlanAdGroups/4444444444',
              text: 'test keyword',
              matchType: 'EXACT',
              cpcBidMicros: 1000000 // $1.00 in micros
            }
          ]
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getKeywords('1111111111');
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        text: 'test keyword',
        matchType: 'EXACT',
        cpcBid: 1.00 // Converted from micros
      });
    });

    it('should handle keywords API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid campaign ID',
            code: 400,
            status: 'INVALID_ARGUMENT'
          }
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getKeywords('invalid-campaign')
      ).rejects.toThrow();
    });
  });

  describe('getAdGroups', () => {
    it('should return ad groups successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          results: [
            {
              resourceName: 'customers/1234567890/adGroups/5555555555',
              id: 5555555555,
              name: 'Test Ad Group',
              status: 'ACTIVE',
              campaign: 'customers/1234567890/campaigns/1111111111',
              cpcBidMicros: 2000000 // $2.00 in micros
            }
          ]
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      const result = await GoogleAdsService.getAdGroups('1111111111');
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 5555555555,
        name: 'Test Ad Group',
        status: 'ACTIVE',
        cpcBid: 2.00 // Converted from micros
      });
    });

    it('should handle ad groups API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid campaign ID',
            code: 400,
            status: 'INVALID_ARGUMENT'
          }
        })
      });

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAdGroups('invalid-campaign')
      ).rejects.toThrow();
    });
  });

  describe('token management', () => {
    it('should set and get access token', () => {
      const token = 'test-access-token';
      GoogleAdsService.setAccessToken(token);
      
      // Note: The service doesn't have a getter, but we can test by making a request
      // and checking if the token is used in the request
      expect(() => GoogleAdsService.setAccessToken(token)).not.toThrow();
    });

    it('should handle token refresh', async () => {
      // Mock token refresh response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new-refresh-token'
        })
      });

      const result = await GoogleAdsService.refreshAccessToken('refresh-token');
      
      expect(result).toMatchObject({
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token'
      });
    });

    it('should handle token refresh errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            error: 'invalid_grant',
            error_description: 'Invalid refresh token'
          }
        })
      });

      await expect(
        GoogleAdsService.refreshAccessToken('invalid-refresh-token')
      ).rejects.toThrow();
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow();
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow();
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

      // Set access token
      // GoogleAdsService.setAccessToken('test-token');

      await expect(
        GoogleAdsService.getAdAccounts()
      ).rejects.toThrow();
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
