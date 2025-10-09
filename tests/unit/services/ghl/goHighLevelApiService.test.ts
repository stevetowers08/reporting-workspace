// Tests for GoHighLevel API Service

import { GoHighLevelApiService } from '@/services/ghl/goHighLevelApiService';
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      upsert: vi.fn(() => ({
        onConflict: vi.fn()
      }))
    }))
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelAuthService', () => ({
  GoHighLevelAuthService: {
    ensureAgencyToken: vi.fn(),
    getAgencyToken: vi.fn(() => 'test-agency-token'),
    setCredentials: vi.fn(),
    getLocationToken: vi.fn(() => 'test-location-token')
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelUtils', () => ({
  GHLRateLimiter: {
    enforceRateLimit: vi.fn(),
    handleRateLimitError: vi.fn()
  },
  GHLQueryBuilder: {
    buildPaginationQuery: vi.fn(() => '?limit=100&offset=0'),
    buildContactQuery: vi.fn(() => '?startDate=2024-01-01')
  }
}));

describe('GoHighLevelApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCampaigns', () => {
    it('should fetch campaigns successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          campaigns: [
            { id: 'campaign-1', name: 'Test Campaign 1', status: 'active' },
            { id: 'campaign-2', name: 'Test Campaign 2', status: 'paused' }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getCampaigns('test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'campaign-1', name: 'Test Campaign 1', status: 'active' });
      expect(result[1]).toEqual({ id: 'campaign-2', name: 'Test Campaign 2', status: 'paused' });
    });

    it('should return empty array when no campaigns', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ campaigns: [] })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getCampaigns('test-location-id');

      expect(result).toEqual([]);
    });

    it('should throw error when API request fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Unauthorized')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GoHighLevelApiService.getCampaigns('test-location-id')).rejects.toThrow('API request failed: Unauthorized');
    });
  });

  describe('getContacts', () => {
    it('should fetch contacts successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          contacts: [
            { id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { id: 'contact-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getContacts('test-location-id', 50, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
    });

    it('should throw error when no location token found', async () => {
      const { GoHighLevelAuthService } = require('../../../src/services/ghl/goHighLevelAuthService');
      GoHighLevelAuthService.getLocationToken.mockReturnValue(null);

      await expect(GoHighLevelApiService.getContacts('test-location-id')).rejects.toThrow('No location token found for location test-location-id');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Forbidden'
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GoHighLevelApiService.getContacts('test-location-id')).rejects.toThrow('Failed to fetch contacts: Forbidden');
    });
  });

  describe('getContactCount', () => {
    it('should get contact count successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          contacts: [
            { id: 'contact-1' },
            { id: 'contact-2' },
            { id: 'contact-3' }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getContactCount('test-location-id', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result).toBe(3);
    });

    it('should return 0 when no contacts found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ contacts: [] })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getContactCount('test-location-id');

      expect(result).toBe(0);
    });

    it('should handle search API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid date range')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GoHighLevelApiService.getContactCount('test-location-id')).rejects.toThrow('Failed to search contacts: Bad Request');
    });
  });

  describe('getFunnels', () => {
    it('should fetch funnels successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { _id: 'funnel-1', name: 'Test Funnel 1', status: 'active' },
          { _id: 'funnel-2', name: 'Test Funnel 2', status: 'draft' }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getFunnels('test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ _id: 'funnel-1', name: 'Test Funnel 1', status: 'active' });
    });

    it('should return empty array when response is not an array', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ funnels: [] })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getFunnels('test-location-id');

      expect(result).toEqual([]);
    });
  });

  describe('getFunnelPages', () => {
    it('should fetch funnel pages successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { _id: 'page-1', name: 'Landing Page', type: 'landing' },
          { _id: 'page-2', name: 'Thank You Page', type: 'thankyou' }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getFunnelPages('funnel-1', 'test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ _id: 'page-1', name: 'Landing Page', type: 'landing' });
    });
  });

  describe('getOpportunities', () => {
    it('should fetch opportunities successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { _id: 'opp-1', title: 'Deal 1', status: 'open', value: 1000 },
          { _id: 'opp-2', title: 'Deal 2', status: 'closed-won', value: 2500 }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getOpportunities('test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ _id: 'opp-1', title: 'Deal 1', status: 'open', value: 1000 });
    });
  });

  describe('getCalendarEvents', () => {
    it('should fetch calendar events successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { _id: 'event-1', title: 'Meeting 1', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' },
          { _id: 'event-2', title: 'Meeting 2', startTime: '2024-01-15T14:00:00Z', endTime: '2024-01-15T15:00:00Z' }
        ])
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.getCalendarEvents('test-location-id');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ _id: 'event-1', title: 'Meeting 1', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' });
    });
  });

  describe('generateLocationToken', () => {
    it('should generate location token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'new-location-token'
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.generateLocationToken('test-location-id');

      expect(result).toBe('new-location-token');
    });

    it('should return null when token generation fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('Access denied')
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelApiService.generateLocationToken('test-location-id');

      expect(result).toBeNull();
    });
  });

  describe('saveLocationToken', () => {
    it('should save location token successfully', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({
        upsert: mockUpsert
      });

      const result = await GoHighLevelApiService.saveLocationToken('test-location-id', 'test-token', ['contacts.readonly']);

      expect(result).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should return false when save fails', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
      supabase.from.mockReturnValue({
        upsert: mockUpsert
      });

      const result = await GoHighLevelApiService.saveLocationToken('test-location-id', 'test-token', ['contacts.readonly']);

      expect(result).toBe(false);
    });
  });

  describe('getValidToken', () => {
    it('should return existing token from memory', async () => {
      const { GoHighLevelAuthService } = require('../../../src/services/ghl/goHighLevelAuthService');
      GoHighLevelAuthService.getLocationToken.mockReturnValue('existing-token');

      const result = await GoHighLevelApiService.getValidToken('test-location-id');

      expect(result).toBe('existing-token');
    });

    it('should load token from database when not in memory', async () => {
      const { GoHighLevelAuthService } = require('../../../src/services/ghl/goHighLevelAuthService');
      const { supabase } = require('@/lib/supabase');
      
      GoHighLevelAuthService.getLocationToken.mockReturnValue(null);
      
      const mockClientData = { data: { id: 'client-1', name: 'Test Client' }, error: null };
      const mockIntegrationData = { 
        data: { 
          config: { 
            tokens: { 
              accessToken: 'db-token' 
            } 
          } 
        }, 
        error: null 
      };

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn()
              .mockResolvedValueOnce(mockClientData)
              .mockResolvedValueOnce(mockIntegrationData)
          })
        })
      });

      const result = await GoHighLevelApiService.getValidToken('test-location-id');

      expect(result).toBe('db-token');
      expect(GoHighLevelAuthService.setCredentials).toHaveBeenCalledWith('db-token', 'test-location-id');
    });
  });
});
