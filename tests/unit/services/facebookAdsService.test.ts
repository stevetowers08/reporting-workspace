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
  debugService: {
    call: vi.fn(),
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

  describe('getAccessToken', () => {
    it('should get access token from database', async () => {
      // Mock Supabase response
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-access-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getAccessToken();
      
      expect(result).toBe('test-access-token');
    });

    it('should throw error when no token found', async () => {
      // Mock Supabase response with no data
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' }
        })
      });

      await expect(FacebookAdsService.getAccessToken()).rejects.toThrow('No Facebook integration found in database');
    });
  });

  describe('getAdAccounts', () => {
    it('should return ad accounts successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
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

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

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

    it('should handle API errors gracefully', async () => {
      // Mock error response  
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid access token',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'invalid-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getAdAccounts();
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });

  describe('getAccountMetrics', () => {
    it('should return account metrics successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          data: [
            {
              account_id: 'act-123456789',
              impressions: '5000',
              clicks: '250',
              spend: '125.75',
              actions: [
                { action_type: 'lead', value: '25' },
                { action_type: 'purchase', value: '10' }
              ],
              ctr: '5.0',
              cpc: '0.50',
              cpm: '25.15',
              roas: '2.5',
              reach: '4000',
              frequency: '1.25'
            }
          ]
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

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
        conversions: 25
      });
    });

    it('should handle metrics API errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Account not found',
            type: 'OAuthException',
            code: 100
          }
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      await expect(FacebookAdsService.getAccountMetrics('invalid-account', {
        start: '2024-01-01',
        end: '2024-01-31'
      })).rejects.toThrow();
    });
  });

  describe('getCampaigns', () => {
    it('should return campaigns successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
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

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getCampaigns('act-123456789', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'campaign-1',
        name: 'Test Campaign',
        status: 'ACTIVE',
        objective: 'LEAD_GENERATION'
      });
    });
  });

  describe('getDemographicBreakdown', () => {
    it('should return demographics data successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
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

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getDemographicBreakdown('act-123456789', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result?.ageGroups).toBeDefined();
      expect(result?.gender).toBeDefined();
    });
  });

  describe('getPlatformBreakdown', () => {
    it('should return platform breakdown data successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
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

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getPlatformBreakdown('act-123456789', {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      
      expect(result).toBeDefined();
      expect(result?.facebookVsInstagram).toBeDefined();
      expect(result?.adPlacements).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          id: 'act-123456789',
          name: 'Test Account',
          account_status: 1
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      // Mock the authenticate method
      const authenticateSpy = vi.spyOn(FacebookAdsService, 'authenticate').mockResolvedValue(true);

      const result = await FacebookAdsService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.accountInfo).toBeDefined();
      
      authenticateSpy.mockRestore();
    });

    it('should handle connection test errors', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Invalid access token',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'invalid-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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
          'Retry-After': '60',
          'X-App-Usage-Calls-Made': '100',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Rate limit exceeded',
            type: 'OAuthException',
            code: 4
          }
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      await expect(FacebookAdsService.getAdAccounts()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      // Mock server error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({
          'X-App-Usage-Calls-Made': '10',
          'X-App-Usage-Time-Reset': '1640995200'
        }),
        json: () => Promise.resolve({ 
          error: {
            message: 'Internal server error',
            type: 'OAuthException',
            code: 1
          }
        })
      });

      // Mock Supabase response for token
      const { supabase } = await import('@/lib/supabase');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            config: {
              accessToken: 'test-token'
            }
          },
          error: null
        })
      });

      const result = await FacebookAdsService.getAdAccounts();
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });
});