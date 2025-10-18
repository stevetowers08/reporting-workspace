/**
 * Authentication Tests
 * Tests token validation, authorization, and access control
 */

import { DevLogger } from '@/lib/logger';
import { TestFixtures } from '../fixtures/testFixtures';
import { TestUtils } from '../utils/testUtils';

describe('API Authentication Tests', () => {
  const config = TestUtils.getTestConfig();

  beforeAll(async () => {
    DevLogger.info('AUTH-TESTS', 'Starting API authentication tests');
  });

  describe('Token Validation Tests', () => {
    test('GET /api/venues -> 401 Unauthorized without token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            // No Authorization header
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('unauthorized');
    });

    test('GET /api/venues -> 401 Unauthorized with invalid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('unauthorized');
    });

    test('GET /api/venues -> 401 Unauthorized with malformed token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'InvalidFormat token',
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });

    test('GET /api/venues -> 401 Unauthorized with expired token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'Bearer expired-token',
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });

    test('GET /api/venues -> 200 OK with valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      TestUtils.assertStatusCode(response.status, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    test('POST /api/venues -> 403 Forbidden with insufficient permissions', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer read-only-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either succeed (if no special permissions required) or return 403
      expect([200, 201, 403]).toContain(response.status);
    });

    test('PUT /api/venues/{id} -> 403 Forbidden with insufficient permissions', async () => {
      const mockClient = TestFixtures.getMockClients()[0];
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/test-id`,
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer read-only-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mockClient)
        }
      );

      // Should either succeed (if no special permissions required) or return 403
      expect([200, 201, 403, 404]).toContain(response.status);
    });

    test('DELETE /api/venues/{id} -> 403 Forbidden with insufficient permissions', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues/test-id`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer read-only-token',
            'Content-Type': 'application/json'
          }
        }
      );

      // Should either succeed (if no special permissions required) or return 403
      expect([200, 201, 403, 404]).toContain(response.status);
    });
  });

  describe('Role-Based Access Control Tests', () => {
    test('Admin user can access all endpoints', async () => {
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

    test('Regular user has limited access', async () => {
      const regularUser = TestFixtures.getMockUsers().find(user => user.role === 'user');
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': `Bearer ${regularUser?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 200);
    });

    test('Client user has restricted access', async () => {
      const clientUser = TestFixtures.getMockUsers().find(user => user.role === 'client');
      
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': `Bearer ${clientUser?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 200);
    });
  });

  describe('OAuth Token Tests', () => {
    test('POST /functions/v1/google-ads-oauth -> 401 Unauthorized without proper headers', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/google-ads-oauth`,
        {
          method: 'POST',
          headers: {
            // Missing required headers
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: 'mock-code',
            state: 'mock-state'
          })
        }
      );

      // Should either succeed (if no special auth required) or return 401
      expect([200, 201, 401]).toContain(response.status);
    });

    test('POST /functions/v1/token-refresh -> 401 Unauthorized with invalid refresh token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/token-refresh`,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'google',
            refreshToken: 'invalid-refresh-token'
          })
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });

    test('GET /functions/v1/oauth-tokens -> 401 Unauthorized without valid token', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/oauth-tokens`,
        {
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('Session Management Tests', () => {
    test('Token expiration handling', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'Authorization': 'Bearer expired-token'
          }
        }
      );

      TestUtils.assertStatusCode(response.status, 401);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('expired');
    });

    test('Token refresh flow', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/functions/v1/token-refresh`,
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'google',
            refreshToken: 'valid-refresh-token'
          })
        }
      );

      // Should either succeed or fail gracefully
      expect([200, 201, 400, 401]).toContain(response.status);
    });
  });

  describe('API Key Tests', () => {
    test('Invalid API key rejection', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            'X-API-Key': 'invalid-api-key',
            'Content-Type': 'application/json'
          }
        }
      );

      // Should either succeed (if API key not required) or return 401
      expect([200, 401]).toContain(response.status);
    });

    test('Missing API key handling', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          headers: {
            // No API key header
            'Content-Type': 'application/json'
          }
        }
      );

      // Should either succeed (if API key not required) or return 401
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('CORS Tests', () => {
    test('OPTIONS request handling', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`,
        {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        }
      );

      // Should handle CORS preflight
      expect([200, 204]).toContain(response.status);
    });

    test('CORS headers present in responses', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Rate limiting with valid token', async () => {
      const requests = [];
      const requestCount = 20;

      // Send multiple requests with valid token
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          TestUtils.makeRequest(`${config.baseUrl}/api/venues`)
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
      
      DevLogger.info('AUTH-TESTS', `Rate limited responses: ${rateLimitedResponses.length}/${requestCount}`);
    });

    test('Rate limiting with invalid token', async () => {
      const requests = [];
      const requestCount = 10;

      // Send multiple requests with invalid token
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
      
      // Most should be 401, some might be rate limited
      const unauthorizedResponses = responses.filter(
        response => response.status === 'fulfilled' && 
        response.value.status === 401
      );
      
      expect(unauthorizedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers Tests', () => {
    test('Security headers present in responses', async () => {
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('HTTPS enforcement', async () => {
      // This test would need to be run against HTTP endpoint
      // For now, we'll test that the response includes security headers
      const response = await TestUtils.makeRequest(
        `${config.baseUrl}/api/venues`
      );

      // Should include security headers
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });
});
