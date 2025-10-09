// Tests for GoHighLevel Analytics Service

import { GoHighLevelAnalyticsService } from '@/services/ghl/goHighLevelAnalyticsService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/debug', () => ({
  debugLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelApiService', () => ({
  GoHighLevelApiService: {
    getContactCount: vi.fn(),
    getCampaigns: vi.fn(),
    getFunnels: vi.fn(),
    getFunnelPages: vi.fn(),
    getOpportunities: vi.fn(),
    getCalendarEvents: vi.fn()
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelAuthService', () => ({
  GoHighLevelAuthService: {
    ensureAgencyToken: vi.fn(),
    getAgencyToken: vi.fn(() => 'test-agency-token')
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelUtils', () => ({
  GHLRateLimiter: {
    enforceRateLimit: vi.fn()
  }
}));

describe('GoHighLevelAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGHLMetrics', () => {
    it('should aggregate all metrics successfully', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      // Mock all API calls to return successful data
      GoHighLevelApiService.getContactCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25)  // new this month
        .mockResolvedValueOnce(20); // last month
      
      GoHighLevelApiService.getCampaigns.mockResolvedValue([
        { id: 'campaign-1', status: 'active', spent: 1000, conversions: 10 },
        { id: 'campaign-2', status: 'active', spent: 500, conversions: 5 },
        { id: 'campaign-3', status: 'paused', spent: 0, conversions: 0 }
      ]);

      GoHighLevelApiService.getFunnels.mockResolvedValue([
        { _id: 'funnel-1', name: 'Test Funnel' }
      ]);

      GoHighLevelApiService.getFunnelPages.mockResolvedValue([
        { _id: 'page-1', name: 'Landing Page' }
      ]);

      GoHighLevelApiService.getOpportunities.mockResolvedValue([
        { _id: 'opp-1', status: 'open', value: 1000 },
        { _id: 'opp-2', status: 'closed-won', value: 2500 }
      ]);

      GoHighLevelApiService.getCalendarEvents.mockResolvedValue([
        { _id: 'event-1', status: 'confirmed', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' }
      ]);

      const result = await GoHighLevelAnalyticsService.getGHLMetrics('test-location-id');

      expect(result).toEqual({
        contacts: {
          total: 100,
          newThisMonth: 25,
          growthRate: 25 // (25-20)/20 * 100
        },
        campaigns: {
          total: 3,
          active: 2,
          totalSpent: 1500,
          totalConversions: 15
        },
        funnels: expect.any(Array),
        pages: expect.any(Array),
        opportunities: {
          totalOpportunities: 2,
          totalValue: 3500,
          opportunitiesByStatus: { open: 1, 'closed-won': 1 },
          valueByStatus: { open: 1000, 'closed-won': 2500 },
          averageDealSize: 1750,
          conversionRate: 50 // 1 closed-won out of 2 total
        },
        calendars: {
          totalEvents: 1,
          eventsByStatus: { confirmed: 1 },
          averageEventDuration: 1, // 1 hour
          eventsByMonth: { '2024-01': 1 }
        }
      });
    });

    it('should handle partial failures gracefully', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      // Mock some API calls to fail
      GoHighLevelApiService.getContactCount.mockRejectedValue(new Error('API Error'));
      GoHighLevelApiService.getCampaigns.mockResolvedValue([]);
      GoHighLevelApiService.getFunnels.mockResolvedValue([]);
      GoHighLevelApiService.getOpportunities.mockResolvedValue([]);
      GoHighLevelApiService.getCalendarEvents.mockResolvedValue([]);

      const result = await GoHighLevelAnalyticsService.getGHLMetrics('test-location-id');

      expect(result.contacts).toEqual({
        total: 0,
        newThisMonth: 0,
        growthRate: 0
      });
      expect(result.campaigns).toEqual({
        total: 0,
        active: 0,
        totalSpent: 0,
        totalConversions: 0
      });
    });
  });

  describe('getFunnelAnalytics', () => {
    it('should calculate funnel analytics correctly', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getFunnels.mockResolvedValue([
        { _id: 'funnel-1', name: 'Test Funnel' }
      ]);

      GoHighLevelApiService.getFunnelPages.mockResolvedValue([
        { _id: 'page-1', name: 'Landing Page' },
        { _id: 'page-2', name: 'Thank You Page' }
      ]);

      const result = await GoHighLevelAnalyticsService.getFunnelAnalytics('test-location-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'funnel-1',
        name: 'Test Funnel',
        views: expect.any(Number),
        uniqueViews: expect.any(Number),
        conversions: expect.any(Number),
        conversionRate: expect.any(Number),
        pages: expect.any(Array)
      });
    });

    it('should handle funnel errors gracefully', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getFunnels.mockResolvedValue([
        { _id: 'funnel-1', name: 'Test Funnel' }
      ]);

      GoHighLevelApiService.getFunnelPages.mockRejectedValue(new Error('API Error'));

      const result = await GoHighLevelAnalyticsService.getFunnelAnalytics('test-location-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'funnel-1',
        name: 'Test Funnel',
        views: 0,
        uniqueViews: 0,
        conversions: 0,
        conversionRate: 0,
        pages: []
      });
    });
  });

  describe('getPageAnalytics', () => {
    it('should aggregate page analytics from all funnels', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getFunnels.mockResolvedValue([
        { _id: 'funnel-1', name: 'Funnel 1' },
        { _id: 'funnel-2', name: 'Funnel 2' }
      ]);

      GoHighLevelApiService.getFunnelPages
        .mockResolvedValueOnce([{ _id: 'page-1', name: 'Page 1' }])
        .mockResolvedValueOnce([{ _id: 'page-2', name: 'Page 2' }]);

      const result = await GoHighLevelAnalyticsService.getPageAnalytics('test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Page page-1');
      expect(result[1].name).toBe('Page page-2');
    });
  });

  describe('getOpportunitiesAnalytics', () => {
    it('should calculate opportunities analytics correctly', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getOpportunities.mockResolvedValue([
        { _id: 'opp-1', status: 'open', value: 1000 },
        { _id: 'opp-2', status: 'closed-won', value: 2500 },
        { _id: 'opp-3', status: 'closed-lost', value: 500 },
        { _id: 'opp-4', status: 'open', value: 1500 }
      ]);

      const result = await GoHighLevelAnalyticsService.getOpportunitiesAnalytics('test-location-id');

      expect(result).toEqual({
        totalOpportunities: 4,
        totalValue: 5500,
        opportunitiesByStatus: {
          open: 2,
          'closed-won': 1,
          'closed-lost': 1
        },
        valueByStatus: {
          open: 2500,
          'closed-won': 2500,
          'closed-lost': 500
        },
        averageDealSize: 1375, // 5500 / 4
        conversionRate: 25 // 1 closed-won out of 4 total
      });
    });

    it('should handle empty opportunities', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getOpportunities.mockResolvedValue([]);

      const result = await GoHighLevelAnalyticsService.getOpportunitiesAnalytics('test-location-id');

      expect(result).toEqual({
        totalOpportunities: 0,
        totalValue: 0,
        opportunitiesByStatus: {},
        valueByStatus: {},
        averageDealSize: 0,
        conversionRate: 0
      });
    });
  });

  describe('getCalendarAnalytics', () => {
    it('should calculate calendar analytics correctly', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getCalendarEvents.mockResolvedValue([
        { 
          _id: 'event-1', 
          status: 'confirmed', 
          startTime: '2024-01-15T10:00:00Z', 
          endTime: '2024-01-15T11:00:00Z' 
        },
        { 
          _id: 'event-2', 
          status: 'confirmed', 
          startTime: '2024-01-15T14:00:00Z', 
          endTime: '2024-01-15T16:00:00Z' 
        },
        { 
          _id: 'event-3', 
          status: 'cancelled', 
          startTime: '2024-02-01T09:00:00Z', 
          endTime: '2024-02-01T10:00:00Z' 
        }
      ]);

      const result = await GoHighLevelAnalyticsService.getCalendarAnalytics('test-location-id');

      expect(result).toEqual({
        totalEvents: 3,
        eventsByStatus: {
          confirmed: 2,
          cancelled: 1
        },
        averageEventDuration: 1.5, // (1 + 2) / 2 hours
        eventsByMonth: {
          '2024-01': 2,
          '2024-02': 1
        }
      });
    });

    it('should handle events with invalid duration', async () => {
      const { GoHighLevelApiService } = require('../../../src/services/ghl/goHighLevelApiService');
      
      GoHighLevelApiService.getCalendarEvents.mockResolvedValue([
        { 
          _id: 'event-1', 
          status: 'confirmed', 
          startTime: '2024-01-15T10:00:00Z', 
          endTime: '2024-01-15T09:00:00Z' // Invalid: end before start
        }
      ]);

      const result = await GoHighLevelAnalyticsService.getCalendarAnalytics('test-location-id');

      expect(result).toEqual({
        totalEvents: 1,
        eventsByStatus: {
          confirmed: 1
        },
        averageEventDuration: 0, // Invalid duration not counted
        eventsByMonth: {
          '2024-01': 1
        }
      });
    });
  });
});
