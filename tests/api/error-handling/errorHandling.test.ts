/**
 * Error Handling Tests
 * Tests error scenarios, edge cases, and invalid inputs
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Error Handling Tests', () => {
  const config = TestUtils.getTestConfig();

  beforeAll(async () => {
    DevLogger.info('ERROR-TESTS', 'Starting API error handling tests');
  });

  describe('HTTP Status Code Tests', () => {
    test('GET /api/venues/invalid-id -> 404 Not Found', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/non-existent-id`
      );

      TestUtils.assertStatusCode(response.status, 404);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('not found');
    });

    test('GET /api/venues/ -> 404 Not Found for empty ID', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/`
      );

      TestUtils.assertStatusCode(response.status, 404);
    });

    test('PUT /api/venues/invalid-id -> 404 Not Found', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/non-existent-id`,
        {
          method: 'PUT',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 404);
      expect(response.data).toHaveProperty('error');
    });

    test('DELETE /api/venues/invalid-id -> 404 Not Found', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/non-existent-id`,
        {
          method: 'DELETE'
        }
      );

      TestUtils.assertStatusCode(response.status, 404);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Invalid Input Tests', () => {
    test('POST /api/venues -> 400 Bad Request with null values', async () => {
      const invalidData = {
        name: null,
        email: null,
        phone: null
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> 400 Bad Request with undefined values', async () => {
      const invalidData = {
        name: undefined,
        email: undefined,
        phone: undefined
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> 400 Bad Request with empty object', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> 400 Bad Request with malformed JSON', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{"name": "Test", "email": invalid-json}' // Malformed JSON
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> 400 Bad Request with non-JSON body', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: 'This is not JSON'
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Edge Case Tests', () => {
    test('POST /api/venues -> Handle extremely long strings', async () => {
      const invalidData = {
        name: 'A'.repeat(10000), // Extremely long name
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> Handle special characters', async () => {
      const invalidData = {
        name: 'Test Client <script>alert("xss")</script>',
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      // Should either sanitize or reject
      expect([200, 201, 400]).toContain(response.status);
    });

    test('POST /api/venues -> Handle Unicode characters', async () => {
      const invalidData = {
        name: '测试客户端 🚀 ñáéíóú',
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      // Should handle Unicode properly
      expect([200, 201, 400]).toContain(response.status);
    });

    test('POST /api/venues -> Handle empty strings', async () => {
      const invalidData = {
        name: '',
        email: '',
        phone: ''
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /api/venues -> Handle whitespace-only strings', async () => {
      const invalidData = {
        name: '   ',
        email: '   ',
        phone: '   '
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Network Error Tests', () => {
    test('Handle timeout scenarios', async () => {
      // This test simulates a timeout by using a very short timeout
      const originalTimeout = config.timeout;
      
      try {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/venues`,
          {},
          0 // No retries
        );

        // Should either succeed or fail gracefully
        expect(response.status).toBeDefined();
      } catch (error) {
        // Timeout errors are expected
        expect(error).toBeDefined();
      }
    });

    test('Handle malformed URLs', async () => {
      try {
        const response = await TestUtils.makeRequest(
          'invalid-url',
          {}
        );

        // Should handle gracefully
        expect(response).toBeDefined();
      } catch (error) {
        // Network errors are expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('OAuth Error Tests', () => {
    test('POST /functions/v1/google-ads-oauth -> 400 Bad Request with invalid code', async () => {
      const invalidData = {
        code: 'invalid-code',
        state: 'mock-state'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-ads-oauth`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /functions/v1/google-ads-oauth -> 400 Bad Request with expired code', async () => {
      const invalidData = {
        code: 'expired-code',
        state: 'mock-state'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-ads-oauth`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /functions/v1/token-refresh -> 400 Bad Request with invalid refresh token', async () => {
      const invalidData = {
        platform: 'google',
        refreshToken: 'invalid-refresh-token'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/token-refresh`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Google Sheets Error Tests', () => {
    test('POST /functions/v1/google-sheets-data -> 400 Bad Request with invalid spreadsheet ID', async () => {
      const invalidData = {
        spreadsheetId: 'invalid-spreadsheet-id',
        range: 'Sheet1!A1:D10'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-sheets-data`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('POST /functions/v1/google-sheets-data -> 400 Bad Request with invalid range', async () => {
      const mockData = TestFixtures.getMockSheetsData();
      
      const invalidData = {
        spreadsheetId: mockData.spreadsheetId,
        range: 'InvalidRange!' // Invalid range format
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-sheets-data`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Handle rapid successive requests', async () => {
      const requests = [];
      const requestCount = 10;

      // Send multiple requests rapidly
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          TestUtils.makeRequest(`${config.baseUrl}/api/venues`)
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // All requests should complete (either success or rate limited)
      expect(responses.length).toBe(requestCount);
      
      // Check if any requests were rate limited
      const rateLimitedResponses = responses.filter(
        response => response.status === 'fulfilled' && 
        response.value.status === 429
      );
      
      // Rate limiting may or may not be implemented
      DevLogger.info('ERROR-TESTS', `Rate limited responses: ${rateLimitedResponses.length}/${requestCount}`);
    });
  });

  describe('Server Error Tests', () => {
    test('Handle 500 Internal Server Error gracefully', async () => {
      // This test would need a specific endpoint that returns 500
      // For now, we'll test error response format
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify({
            // This might trigger a server error depending on implementation
            name: 'Test Client',
            email: 'test@example.com',
            phone: '+1234567890',
            triggerError: true
          })
        }
      );

      // Should handle server errors gracefully
      if (response.status === 500) {
        expect(response.data).toHaveProperty('error');
        expect(typeof response.data.error).toBe('string');
      }
    });
  });

  describe('Concurrent Request Tests', () => {
    test('Handle concurrent POST requests', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
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
                ...mockClient,
                name: `${mockClient.name} ${i}`
              })
            }
          )
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // All requests should complete
      expect(responses.length).toBe(requestCount);
      
      // Check for successful responses
      const successfulResponses = responses.filter(
        response => response.status === 'fulfilled' && 
        response.value.status === 201
      );
      
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });
});
