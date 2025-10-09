// Integration Tests for GoHighLevel OAuth Flow

import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
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

describe('GoHighLevel OAuth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete OAuth Flow', () => {
    it('should handle complete OAuth flow from authorization to token exchange', async () => {
      // Step 1: Generate authorization URL
      const clientId = 'test-client-id';
      const redirectUri = 'https://example.com/callback';
      const scopes = ['contacts.readonly', 'opportunities.readonly'];

      const authUrl = GoHighLevelService.getAuthorizationUrl(clientId, redirectUri, scopes);

      expect(authUrl).toContain('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain(`client_id=${clientId}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(authUrl).toContain('scope=contacts.readonly+opportunities.readonly');

      // Step 2: Mock token exchange response
      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          locationId: 'test-location-id',
          expires_in: 3600,
          scope: 'contacts.readonly opportunities.readonly',
          userType: 'Company',
          locationName: 'Test Location'
        })
      };

      (global.fetch as any).mockResolvedValue(mockTokenResponse);

      // Step 3: Exchange code for token
      const tokenData = await GoHighLevelService.exchangeCodeForToken(
        'test-authorization-code',
        clientId,
        'test-client-secret',
        redirectUri
      );

      expect(tokenData).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        locationId: 'test-location-id',
        expires_in: 3600,
        scope: 'contacts.readonly opportunities.readonly',
        userType: 'Company',
        locationName: 'Test Location'
      });

      // Step 4: Set credentials for future API calls
      GoHighLevelService.setCredentials(tokenData.access_token, tokenData.locationId);

      // Step 5: Test API call with the token
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          contacts: [
            { id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
          ]
        })
      };

      (global.fetch as any).mockResolvedValue(mockApiResponse);

      const contacts = await GoHighLevelService.getContacts(tokenData.locationId);

      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    it('should handle OAuth errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          error: 'invalid_grant',
          error_description: 'The provided authorization grant is invalid'
        })
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      await expect(
        GoHighLevelService.exchangeCodeForToken(
          'invalid-code',
          'test-client-id',
          'test-client-secret',
          'https://example.com/callback'
        )
      ).rejects.toThrow('The provided authorization grant is invalid');
    });

    it('should handle network errors during token exchange', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(
        GoHighLevelService.exchangeCodeForToken(
          'test-code',
          'test-client-id',
          'test-client-secret',
          'https://example.com/callback'
        )
      ).rejects.toThrow('Network error');
    });
  });

  describe('Token Management Integration', () => {
    it('should manage agency tokens and location tokens correctly', async () => {
      // Set agency token
      const agencyToken = 'pit-test-agency-token';
      GoHighLevelService.setAgencyToken(agencyToken);

      // Mock successful API responses
      const mockAccountResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          account: { id: 'test-account-id', name: 'Test Account', companyId: 'test-company-id' }
        })
      };

      const mockLocationsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { id: 'location-1', name: 'Location 1' },
          { id: 'location-2', name: 'Location 2' }
        ])
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockAccountResponse)
        .mockResolvedValueOnce(mockLocationsResponse);

      // Test agency token
      const testResult = await GoHighLevelService.testAgencyToken(agencyToken);

      expect(testResult.success).toBe(true);
      expect(testResult.message).toBe('Agency token is valid');
      expect(testResult.locations).toHaveLength(2);

      // Get account info
      const accountInfo = await GoHighLevelService.getAccountInfo();

      expect(accountInfo).toEqual({
        id: 'test-account-id',
        name: 'Test Account',
        companyId: 'test-company-id'
      });
    });

    it('should handle token validation errors', async () => {
      const invalidToken = 'invalid-token';

      const testResult = await GoHighLevelService.testAgencyToken(invalidToken);

      expect(testResult.success).toBe(false);
      expect(testResult.message).toBe('Invalid token format. Private integration tokens should start with "pit-"');
    });
  });

  describe('API Integration with OAuth', () => {
    it('should make API calls using location tokens', async () => {
      const locationId = 'test-location-id';
      const locationToken = 'test-location-token';

      // Set location credentials
      GoHighLevelService.setCredentials(locationToken, locationId);

      // Mock API responses
      const mockCampaignsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          campaigns: [
            { id: 'campaign-1', name: 'Test Campaign', status: 'active', spent: 1000, conversions: 10 }
          ]
        })
      };

      const mockContactsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          contacts: [
            { id: 'contact-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
          ]
        })
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockCampaignsResponse)
        .mockResolvedValueOnce(mockContactsResponse);

      // Test API calls
      const campaigns = await GoHighLevelService.getCampaigns(locationId);
      const contacts = await GoHighLevelService.getContacts(locationId);

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0]).toEqual({
        id: 'campaign-1',
        name: 'Test Campaign',
        status: 'active',
        spent: 1000,
        conversions: 10
      });

      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    it('should handle API errors with proper error messages', async () => {
      const locationId = 'test-location-id';
      const locationToken = 'test-location-token';

      GoHighLevelService.setCredentials(locationToken, locationId);

      const mockErrorResponse = {
        ok: false,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('Access denied')
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      await expect(GoHighLevelService.getCampaigns(locationId)).rejects.toThrow('API request failed: Forbidden');
    });
  });

  describe('Analytics Integration', () => {
    it('should aggregate metrics from multiple API calls', async () => {
      const locationId = 'test-location-id';
      const locationToken = 'test-location-token';

      GoHighLevelService.setCredentials(locationToken, locationId);

      // Mock all API responses
      const mockResponses = {
        contacts: {
          ok: true,
          json: vi.fn().mockResolvedValue({
            contacts: [
              { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
              { id: 'contact-2', firstName: 'Jane', lastName: 'Smith' }
            ]
          })
        },
        campaigns: {
          ok: true,
          json: vi.fn().mockResolvedValue({
            campaigns: [
              { id: 'campaign-1', status: 'active', spent: 1000, conversions: 10 },
              { id: 'campaign-2', status: 'paused', spent: 500, conversions: 5 }
            ]
          })
        },
        funnels: {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { _id: 'funnel-1', name: 'Test Funnel' }
          ])
        },
        opportunities: {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { _id: 'opp-1', status: 'open', value: 1000 },
            { _id: 'opp-2', status: 'closed-won', value: 2500 }
          ])
        },
        calendar: {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { _id: 'event-1', status: 'confirmed', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z' }
          ])
        }
      };

      // Mock fetch to return different responses based on URL
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/contacts')) return Promise.resolve(mockResponses.contacts);
        if (url.includes('/campaigns')) return Promise.resolve(mockResponses.campaigns);
        if (url.includes('/funnels')) return Promise.resolve(mockResponses.funnels);
        if (url.includes('/opportunities')) return Promise.resolve(mockResponses.opportunities);
        if (url.includes('/calendars')) return Promise.resolve(mockResponses.calendar);
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      const metrics = await GoHighLevelService.getGHLMetrics(locationId);

      expect(metrics).toEqual({
        contacts: expect.objectContaining({
          total: expect.any(Number),
          newThisMonth: expect.any(Number),
          growthRate: expect.any(Number)
        }),
        campaigns: expect.objectContaining({
          total: 2,
          active: 1,
          totalSpent: 1500,
          totalConversions: 15
        }),
        funnels: expect.any(Array),
        pages: expect.any(Array),
        opportunities: expect.objectContaining({
          totalOpportunities: 2,
          totalValue: 3500,
          averageDealSize: 1750,
          conversionRate: 50
        }),
        calendars: expect.objectContaining({
          totalEvents: 1,
          eventsByStatus: { confirmed: 1 },
          averageEventDuration: 1
        })
      });
    });
  });
});
