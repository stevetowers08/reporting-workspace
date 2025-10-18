/**
 * Test Fixtures and Mock Data
 * Reusable test data for API testing
 */

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'client';
  accessToken: string;
  refreshToken: string;
}

export interface MockClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockCampaign {
  id: string;
  name: string;
  platform: 'facebook' | 'google' | 'ghl';
  budget: number;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
}

export interface MockIntegration {
  id: string;
  platform: 'facebook' | 'google' | 'ghl' | 'sheets';
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  isActive: boolean;
}

export class TestFixtures {
  /**
   * Mock users for testing
   */
  static getMockUsers(): MockUser[] {
    return [
      {
        id: 'test-user-1',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin',
        accessToken: 'mock-admin-token',
        refreshToken: 'mock-admin-refresh'
      },
      {
        id: 'test-user-2',
        email: 'user@test.com',
        name: 'Test User',
        role: 'user',
        accessToken: 'mock-user-token',
        refreshToken: 'mock-user-refresh'
      },
      {
        id: 'test-user-3',
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        accessToken: 'mock-client-token',
        refreshToken: 'mock-client-refresh'
      }
    ];
  }

  /**
   * Mock clients for testing
   */
  static getMockClients(): MockClient[] {
    return [
      {
        id: 'test-client-1',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1234567890',
        industry: 'Technology',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'test-client-2',
        name: 'Beta Industries',
        email: 'info@beta.com',
        phone: '+0987654321',
        industry: 'Manufacturing',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ];
  }

  /**
   * Mock campaigns for testing
   */
  static getMockCampaigns(): MockCampaign[] {
    return [
      {
        id: 'test-campaign-1',
        name: 'Summer Sale Campaign',
        platform: 'facebook',
        budget: 5000,
        status: 'active',
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z'
      },
      {
        id: 'test-campaign-2',
        name: 'Google Search Campaign',
        platform: 'google',
        budget: 3000,
        status: 'paused',
        startDate: '2024-05-01T00:00:00Z',
        endDate: '2024-07-31T23:59:59Z'
      }
    ];
  }

  /**
   * Mock integrations for testing
   */
  static getMockIntegrations(): MockIntegration[] {
    return [
      {
        id: 'test-integration-1',
        platform: 'facebook',
        accessToken: 'mock-facebook-token',
        refreshToken: 'mock-facebook-refresh',
        expiresAt: '2024-12-31T23:59:59Z',
        isActive: true
      },
      {
        id: 'test-integration-2',
        platform: 'google',
        accessToken: 'mock-google-token',
        refreshToken: 'mock-google-refresh',
        expiresAt: '2024-12-31T23:59:59Z',
        isActive: true
      },
      {
        id: 'test-integration-3',
        platform: 'ghl',
        accessToken: 'mock-ghl-token',
        expiresAt: '2024-12-31T23:59:59Z',
        isActive: false
      }
    ];
  }

  /**
   * Mock API responses
   */
  static getMockApiResponses() {
    return {
      success: {
        status: 200,
        data: { success: true, message: 'Operation successful' }
      },
      created: {
        status: 201,
        data: { success: true, id: 'test-id', message: 'Resource created' }
      },
      notFound: {
        status: 404,
        data: { success: false, error: 'Resource not found' }
      },
      unauthorized: {
        status: 401,
        data: { success: false, error: 'Unauthorized' }
      },
      forbidden: {
        status: 403,
        data: { success: false, error: 'Forbidden' }
      },
      badRequest: {
        status: 400,
        data: { success: false, error: 'Bad request' }
      },
      serverError: {
        status: 500,
        data: { success: false, error: 'Internal server error' }
      }
    };
  }

  /**
   * Mock OAuth responses
   */
  static getMockOAuthResponses() {
    return {
      facebook: {
        access_token: 'mock-facebook-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'ads_read,ads_management'
      },
      google: {
        access_token: 'mock-google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-google-refresh-token',
        scope: 'https://www.googleapis.com/auth/adwords'
      },
      ghl: {
        access_token: 'mock-ghl-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'contacts.read,contacts.write'
      }
    };
  }

  /**
   * Mock Google Sheets data
   */
  static getMockSheetsData() {
    return {
      spreadsheetId: 'test-spreadsheet-id',
      range: 'Sheet1!A1:D10',
      values: [
        ['Name', 'Email', 'Phone', 'Status'],
        ['John Doe', 'john@example.com', '+1234567890', 'Active'],
        ['Jane Smith', 'jane@example.com', '+0987654321', 'Inactive'],
        ['Bob Johnson', 'bob@example.com', '+1122334455', 'Active']
      ]
    };
  }

  /**
   * Mock Facebook Ads data
   */
  static getMockFacebookAdsData() {
    return {
      campaigns: [
        {
          id: '123456789',
          name: 'Test Campaign',
          status: 'ACTIVE',
          objective: 'CONVERSIONS',
          budget_remaining: 1000,
          daily_budget: 100
        }
      ],
      adSets: [
        {
          id: '987654321',
          name: 'Test Ad Set',
          status: 'ACTIVE',
          campaign_id: '123456789',
          daily_budget: 50
        }
      ],
      ads: [
        {
          id: '111222333',
          name: 'Test Ad',
          status: 'ACTIVE',
          adset_id: '987654321',
          creative: {
            title: 'Test Ad Title',
            body: 'Test Ad Body'
          }
        }
      ]
    };
  }

  /**
   * Mock Google Ads data
   */
  static getMockGoogleAdsData() {
    return {
      campaigns: [
        {
          resourceName: 'customers/1234567890/campaigns/1111111111',
          name: 'Test Google Campaign',
          status: 'ENABLED',
          type: 'SEARCH',
          budget: {
            resourceName: 'customers/1234567890/campaignBudgets/2222222222',
            amountMicros: '10000000' // $10.00
          }
        }
      ],
      adGroups: [
        {
          resourceName: 'customers/1234567890/adGroups/3333333333',
          name: 'Test Ad Group',
          status: 'ENABLED',
          campaign: 'customers/1234567890/campaigns/1111111111'
        }
      ]
    };
  }

  /**
   * Mock GoHighLevel data
   */
  static getMockGHLData() {
    return {
      locations: [
        {
          id: 'test-location-1',
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          phone: '+1234567890'
        }
      ],
      contacts: [
        {
          id: 'test-contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          locationId: 'test-location-1'
        }
      ],
      campaigns: [
        {
          id: 'test-ghl-campaign-1',
          name: 'Test GHL Campaign',
          status: 'active',
          locationId: 'test-location-1',
          budget: 2000
        }
      ]
    };
  }
}
