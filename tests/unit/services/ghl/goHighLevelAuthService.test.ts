// Tests for GoHighLevel Authentication Service

import { GoHighLevelAuthService } from '@/services/ghl/goHighLevelAuthService';
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
      }))
    }))
  }
}));

vi.mock('../../../src/services/ghl/goHighLevelUtils', () => ({
  GHLRateLimiter: {
    enforceRateLimit: vi.fn(),
    handleRateLimitError: vi.fn()
  },
  GHLValidator: {
    validateLocationId: vi.fn(() => true),
    validateToken: vi.fn(() => true)
  }
}));

describe('GoHighLevelAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset static properties
    (GoHighLevelAuthService as any).agencyToken = null;
    (GoHighLevelAuthService as any).locationTokens = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const clientId = 'test-client-id';
      const redirectUri = 'https://example.com/callback';
      const scopes = ['contacts.readonly', 'opportunities.readonly'];

      const url = GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, scopes);

      expect(url).toContain('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`client_id=${clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain('scope=contacts.readonly+opportunities.readonly');
    });

    it('should handle empty scopes array', () => {
      const clientId = 'test-client-id';
      const redirectUri = 'https://example.com/callback';

      const url = GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, []);

      expect(url).toContain('scope=');
    });
  });

  describe('exchangeCodeForToken', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should exchange code for token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          locationId: 'test-location-id',
          expires_in: 3600,
          scope: 'contacts.readonly',
          userType: 'Company',
          locationName: 'Test Location'
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelAuthService.exchangeCodeForToken(
        'test-code',
        'test-client-id',
        'test-client-secret',
        'https://example.com/callback'
      );

      expect(result).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        locationId: 'test-location-id',
        expires_in: 3600,
        scope: 'contacts.readonly',
        userType: 'Company',
        locationName: 'Test Location'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://services.leadconnectorhq.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: expect.any(URLSearchParams)
        })
      );
    });

    it('should throw error when token exchange fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          error: 'invalid_grant',
          message: 'Invalid authorization code'
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        GoHighLevelAuthService.exchangeCodeForToken(
          'invalid-code',
          'test-client-id',
          'test-client-secret',
          'https://example.com/callback'
        )
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should throw error when no access token received', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          refresh_token: 'test-refresh-token',
          locationId: 'test-location-id'
          // Missing access_token
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        GoHighLevelAuthService.exchangeCodeForToken(
          'test-code',
          'test-client-id',
          'test-client-secret',
          'https://example.com/callback'
        )
      ).rejects.toThrow('No access token received from GoHighLevel');
    });

    it('should throw error when no location ID received', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token'
          // Missing locationId
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        GoHighLevelAuthService.exchangeCodeForToken(
          'test-code',
          'test-client-id',
          'test-client-secret',
          'https://example.com/callback'
        )
      ).rejects.toThrow('No location ID received from GoHighLevel');
    });
  });

  describe('setAgencyToken', () => {
    it('should set agency token successfully', () => {
      const token = 'pit-test-token';

      expect(() => GoHighLevelAuthService.setAgencyToken(token)).not.toThrow();
    });

    it('should throw error for invalid token', () => {
      const { GHLValidator } = require('../../../src/services/ghl/goHighLevelUtils');
      GHLValidator.validateToken.mockReturnValue(false);

      expect(() => GoHighLevelAuthService.setAgencyToken('invalid-token')).toThrow('Invalid agency token format');
    });
  });

  describe('setCredentials', () => {
    it('should set credentials successfully', () => {
      const accessToken = 'test-access-token';
      const locationId = 'test-location-id';

      expect(() => GoHighLevelAuthService.setCredentials(accessToken, locationId)).not.toThrow();
    });

    it('should throw error for invalid credentials', () => {
      const { GHLValidator } = require('../../../src/services/ghl/goHighLevelUtils');
      GHLValidator.validateToken.mockReturnValue(false);
      GHLValidator.validateLocationId.mockReturnValue(false);

      expect(() => GoHighLevelAuthService.setCredentials('', '')).toThrow('Invalid credentials format');
    });
  });

  describe('getLocationToken', () => {
    it('should return null when no token is set', () => {
      const token = GoHighLevelAuthService.getLocationToken('test-location-id');
      expect(token).toBeNull();
    });

    it('should return token when set', () => {
      const accessToken = 'test-access-token';
      const locationId = 'test-location-id';

      GoHighLevelAuthService.setCredentials(accessToken, locationId);
      const token = GoHighLevelAuthService.getLocationToken(locationId);

      expect(token).toBe(accessToken);
    });
  });

  describe('testAgencyToken', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should test agency token successfully', async () => {
      const mockAccountResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          account: { id: 'test-account-id', name: 'Test Account' }
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

      const result = await GoHighLevelAuthService.testAgencyToken('pit-test-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Agency token is valid');
      expect(result.locations).toHaveLength(2);
      expect(result.capabilities).toEqual({
        canListLocations: true,
        canAccessContacts: false
      });
    });

    it('should handle invalid token format', async () => {
      const { GHLValidator } = require('../../../src/services/ghl/goHighLevelUtils');
      GHLValidator.validateToken.mockReturnValue(false);

      const result = await GoHighLevelAuthService.testAgencyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid token format. Private integration tokens should start with "pit-"');
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          error: 'invalid_token'
        })
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GoHighLevelAuthService.testAgencyToken('pit-test-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid_token');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true (placeholder implementation)', () => {
      const result = GoHighLevelAuthService.verifyWebhookSignature();
      expect(result).toBe(true);
    });
  });
});
