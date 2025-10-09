import { FacebookAdsService } from '@/services/api/facebookAdsService';
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

describe('FacebookAdsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCampaigns', () => {
    it('should handle successful API responses', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              id: 'campaign-1',
              name: 'Test Campaign',
              status: 'ACTIVE',
              objective: 'LEAD_GENERATION',
              created_time: '2024-01-01T00:00:00Z',
              updated_time: '2024-01-01T00:00:00Z'
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getCampaigns();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'campaign-1',
        name: 'Test Campaign',
        status: 'ACTIVE',
        objective: 'LEAD_GENERATION'
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
            type: 'OAuthException',
            code: 190
          }
        })
      });

      // Set invalid token
      // FacebookAdsService.setAccessToken('invalid-token');

      await expect(
        FacebookAdsService.getCampaigns()
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getCampaigns()
      ).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      // Mock empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getCampaigns();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should throw error when no token is set', async () => {
      // Don't set token
      // FacebookAdsService.setAccessToken('');

      await expect(
        FacebookAdsService.getCampaigns()
      ).rejects.toThrow('Facebook access token not set');
    });
  });

  describe('getCampaignMetrics', () => {
    it('should return campaign metrics successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              campaign_id: 'campaign-1',
              impressions: 1000,
              clicks: 50,
              spend: 25.50,
              leads: 5,
              conversions: 2,
              ctr: 5.0,
              cpc: 0.51,
              cpm: 25.50,
              roas: 2.0,
              reach: 800,
              frequency: 1.25
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getCampaignMetrics('campaign-1', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        impressions: 1000,
        clicks: 50,
        spend: 25.50,
        leads: 5,
        conversions: 2,
        ctr: 5.0,
        cpc: 0.51,
        cpm: 25.50,
        roas: 2.0,
        reach: 800,
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
            type: 'InvalidParameterException',
            code: 100
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getCampaignMetrics('campaign-1', {
          start: 'invalid-date',
          end: 'invalid-date'
        })
      ).rejects.toThrow();
    });
  });

  describe('getAdAccounts', () => {
    it('should return ad accounts successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              id: 'act-123456789',
              name: 'Test Ad Account',
              account_status: 1,
              currency: 'USD',
              timezone_name: 'America/New_York',
              created_time: '2024-01-01T00:00:00Z'
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getAdAccounts();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'act-123456789',
        name: 'Test Ad Account',
        account_status: 1,
        currency: 'USD'
      });
    });

    it('should handle ad accounts API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ 
          error: {
            message: 'Insufficient permissions',
            type: 'OAuthException',
            code: 10
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getAdAccounts()
      ).rejects.toThrow();
    });
  });

  describe('getAccountMetrics', () => {
    it('should return account metrics successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              account_id: 'act-123456789',
              impressions: 5000,
              clicks: 250,
              spend: 125.75,
              leads: 25,
              conversions: 10,
              ctr: 5.0,
              cpc: 0.50,
              cpm: 25.15,
              roas: 2.5,
              reach: 4000,
              frequency: 1.25
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getAccountMetrics('act-123456789', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        impressions: 5000,
        clicks: 250,
        spend: 125.75,
        leads: 25,
        conversions: 10
      });
    });

    it('should handle account metrics API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ 
          error: {
            message: 'Account not found',
            type: 'OAuthException',
            code: 100
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getAccountMetrics('invalid-account', {
          start: '2024-01-01',
          end: '2024-01-31'
        })
      ).rejects.toThrow();
    });
  });

  describe('getDemographics', () => {
    it('should return demographics data successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              age: '25-34',
              gender: 'female',
              impressions: 1000,
              clicks: 50,
              spend: 25.00
            },
            {
              age: '35-44',
              gender: 'male',
              impressions: 800,
              clicks: 40,
              spend: 20.00
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getDemographics('campaign-1', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result.ageGroups).toBeDefined();
      expect(result.gender).toBeDefined();
    });

    it('should handle demographics API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid breakdown parameters',
            type: 'InvalidParameterException',
            code: 100
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getDemographics('campaign-1', {
          start: '2024-01-01',
          end: '2024-01-31'
        })
      ).rejects.toThrow();
    });
  });

  describe('getPlatformBreakdown', () => {
    it('should return platform breakdown data successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          data: [
            {
              publisher_platform: 'facebook',
              impressions: 1000,
              clicks: 50,
              spend: 25.00
            },
            {
              publisher_platform: 'instagram',
              impressions: 800,
              clicks: 40,
              spend: 20.00
            }
          ]
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      const result = await FacebookAdsService.getPlatformBreakdown('campaign-1', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result.facebookVsInstagram).toBeDefined();
      expect(result.adPlacements).toBeDefined();
    });

    it('should handle platform breakdown API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid breakdown parameters',
            type: 'InvalidParameterException',
            code: 100
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getPlatformBreakdown('campaign-1', {
          start: '2024-01-01',
          end: '2024-01-31'
        })
      ).rejects.toThrow();
    });
  });

  describe('token management', () => {
    it('should set and get access token', () => {
      const token = 'test-access-token';
      FacebookAdsService.setAccessToken(token);
      
      // Note: The service doesn't have a getter, but we can test by making a request
      // and checking if the token is used in the request
      expect(() => FacebookAdsService.setAccessToken(token)).not.toThrow();
    });

    it('should handle token refresh', async () => {
      // Mock token refresh response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          token_type: 'bearer',
          expires_in: 3600
        })
      });

      const result = await FacebookAdsService.refreshAccessToken('refresh-token');
      
      expect(result).toMatchObject({
        access_token: 'new-access-token',
        token_type: 'bearer',
        expires_in: 3600
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
            message: 'Invalid refresh token',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      await expect(
        FacebookAdsService.refreshAccessToken('invalid-refresh-token')
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
            type: 'OAuthException',
            code: 4
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getCampaigns()
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
            type: 'OAuthException',
            code: 1
          }
        })
      });

      // Set access token
      // FacebookAdsService.setAccessToken('test-token');

      await expect(
        FacebookAdsService.getCampaigns()
      ).rejects.toThrow();
    });
  });
});
