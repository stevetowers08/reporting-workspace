/**
 * Validation Tests
 * Tests request/response validation, schemas, and data types
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Validation Tests', () => {
  const config = TestUtils.getTestConfig();

  beforeAll(async () => {
    DevLogger.info('VALIDATION-TESTS', 'Starting API validation tests');
  });

  describe('Request Schema Validation', () => {
    describe('Client Creation Validation', () => {
      test('POST /api/venues -> 400 Bad Request with missing required fields', async () => {
        const invalidData = {
          // Missing required 'name' field
          email: 'test@example.com'
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
        expect(response.data.error).toContain('required');
      });

      test('POST /api/venues -> 400 Bad Request with invalid email format', async () => {
        const invalidData = {
          name: 'Test Client',
          email: 'invalid-email-format', // Invalid email
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
        expect(response.data.error).toContain('email');
      });

      test('POST /api/venues -> 400 Bad Request with invalid phone format', async () => {
        const invalidData = {
          name: 'Test Client',
          email: 'test@example.com',
          phone: 'invalid-phone' // Invalid phone format
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

      test('POST /api/venues -> 400 Bad Request with empty name', async () => {
        const invalidData = {
          name: '', // Empty name
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

      test('POST /api/venues -> 400 Bad Request with name too long', async () => {
        const invalidData = {
          name: 'A'.repeat(256), // Name too long
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
    });

    describe('OAuth Validation', () => {
      test('POST /functions/v1/google-ads-oauth -> 400 Bad Request with missing code', async () => {
        const invalidData = {
          // Missing required 'code' field
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

      test('POST /functions/v1/google-ads-oauth -> 400 Bad Request with missing state', async () => {
        const invalidData = {
          code: 'mock-code'
          // Missing required 'state' field
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
    });

    describe('Google Sheets Validation', () => {
      test('POST /functions/v1/google-sheets-data -> 400 Bad Request with missing spreadsheetId', async () => {
        const invalidData = {
          // Missing required 'spreadsheetId' field
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

      test('POST /functions/v1/google-sheets-data -> 400 Bad Request with invalid spreadsheetId format', async () => {
        const invalidData = {
          spreadsheetId: 'invalid-id-format', // Invalid format
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
    });
  });

  describe('Response Schema Validation', () => {
    describe('Client Response Schema', () => {
      test('GET /api/venues -> Valid response schema', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/venues`
        );

        TestUtils.assertStatusCode(response.status, 200);
        
        // Validate response is an array
        expect(Array.isArray(response.data)).toBe(true);
        
        // If there are clients, validate their schema
        if (response.data.length > 0) {
          const client = response.data[0];
          const requiredFields = ['id', 'name', 'email', 'createdAt', 'updatedAt'];
          TestUtils.assertRequiredFields(client, requiredFields);
          
          // Validate data types
          expect(typeof client.id).toBe('string');
          expect(typeof client.name).toBe('string');
          expect(typeof client.email).toBe('string');
          expect(typeof client.createdAt).toBe('string');
          expect(typeof client.updatedAt).toBe('string');
        }
      });

      test('POST /api/venues -> Valid response schema', async () => {
        const mockClient = TestFixtures.getMockClients()[0];
        
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/venues`,
          {
            method: 'POST',
            body: JSON.stringify(mockClient)
          }
        );

        TestUtils.assertStatusCode(response.status, 201);
        
        // Validate response schema
        const requiredFields = ['id', 'name', 'email', 'createdAt', 'updatedAt'];
        TestUtils.assertRequiredFields(response.data, requiredFields);
        
        // Validate data types
        expect(typeof response.data.id).toBe('string');
        expect(typeof response.data.name).toBe('string');
        expect(typeof response.data.email).toBe('string');
        expect(typeof response.data.createdAt).toBe('string');
        expect(typeof response.data.updatedAt).toBe('string');
      });
    });

    describe('Integration Response Schema', () => {
      test('GET /api/google-ads/accounts -> Valid response schema', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/google-ads/accounts`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(Array.isArray(response.data)).toBe(true);
        
        // If there are accounts, validate their schema
        if (response.data.length > 0) {
          const account = response.data[0];
          const requiredFields = ['id', 'name', 'status'];
          TestUtils.assertRequiredFields(account, requiredFields);
        }
      });

      test('GET /api/facebook-ads/accounts -> Valid response schema', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/facebook-ads/accounts`
        );

        TestUtils.assertStatusCode(response.status, 200);
        expect(Array.isArray(response.data)).toBe(true);
        
        // If there are accounts, validate their schema
        if (response.data.length > 0) {
          const account = response.data[0];
          const requiredFields = ['id', 'name', 'status'];
          TestUtils.assertRequiredFields(account, requiredFields);
        }
      });
    });

    describe('Error Response Schema', () => {
      test('Error responses have consistent schema', async () => {
        const response = await TestUtils.makeRequest(
          `${config.baseUrl}/api/venues/invalid-id`
        );

        // Should be 404 or 400
        expect([400, 404]).toContain(response.status);
        
        // Validate error response schema
        expect(response.data).toHaveProperty('error');
        expect(typeof response.data.error).toBe('string');
        expect(response.data.error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Type Validation', () => {
    test('Numeric fields accept valid numbers', async () => {
      const mockClient = {
        ...TestFixtures.getMockClients()[0],
        budget: 1000 // Valid number
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 201);
      expect(typeof response.data.budget).toBe('number');
    });

    test('Numeric fields reject invalid numbers', async () => {
      const mockClient = {
        ...TestFixtures.getMockClients()[0],
        budget: 'not-a-number' // Invalid number
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
    });

    test('Boolean fields accept valid booleans', async () => {
      const mockClient = {
        ...TestFixtures.getMockClients()[0],
        isActive: true // Valid boolean
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 201);
      expect(typeof response.data.isActive).toBe('boolean');
    });

    test('Date fields accept valid ISO dates', async () => {
      const mockClient = {
        ...TestFixtures.getMockClients()[0],
        startDate: '2024-01-01T00:00:00Z' // Valid ISO date
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );

      TestUtils.assertStatusCode(response.status, 201);
      expect(typeof response.data.startDate).toBe('string');
      expect(new Date(response.data.startDate).toISOString()).toBe(response.data.startDate);
    });
  });

  describe('Content-Type Validation', () => {
    test('POST requests require application/json content-type', async () => {
      const mockClient = TestFixtures.getMockClients()[0];

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain' // Wrong content type
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either reject or handle gracefully
      expect([400, 415]).toContain(response.status);
    });

    test('POST requests with missing content-type are handled', async () => {
      const mockClient = TestFixtures.getMockClients()[0];

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            // Missing Content-Type header
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either reject or handle gracefully
      expect([400, 415]).toContain(response.status);
    });
  });
});
