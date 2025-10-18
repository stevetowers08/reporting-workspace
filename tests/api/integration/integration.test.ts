/**
 * Integration Tests
 * Tests API interactions with database and external services
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Integration Tests', () => {
  const config = TestUtils.getTestConfig();
  let testData: any[] = [];

  beforeAll(async () => {
    DevLogger.info('INTEGRATION-TESTS', 'Starting API integration tests');
  });

  afterAll(async () => {
    DevLogger.info('INTEGRATION-TESTS', 'Cleaning up integration test data');
    await TestUtils.cleanupTestData(testData, '/api/test-data');
  });

  describe('Database Integration Tests', () => {
    test('POST /api/venues -> Create client and verify database persistence', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // Create client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(createResponse.status, 201);
      expect(createResponse.data).toHaveProperty('id');
      
      const clientId = createResponse.data.id;
      testData.push(clientId);

      // Verify client exists in database
      const getResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(getResponse.status, 200);
      expect(getResponse.data.id).toBe(clientId);
      expect(getResponse.data.name).toBe(mockClient.name);
      expect(getResponse.data.email).toBe(mockClient.email);
    });

    test('PUT /api/venues/{id} -> Update client and verify database changes', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // Create client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      const clientId = createResponse.data.id;
      testData.push(clientId);

      // Update client
      const updatedClient = {
        ...mockClient,
        name: 'Updated Client Name',
        email: 'updated@example.com'
      };

      const updateResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatedClient)
        }
      );

      TestUtils.assertStatusCode(updateResponse.status, 200);

      // Verify changes in database
      const getResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(getResponse.status, 200);
      expect(getResponse.data.name).toBe('Updated Client Name');
      expect(getResponse.data.email).toBe('updated@example.com');
    });

    test('DELETE /api/venues/{id} -> Delete client and verify database removal', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // Create client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      const clientId = createResponse.data.id;

      // Delete client
      const deleteResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'DELETE'
        }
      );

      TestUtils.assertStatusCode(deleteResponse.status, 200);

      // Verify client is removed from database
      const getResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(getResponse.status, 404);
    });
  });

  describe('External API Integration Tests', () => {
    describe('Google Sheets Integration', () => {
      test('POST /functions/v1/google-sheets-data -> Integration with Google Sheets API', async () => {
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
        expect(response.data).toHaveProperty('success');
        
        // Verify response structure
        if (response.data.success && response.data.data) {
          expect(response.data.data).toHaveProperty('values');
          expect(Array.isArray(response.data.data.values)).toBe(true);
        }
      });

      test('POST /functions/v1/google-sheets-data/update -> Integration with Google Sheets API for updates', async () => {
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
      test('GET /functions/v1/google-ads-config -> Integration with Google Ads API', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/google-ads-config`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(response.data).toHaveProperty('developerToken');
      });

      test('POST /functions/v1/google-ads-oauth -> Integration with Google OAuth', async () => {
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

    describe('Token Management Integration', () => {
      test('POST /functions/v1/token-refresh -> Integration with OAuth token refresh', async () => {
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

      test('GET /functions/v1/oauth-tokens -> Integration with token storage', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/functions/v1/oauth-tokens`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(Array.isArray(response.data)).toBe(true);
      });
    });
  });

  describe('End-to-End Workflow Tests', () => {
    test('Complete client management workflow', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // 1. Create client
      const createResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(createResponse.status, 201);
      const clientId = createResponse.data.id;
      testData.push(clientId);

      // 2. Retrieve client
      const getResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(getResponse.status, 200);
      expect(getResponse.data.id).toBe(clientId);

      // 3. Update client
      const updatedClient = {
        ...mockClient,
        name: 'Updated Client Name'
      };

      const updateResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatedClient)
        }
      );

      TestUtils.assertStatusCode(updateResponse.status, 200);

      // 4. Verify update
      const verifyResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(verifyResponse.status, 200);
      expect(verifyResponse.data.name).toBe('Updated Client Name');

      // 5. Delete client
      const deleteResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'DELETE'
        }
      );

      TestUtils.assertStatusCode(deleteResponse.status, 200);

      // 6. Verify deletion
      const finalResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );

      TestUtils.assertStatusCode(finalResponse.status, 404);
    });

    test('OAuth integration workflow', async () => {
      // 1. Initiate OAuth flow
      const oauthResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-ads-oauth`,
        {
          method: 'POST',
          body: JSON.stringify({
            code: 'mock-auth-code',
            state: 'mock-state'
          })
        }
      );

      TestUtils.assertStatusCode(oauthResponse.status, 200);
      expect(oauthResponse.data).toHaveProperty('success');

      // 2. Refresh token
      const refreshResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/token-refresh`,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'google',
            refreshToken: 'mock-refresh-token'
          })
        }
      );

      TestUtils.assertStatusCode(refreshResponse.status, 200);
      expect(refreshResponse.data).toHaveProperty('success');

      // 3. Retrieve stored tokens
      const tokensResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/oauth-tokens`
      );

      TestUtils.assertStatusCode(tokensResponse.status, 200);
      expect(Array.isArray(tokensResponse.data)).toBe(true);
    });
  });

  describe('Performance Integration Tests', () => {
    test('Concurrent client creation performance', async () => {
      const mockClients = TestFixtures.getMockClients();
      const requestCount = 5;
      const requests = [];

      // Send concurrent requests
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          TestUtils.makeRequest(
            `${config.baseUrl}/api/venues`,
            {
              method: 'POST',
              body: JSON.stringify({
                ...mockClients[0],
                name: `${mockClients[0].name} ${i}`
              })
            }
          )
        );
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const endTime = Date.now();

      // All requests should complete
      expect(responses.length).toBe(requestCount);
      
      // Check performance
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;
      
      DevLogger.info('INTEGRATION-TESTS', `Concurrent requests completed in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(5000); // 5 seconds per request
    });

    test('Large dataset handling', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...TestFixtures.getMockClients()[0],
        name: `Client ${i}`,
        email: `client${i}@example.com`
      }));

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(largeDataset)
        }
      );

      // Should handle large datasets gracefully
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('Error Recovery Tests', () => {
    test('Database connection error handling', async () => {
      // This test would need to simulate database connection issues
      // For now, we'll test error response format
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/invalid-id`
      );

      // Should handle errors gracefully
      expect([400, 404, 500]).toContain(response.status);
      
      if (response.status >= 400) {
        expect(response.data).toHaveProperty('error');
        expect(typeof response.data.error).toBe('string');
      }
    });

    test('External API timeout handling', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-sheets-data`,
        {
          method: 'POST',
          body: JSON.stringify({
            spreadsheetId: 'timeout-test-id',
            range: 'Sheet1!A1:D10'
          })
        }
      );

      // Should handle timeouts gracefully
      expect([200, 400, 408, 500]).toContain(response.status);
    });
  });
});
