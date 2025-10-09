
export interface TestResult {
  service: string;
  test: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: string;
  duration?: number;
}

export interface ServiceTestResults {
  facebook: TestResult[];
  google: TestResult[];
  ghl: TestResult[];
  database: TestResult[];
}

export class DevAPITester {
  private static results: TestResult[] = [];

  /**
   * Test all API endpoints and services
   */
  static async testAllEndpoints(): Promise<ServiceTestResults> {
    console.log('🧪 Testing all API endpoints...');
    this.results = [];
    
    const startTime = Date.now();
    
    const results = {
      facebook: await this.testFacebook(),
      google: await this.testGoogle(),
      ghl: await this.testGHL(),
      database: await this.testDatabase()
    };
    
    const totalDuration = Date.now() - startTime;
    console.log(`✅ All tests completed in ${totalDuration}ms`);
    console.table(this.results);
    
    return results;
  }

  /**
   * Test Facebook Ads API
   */
  static async testFacebook(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      // Test 1: Check connection
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('facebookAds');
      results.push(this.createResult('Facebook Ads', 'Connection Check', isConnected, !isConnected ? 'Not connected' : undefined));
      
      if (!isConnected) {
        results.push(this.createResult('Facebook Ads', 'Skipping API tests', false, 'Not connected'));
        return results;
      }

      // Test 2: Get access token
      const accessToken = await TokenManager.getAccessToken('facebookAds');
      results.push(this.createResult('Facebook Ads', 'Access Token', !!accessToken, !accessToken ? 'No token found' : undefined));

      // Test 3: Test service
      const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
      
      const campaigns = await FacebookAdsService.getCampaigns();
      results.push(this.createResult('Facebook Ads', 'Get Campaigns', true, undefined, { count: campaigns.length, campaigns }));
      
      if (campaigns.length > 0) {
        const metrics = await FacebookAdsService.getCampaignMetrics(campaigns[0].id, {
          start: '2024-01-01',
          end: '2024-01-31'
        });
        results.push(this.createResult('Facebook Ads', 'Get Campaign Metrics', true, undefined, metrics));
      }
      
    } catch (error) {
      results.push(this.createResult('Facebook Ads', 'API Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Test Google Ads API
   */
  static async testGoogle(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      // Test 1: Check connection
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('googleAds');
      results.push(this.createResult('Google Ads', 'Connection Check', isConnected, !isConnected ? 'Not connected' : undefined));
      
      if (!isConnected) {
        results.push(this.createResult('Google Ads', 'Skipping API tests', false, 'Not connected'));
        return results;
      }

      // Test 2: Get access token
      const accessToken = await TokenManager.getAccessToken('googleAds');
      results.push(this.createResult('Google Ads', 'Access Token', !!accessToken, !accessToken ? 'No token found' : undefined));

      // Test 3: Test service
      const { GoogleAdsService } = await import('@/services/api/googleAdsService');
      
      const accounts = await GoogleAdsService.getAdAccounts();
      results.push(this.createResult('Google Ads', 'Get Accounts', true, undefined, { count: accounts.length, accounts }));
      
      if (accounts.length > 0) {
        const metrics = await GoogleAdsService.getAccountMetrics(accounts[0].id, {
          start: '2024-01-01',
          end: '2024-01-31'
        });
        results.push(this.createResult('Google Ads', 'Get Metrics', true, undefined, metrics));
      }
      
    } catch (error) {
      results.push(this.createResult('Google Ads', 'API Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Test Go High Level API
   */
  static async testGHL(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      // Test 1: Check connection
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('goHighLevel');
      results.push(this.createResult('Go High Level', 'Connection Check', isConnected, !isConnected ? 'Not connected' : undefined));
      
      if (!isConnected) {
        results.push(this.createResult('Go High Level', 'Skipping API tests', false, 'Not connected'));
        return results;
      }

      // Test 2: Get access token
      const accessToken = await TokenManager.getAccessToken('goHighLevel');
      results.push(this.createResult('Go High Level', 'Access Token', !!accessToken, !accessToken ? 'No token found' : undefined));

      // Test 3: Test service
      const { GoHighLevelService } = await import('@/services/api/goHighLevelService');
      
      // Test account info
      const accountInfo = await GoHighLevelService.getAccountInfo();
      results.push(this.createResult('Go High Level', 'Get Account Info', true, undefined, accountInfo));
      
      // Test contacts (using a test location ID)
      const testLocationId = 'V7bzEjKiigXzh8r6sQq0'; // Magnolia Terrace location ID
      const contacts = await GoHighLevelService.getContacts(testLocationId, 10);
      results.push(this.createResult('Go High Level', 'Get Contacts', true, undefined, { count: contacts.length }));
      
    } catch (error) {
      results.push(this.createResult('Go High Level', 'API Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Test Database connections
   */
  static async testDatabase(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      const { DatabaseService } = await import('@/services/data/databaseService');
      
      const clients = await DatabaseService.getAllClients();
      results.push(this.createResult('Database', 'Get All Clients', true, undefined, { count: clients.length }));
      
      const integrations = await DatabaseService.getIntegrations();
      results.push(this.createResult('Database', 'Get Integrations', true, undefined, { count: integrations.length }));
      
    } catch (error) {
      results.push(this.createResult('Database', 'API Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Test specific service with detailed logging
   */
  static async testService(serviceName: 'facebook' | 'google' | 'ghl' | 'database'): Promise<TestResult[]> {
    console.log(`🧪 Testing ${serviceName} service...`);
    
    switch (serviceName) {
      case 'facebook':
        return await this.testFacebook();
      case 'google':
        return await this.testGoogle();
      case 'ghl':
        return await this.testGHL();
      case 'database':
        return await this.testDatabase();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Test API rate limiting
   */
  static async testRateLimiting(serviceName: string, requests: number = 10): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing rate limiting for ${serviceName} with ${requests} requests...`);
      
      const promises = Array.from({ length: requests }, async (_, index) => {
        const requestStart = Date.now();
        try {
          // This would be replaced with actual service calls
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
          const requestDuration = Date.now() - requestStart;
          return { success: true, duration: requestDuration, index };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error), index };
        }
      });
      
      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.success).length;
      const avgDuration = responses.reduce((sum, r) => sum + (r.duration || 0), 0) / responses.length;
      
      results.push(this.createResult(serviceName, 'Rate Limiting Test', successCount === requests, 
        successCount !== requests ? `${requests - successCount} requests failed` : undefined,
        { successCount, totalRequests: requests, avgDuration }));
      
    } catch (error) {
      results.push(this.createResult(serviceName, 'Rate Limiting Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Test error handling
   */
  static async testErrorHandling(serviceName: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing error handling for ${serviceName}...`);
      
      // Test with invalid parameters
      const { GoHighLevelService } = await import('@/services/api/goHighLevelService');
      
      try {
        await GoHighLevelService.getContacts('invalid-location-id', 10);
        results.push(this.createResult(serviceName, 'Error Handling - Invalid Location', false, 'Should have thrown error'));
      } catch (error) {
        results.push(this.createResult(serviceName, 'Error Handling - Invalid Location', true, undefined, { 
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error)
        }));
      }
      
    } catch (error) {
      results.push(this.createResult(serviceName, 'Error Handling Test Failed', false, error instanceof Error ? error.message : String(error)));
    }
    
    const duration = Date.now() - startTime;
    results.forEach(result => result.duration = duration);
    this.results.push(...results);
    
    return results;
  }

  /**
   * Get test results summary
   */
  static getResultsSummary(): {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
    avgDuration: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    const avgDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;
    
    return {
      total,
      passed,
      failed,
      successRate: Math.round(successRate * 10) / 10,
      avgDuration: Math.round(avgDuration)
    };
  }

  /**
   * Clear test results
   */
  static clearResults(): void {
    this.results = [];
    console.log('🧹 Test results cleared');
  }

  /**
   * Export test results to JSON
   */
  static exportResults(): string {
    const summary = this.getResultsSummary();
    const exportData = {
      summary,
      results: this.results,
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Create a test result object
   */
  private static createResult(service: string, test: string, success: boolean, error?: string, data?: any): TestResult {
    return {
      service,
      test,
      success,
      error,
      data,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).DevAPITester = DevAPITester;
}
