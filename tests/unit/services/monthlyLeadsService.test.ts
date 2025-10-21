/**
 * Test for Monthly Leads Service
 * Tests the core functionality of fetching monthly leads data
 */

import { MonthlyLeadsService } from '@/services/data/monthlyLeadsService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock debug logger
vi.mock('@/lib/debug', () => ({
  debugLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the API services with proper structure
vi.mock('@/services/api/facebookAdsService', () => ({
  FacebookAdsService: {
    getInsights: vi.fn(),
  },
}));

vi.mock('@/services/api/googleAdsService', () => ({
  GoogleAdsService: {
    searchStream: vi.fn(),
  },
}));

describe('MonthlyLeadsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMonthlyLeads', () => {
    it('should return empty array when no accounts are connected', async () => {
      const result = await MonthlyLeadsService.getMonthlyLeads({
        clientId: 'test-client',
        facebookAdAccountId: undefined,
        googleCustomerId: undefined
      });

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
      
      vi.mocked(FacebookAdsService.getInsights).mockRejectedValue(new Error('API Error'));

      const result = await MonthlyLeadsService.getMonthlyLeads({
        clientId: 'test-client',
        facebookAdAccountId: 'test-fb-account',
        googleCustomerId: undefined
      });

      // Should return empty array when API fails
      expect(result).toEqual([]);
    });

    it('should combine data from both platforms correctly', async () => {
      const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
      const { GoogleAdsService } = await import('@/services/api/googleAdsService');

      // Mock Facebook data
      vi.mocked(FacebookAdsService.getInsights).mockResolvedValue({
        data: [
          {
            date_start: '2025-06-01',
            date_stop: '2025-06-30',
            actions: [
              { action_type: 'lead', value: '10' }
            ]
          }
        ]
      });

      // Mock Google data
      vi.mocked(GoogleAdsService.searchStream).mockResolvedValue([
        {
          segments: { month: '2025-06' },
          metrics: { conversions: '5' }
        }
      ]);

      const result = await MonthlyLeadsService.getMonthlyLeads({
        clientId: 'test-client',
        facebookAdAccountId: 'test-fb-account',
        googleCustomerId: 'test-google-customer'
      });

      expect(result).toHaveLength(1);
      expect(result[0].month).toBe('2025-06');
      expect(result[0].facebookLeads).toBe(10);
      expect(result[0].googleLeads).toBe(5);
      expect(result[0].totalLeads).toBe(15);
    });
  });
});
