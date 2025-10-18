/**
 * Sample API Test - How to Add New Tests
 * This file demonstrates how to create new API tests following the established patterns
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('Sample API Tests - How to Add New Tests', () => {
  const config = TestUtils.getTestConfig();
  let testData: any[] = [];

  beforeAll(async () => {
    DevLogger.info('SAMPLE-TESTS', 'Starting sample API tests');
  });

  afterAll(async () => {
    DevLogger.info('SAMPLE-TESTS', 'Cleaning up sample test data');
    await TestUtils.cleanupTestData(testData, '/api/test-data');
  });

  describe('Basic Test Pattern', () => {
    test('GET /api/venues -> 200 OK (Basic Test Example)', async () => {
      // Arrange - Set up test data and expectations
      const expectedStatus = 200;
      
      // Act - Perform the API call
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );
      
      // Assert - Verify the results
      TestUtils.assertStatusCode(response.status, expectedStatus);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Additional assertions
      TestUtils.assertResponseTime(response.responseTime, 2000);
    });
  });

  describe('POST Request Test Pattern', () => {
    test('POST /api/venues -> 201 Created (POST Test Example)', async () => {
      // Arrange - Prepare test data
      const mockClient = TestFixtures.getMockClients()[0];
      
      // Act - Make POST request
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(mockClient)
        }
      );
      
      // Assert - Verify creation
      TestUtils.assertStatusCode(response.status, 201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(mockClient.name);
      
      // Store for cleanup
      testData.push(response.data.id);
    });
  });

  describe('Error Handling Test Pattern', () => {
    test('GET /api/venues/invalid-id -> 404 Not Found (Error Test Example)', async () => {
      // Arrange - Use invalid ID
      const invalidId = 'non-existent-id';
      
      // Act - Make request with invalid ID
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${invalidId}`
      );
      
      // Assert - Verify error response
      TestUtils.assertStatusCode(response.status, 404);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('not found');
    });
  });

  describe('Validation Test Pattern', () => {
    test('POST /api/venues -> 400 Bad Request with missing required field (Validation Test Example)', async () => {
      // Arrange - Prepare invalid data (missing required field)
      const invalidData = {
        // Missing required 'name' field
        email: 'test@example.com',
        phone: '+1234567890'
      };
      
      // Act - Make request with invalid data
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData)
        }
      );
      
      // Assert - Verify validation error
      TestUtils.assertStatusCode(response.status, 400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('required');
    });
  });

  describe('Authentication Test Pattern', () => {
    test('GET /api/venues -> 401 Unauthorized without token (Auth Test Example)', async () => {
      // Arrange - Prepare request without authentication
      const headers = {
        'Content-Type': 'application/json'
        // No Authorization header
      };
      
      // Act - Make request without token
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        { headers }
      );
      
      // Assert - Verify unauthorized response
      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('unauthorized');
    });
  });

  describe('Security Test Pattern', () => {
    test('POST /api/venues -> SQL injection prevention (Security Test Example)', async () => {
      // Arrange - Prepare malicious data
      const maliciousData = {
        name: "'; DROP TABLE venues; --",
        email: 'test@example.com',
        phone: '+1234567890'
      };
      
      // Act - Make request with malicious data
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );
      
      // Assert - Verify security handling
      // Should either reject (400) or sanitize (201)
      expect([400, 201]).toContain(response.status);
      
      if (response.status === 201) {
        // If accepted, verify data was sanitized
        expect(response.data.name).not.toContain('DROP TABLE');
      }
    });
  });

  describe('Integration Test Pattern', () => {
    test('Complete CRUD workflow (Integration Test Example)', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      // 1. Create
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
      
      // 2. Read
      const getResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );
      
      TestUtils.assertStatusCode(getResponse.status, 200);
      expect(getResponse.data.id).toBe(clientId);
      
      // 3. Update
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
      
      // 4. Verify Update
      const verifyResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );
      
      TestUtils.assertStatusCode(verifyResponse.status, 200);
      expect(verifyResponse.data.name).toBe('Updated Client Name');
      
      // 5. Delete
      const deleteResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`,
        {
          method: 'DELETE'
        }
      );
      
      TestUtils.assertStatusCode(deleteResponse.status, 200);
      
      // 6. Verify Deletion
      const finalResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${clientId}`
      );
      
      TestUtils.assertStatusCode(finalResponse.status, 404);
    });
  });

  describe('Performance Test Pattern', () => {
    test('Concurrent requests performance (Performance Test Example)', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      const requestCount = 5;
      const requests = [];
      
      // Arrange - Prepare concurrent requests
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
      
      // Act - Execute concurrent requests
      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      // Assert - Verify performance
      expect(responses.length).toBe(requestCount);
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;
      
      DevLogger.info('SAMPLE-TESTS', `Concurrent requests completed in ${totalTime}ms (avg: ${averageTime}ms)`);
      
      // Performance assertion
      expect(averageTime).toBeLessThan(5000); // 5 seconds per request
      
      // Cleanup successful responses
      responses.forEach(response => {
        if (response.status === 'fulfilled' && response.value.status === 201) {
          testData.push(response.value.data.id);
        }
      });
    });
  });

  describe('Custom Test Utilities Example', () => {
    test('Using custom test utilities (Custom Utilities Example)', async () => {
      // Arrange - Generate test data using utilities
      const testData = TestUtils.generateTestData('client');
      
      // Act - Make request
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(testData)
        }
      );
      
      // Assert - Use custom assertions
      TestUtils.assertStatusCode(response.status, 201);
      TestUtils.assertRequiredFields(response.data, ['id', 'name', 'email']);
      TestUtils.assertResponseTime(response.responseTime, 2000);
      
      // Store for cleanup
      testData.push(response.data.id);
    });
  });

  describe('Edge Case Test Pattern', () => {
    test('Handle edge cases (Edge Case Test Example)', async () => {
      // Test with empty string
      const emptyData = {
        name: '',
        email: 'test@example.com',
        phone: '+1234567890'
      };
      
      const emptyResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(emptyData)
        }
      );
      
      expect([400, 201]).toContain(emptyResponse.status);
      
      // Test with very long string
      const longData = {
        name: 'A'.repeat(1000),
        email: 'test@example.com',
        phone: '+1234567890'
      };
      
      const longResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(longData)
        }
      );
      
      expect([400, 201]).toContain(longResponse.status);
      
      // Test with special characters
      const specialData = {
        name: 'Test Client & Co. <script>alert("xss")</script>',
        email: 'test@example.com',
        phone: '+1234567890'
      };
      
      const specialResponse = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(specialData)
        }
      );
      
      expect([400, 201]).toContain(specialResponse.status);
    });
  });
});
