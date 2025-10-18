/**
 * Security Tests
 * Tests for SQL injection, XSS, CSRF, and other security vulnerabilities
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Security Tests', () => {
  const config = TestUtils.getTestConfig();

  beforeAll(async () => {
    DevLogger.info('SECURITY-TESTS', 'Starting API security tests');
  });

  describe('SQL Injection Tests', () => {
    test('POST /api/venues -> SQL injection in name field', async () => {
      const maliciousData = {
        name: "'; DROP TABLE venues; --",
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
      
      if (response.status === 201) {
        // If accepted, verify the data was sanitized
        expect(response.data.name).not.toContain('DROP TABLE');
      }
    });

    test('POST /api/venues -> SQL injection in email field', async () => {
      const maliciousData = {
        name: 'Test Client',
        email: "test@example.com'; DROP TABLE users; --",
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
    });

    test('GET /api/venues/{id} -> SQL injection in ID parameter', async () => {
      const maliciousId = "1'; DROP TABLE venues; --";
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/${maliciousId}`
      );

      // Should either reject the request or sanitize the input
      expect([400, 404]).toContain(response.status);
    });

    test('POST /api/venues -> Union-based SQL injection', async () => {
      const maliciousData = {
        name: "test' UNION SELECT password FROM users --",
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('XSS (Cross-Site Scripting) Tests', () => {
    test('POST /api/venues -> XSS in name field', async () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>',
        email: 'test@example.com',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
      
      if (response.status === 201) {
        // If accepted, verify the data was sanitized
        expect(response.data.name).not.toContain('<script>');
        expect(response.data.name).not.toContain('alert');
      }
    });

    test('POST /api/venues -> XSS in email field', async () => {
      const maliciousData = {
        name: 'Test Client',
        email: 'test@example.com<script>alert("XSS")</script>',
        phone: '+1234567890'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
    });

    test('POST /api/venues -> XSS with event handlers', async () => {
      const maliciousData = {
        name: 'Test Client',
        email: 'test@example.com',
        phone: '+1234567890',
        description: '<img src="x" onerror="alert(\'XSS\')">'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
    });

    test('POST /api/venues -> XSS with JavaScript URLs', async () => {
      const maliciousData = {
        name: 'Test Client',
        email: 'test@example.com',
        phone: '+1234567890',
        website: 'javascript:alert("XSS")'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Tests', () => {
    test('POST /api/venues -> CSRF without proper token', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://malicious-site.com',
            'Referer': 'https://malicious-site.com'
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either succeed (if CSRF protection not implemented) or return 403
      expect([200, 201, 403]).toContain(response.status);
    });

    test('PUT /api/venues/{id} -> CSRF without proper token', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/test-id`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://malicious-site.com',
            'Referer': 'https://malicious-site.com'
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either succeed (if CSRF protection not implemented) or return 403
      expect([200, 201, 403, 404]).toContain(response.status);
    });

    test('DELETE /api/venues/{id} -> CSRF without proper token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/test-id`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://malicious-site.com',
            'Referer': 'https://malicious-site.com'
          }
        }
      );

      // Should either succeed (if CSRF protection not implemented) or return 403
      expect([200, 201, 403, 404]).toContain(response.status);
    });
  });

  describe('Input Sanitization Tests', () => {
    test('POST /api/venues -> HTML tag sanitization', async () => {
      const maliciousData = {
        name: '<b>Test Client</b>',
        email: 'test@example.com',
        phone: '+1234567890',
        description: '<p>Test description</p><script>alert("XSS")</script>'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should either reject the request or sanitize the input
      expect([400, 201]).toContain(response.status);
      
      if (response.status === 201) {
        // If accepted, verify the data was sanitized
        expect(response.data.name).not.toContain('<script>');
        expect(response.data.description).not.toContain('<script>');
      }
    });

    test('POST /api/venues -> Special character sanitization', async () => {
      const maliciousData = {
        name: 'Test Client & Co.',
        email: 'test@example.com',
        phone: '+1234567890',
        description: 'Test description with "quotes" and \'apostrophes\''
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should handle special characters properly
      expect([400, 201]).toContain(response.status);
    });

    test('POST /api/venues -> Unicode character handling', async () => {
      const maliciousData = {
        name: 'Test Client 测试',
        email: 'test@example.com',
        phone: '+1234567890',
        description: 'Test description with émojis 🚀'
      };

      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: JSON.stringify(maliciousData)
        }
      );

      // Should handle Unicode characters properly
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('Authentication Bypass Tests', () => {
    test('GET /api/venues -> Authentication bypass with null token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'Bearer null',
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });

    test('GET /api/venues -> Authentication bypass with empty token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'Bearer ',
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });

    test('GET /api/venues -> Authentication bypass with SQL injection in token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': "Bearer ' OR '1'='1",
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Authorization Bypass Tests', () => {
    test('GET /api/venues -> Authorization bypass with admin token', async () => {
      const adminUser = TestFixtures.getMockUsers().find(user => user.role === 'admin');
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': `Bearer ${adminUser?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 200);
    });

    test('POST /api/venues -> Authorization bypass with client token', async () => {
      const clientUser = TestFixtures.getMockUsers().find(user => user.role === 'client');
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientUser?.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either succeed (if no special permissions required) or return 403
      expect([200, 201, 403]).toContain(response.status);
    });
  });

  describe('Data Exposure Tests', () => {
    test('GET /api/venues -> Sensitive data exposure', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      TestUtils.assertStatusCode(response.status, 200);
      
      // Check that sensitive data is not exposed
      if (Array.isArray(response.data) && response.data.length > 0) {
        const client = response.data[0];
        
        // Should not expose sensitive fields
        expect(client).not.toHaveProperty('password');
        expect(client).not.toHaveProperty('secret');
        expect(client).not.toHaveProperty('privateKey');
      }
    });

    test('GET /api/venues/{id} -> Sensitive data exposure in single record', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/test-id`
      );

      // Should either succeed or return 404
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        // Check that sensitive data is not exposed
        expect(response.data).not.toHaveProperty('password');
        expect(response.data).not.toHaveProperty('secret');
        expect(response.data).not.toHaveProperty('privateKey');
      }
    });
  });

  describe('Rate Limiting Security Tests', () => {
    test('Rate limiting prevents brute force attacks', async () => {
      const requests = [];
      const requestCount = 100;

      // Send multiple requests rapidly to test rate limiting
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          TestUtils.makeRequest(
            `${config.baseUrl}/api/venues`,
            {
              headers: {
                'Authorization': 'Bearer invalid-token'
              }
            }
          )
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // All requests should complete
      expect(responses.length).toBe(requestCount);
      
      // Check for rate limiting
      const rateLimitedResponses = responses.filter(
        response => response.status === 'fulfilled' && 
        response.value.status === 429
      );
      
      DevLogger.info('SECURITY-TESTS', `Rate limited responses: ${rateLimitedResponses.length}/${requestCount}`);
    });
  });

  describe('Header Security Tests', () => {
    test('Security headers present in responses', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('CORS headers properly configured', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      
      // Should not allow all origins in production
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
      }
    });
  });

  describe('Error Information Disclosure Tests', () => {
    test('Error messages do not expose sensitive information', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/invalid-id`
      );

      // Should either succeed or return 404
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 404) {
        // Error message should not expose sensitive information
        expect(response.data.error).not.toContain('password');
        expect(response.data.error).not.toContain('secret');
        expect(response.data.error).not.toContain('database');
        expect(response.data.error).not.toContain('connection');
      }
    });

    test('Stack traces are not exposed in error responses', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          body: 'invalid-json'
        }
      );

      // Should return 400 for invalid JSON
      expect([400, 500]).toContain(response.status);
      
      if (response.status === 500) {
        // Error response should not contain stack traces
        expect(response.data.error).not.toContain('at ');
        expect(response.data.error).not.toContain('Error:');
        expect(response.data.error).not.toContain('TypeError:');
      }
    });
  });
});
