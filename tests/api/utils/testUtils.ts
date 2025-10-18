/**
 * Test Utilities and Helpers
 * Common utilities for API testing
 */

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  responseTime: number;
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export class TestUtils {
  private static readonly DEFAULT_TIMEOUT = 10000;
  private static readonly DEFAULT_RETRIES = 3;

  /**
   * Get test configuration
   */
  static getTestConfig(): TestConfig {
    return {
      baseUrl: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      timeout: parseInt(process.env.TEST_TIMEOUT || '10000'),
      retries: parseInt(process.env.TEST_RETRIES || '3')
    };
  }

  /**
   * Generate test headers
   */
  static getTestHeaders(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (process.env.VITE_SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`;
    }

    return headers;
  }

  /**
   * Make API request with retry logic
   */
  static async makeRequest<T = any>(
    url: string,
    options: RequestInit = {},
    retries: number = this.DEFAULT_RETRIES
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getTestHeaders(),
          ...options.headers
        }
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime
      };
    } catch (error) {
      if (retries > 0) {
        console.warn(`TEST-UTILS: Request failed, retrying... (${retries} retries left)`);
        await this.delay(1000);
        return this.makeRequest(url, options, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Delay execution
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateTestData(type: 'user' | 'client' | 'campaign'): any {
    const timestamp = Date.now();
    
    switch (type) {
      case 'user':
        return {
          email: `test-user-${timestamp}@example.com`,
          name: `Test User ${timestamp}`,
          role: 'user'
        };
      
      case 'client':
        return {
          name: `Test Client ${timestamp}`,
          email: `client-${timestamp}@example.com`,
          phone: '+1234567890',
          industry: 'Technology'
        };
      
      case 'campaign':
        return {
          name: `Test Campaign ${timestamp}`,
          platform: 'facebook',
          budget: 1000,
          status: 'active'
        };
      
      default:
        return {};
    }
  }

  /**
   * Validate response schema
   */
  static validateResponseSchema(response: any, schema: any): boolean {
    // Basic schema validation - you can enhance this with a proper schema validator
    if (typeof schema === 'object' && schema !== null) {
      for (const key in schema) {
        if (!(key in response)) {
          return false;
        }
        if (typeof schema[key] === 'object' && schema[key] !== null) {
          if (!this.validateResponseSchema(response[key], schema[key])) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(ids: string[], endpoint: string): Promise<void> {
    try {
      for (const id of ids) {
        await this.makeRequest(`${this.getTestConfig().baseUrl}${endpoint}/${id}`, {
          method: 'DELETE'
        });
      }
      console.debug(`TEST-UTILS: Cleaned up ${ids.length} test records`);
    } catch (error) {
      console.warn('TEST-UTILS: Failed to cleanup test data:', error);
    }
  }

  /**
   * Assert response time is within threshold
   */
  static assertResponseTime(responseTime: number, threshold: number = 2000): void {
    if (responseTime > threshold) {
      throw new Error(`Response time ${responseTime}ms exceeds threshold ${threshold}ms`);
    }
  }

  /**
   * Assert status code
   */
  static assertStatusCode(status: number, expected: number): void {
    if (status !== expected) {
      throw new Error(`Expected status ${expected}, got ${status}`);
    }
  }

  /**
   * Assert response contains required fields
   */
  static assertRequiredFields(response: any, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => !(field in response));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }
}
