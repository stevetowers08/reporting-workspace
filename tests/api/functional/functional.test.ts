/**
 * Functional API Tests
 * Tests core API functionality and endpoints
 */

import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Functional Tests', () => {
  const config = TestUtils.getTestConfig();
  let testData: any[] = [];

  beforeAll(async () => {
    console.log('FUNCTIONAL-TESTS: Starting functional API tests');
  });

  afterAll(async () => {
    console.log('FUNCTIONAL-TESTS: Cleaning up functional test data');
    await TestUtils.cleanupTestData(testData, '/api/test-data');
  });

  describe('Supabase Edge Functions', () => {
    describe('Google Sheets Integration', () => {
      test('GET /functions/v1/google-sheets-data -> 200 OK with valid request', async () => {
        const mockData = TestFixtures.getMockSheetsData();
        
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/google-sheets-data`,
          {
            method: 'POST',
            body: JSON.stringify({
              spreadsheetId: mockData.spreadsheetId,
              range: mockData.range
            })
          }
        );

        TestUtils.assertStatusCode(response.status, 200);
        TestUtils.assertResponseTime(response.responseTime, 5000);
        
        expect(response.data).toHaveProperty('success');
        expect(response.data.success).toBe(true);
      });

      test('POST /functions/v1/google-sheets-data/update -> 200 OK with valid data', async () => {
        const mockData = TestFixtures.getMockSheetsData();
        
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/google-sheets-data/update`,
          {
            method: 'POST',
            body: JSON.stringify({
              spreadsheetId: mockData.spreadsheetId,
              range: 'Sheet1!A1:B2',
              values: [['Updated Name', 'Updated Email']]
            })
          }
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('success');
      });
    });

    describe('Google Ads Integration', () => {
      test('GET /functions/v1/google-ads-config -> 200 OK', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/google-ads-config`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('developerToken');
      });

      test('POST /functions/v1/google-ads-oauth -> 200 OK with valid code', async () => {
        const mockOAuthData = TestFixtures.getMockOAuthResponses().google;
        
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/google-ads-oauth`,
          {
            method: 'POST',
            body: JSON.stringify({
              code: 'mock-auth-code',
              state: 'mock-state'
            })
          }
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('success');
      });
    });

    describe('Token Management', () => {
      test('POST /functions/v1/token-refresh -> 200 OK with valid token', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/token-refresh`,
          {
            method: 'POST',
            body: JSON.stringify({
              platform: 'google',
              refreshToken: 'mock-refresh-token'
            })
          }
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('success');
      });

      test('GET /functions/v1/oauth-tokens -> 200 OK', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/oauth-tokens`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(Array.isArray(response.data)).toBe(true);
      });
    });

    describe('PDF Generation', () => {
      test('POST /functions/v1/generate-pdf -> 200 OK with valid request', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/generate-pdf`,
          {
            method: 'POST',
            body: JSON.stringify({
              url: 'https://example.com',
              clientName: 'Test Client',
              dateRange: '2024-01-01 to 2024-01-31',
              tabs: ['overview', 'campaigns']
            })
          }
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('success');
      });
    });
  });

  describe('Client Management API', () => {
    test('GET /api/venues -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('POST /api/venues -> 201 Created with valid data', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 201);
      expect(response.data).toHaveProperty('id');
      
      // Store for cleanup
      testData.push(response.data.id);
    });

    test('GET /api/venues/{id} -> 200 OK with valid ID', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // First create a client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      const clientId = createResponse.data.id;
      testData.push(clientId);

      // Then retrieve it
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(response.data).toHaveProperty('id', clientId);
    });

    test('PUT /api/venues/{id} -> 200 OK with valid data', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // First create a client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      const clientId = createResponse.data.id;
      testData.push(clientId);

      // Then update it
      const updatedClient = { ...mockClient, name: 'Updated Client Name' };
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatedClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(response.data).toHaveProperty('name', 'Updated Client Name');
    });

    test('DELETE /api/venues/{id} -> 200 OK with valid ID', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // First create a client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      const clientId = createResponse.data.id;

      // Then delete it
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'DELETE'
        }
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(response.data).toHaveProperty('success', true);
    });
  });

  describe('Integration APIs', () => {
    test('GET /api/google-ads/accounts -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/google-ads/accounts`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/facebook-ads/accounts -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/facebook-ads/accounts`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/ghl/locations -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/ghl/locations`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /api/google-sheets/spreadsheets -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/google-sheets/spreadsheets`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('OAuth Callback', () => {
    test('GET /oauth/callback -> 200 OK with valid parameters', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/oauth/callback?code=mock-code&state=mock-state`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(response.data).toHaveProperty('success');
    });
  });
});
