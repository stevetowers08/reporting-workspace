import { debugLogger } from '@/lib/debug';

export interface GHLClientConfig {
  apiKey: string;
  baseUrl?: string;
  locationId?: string;
}

export interface GHLTestResult {
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  responseTime?: number;
  data?: any;
  issues?: string[];
}

export interface GHLVerificationReport {
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: GHLTestResult[];
  commonIssues: string[];
  recommendations: string[];
  summary: {
    authentication: boolean;
    permissions: boolean;
    rateLimiting: boolean;
    schemaCompliance: boolean;
  };
}

export class GHLClientVerifier {
  private config: GHLClientConfig;
  private baseUrl: string;

  constructor(config: GHLClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://services.leadconnectorhq.com';
  }

  /**
   * Main verification method that runs all tests
   */
  async verifyClient(): Promise<GHLVerificationReport> {
    debugLogger.info('GHLClientVerifier', 'Starting GoHighLevel API 2.0 client verification');

    const results: GHLTestResult[] = [];
    const startTime = Date.now();

    // Test all API endpoints based on official API 2.0 documentation
    const testPromises = [
      this.testAuthentication(),
      this.testLocations(),
      this.testContacts(),
      this.testOpportunities(),
      this.testCampaigns(),
      this.testAppointments(),
      this.testCalendars(),
      this.testUsers(),
      this.testPipelines(),
      this.testCustomFields(),
      this.testWebhooks(),
      this.testTags(),
      this.testTasks(),
      this.testNotes(),
      this.testFiles(),
      this.testConversations(),
      this.testReports(),
      this.testIntegrations(),
      this.testRateLimiting()
    ];

    const testResults = await Promise.allSettled(testPromises);
    
    testResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          endpoint: `test_${index}`,
          method: 'UNKNOWN',
          success: false,
          error: result.reason?.message || 'Unknown error',
          issues: ['Test execution failed']
        });
      }
    });

    const totalTime = Date.now() - startTime;
    debugLogger.info('GHLClientVerifier', `Verification completed in ${totalTime}ms`);

    return this.generateReport(results);
  }

  /**
   * Test authentication and basic API access
   */
  private async testAuthentication(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/locations', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          endpoint: '/locations',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: data.locations?.slice(0, 3), // First 3 locations only
          issues: []
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/locations',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectAuthIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/locations',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error or API unreachable']
      };
    }
  }

  /**
   * Test locations endpoint
   */
  private async testLocations(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/locations', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateLocationsSchema(data);
        
        return {
          endpoint: '/locations',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.locations?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/locations',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/locations',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test contacts endpoint
   */
  private async testContacts(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/contacts', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateContactsSchema(data);
        
        return {
          endpoint: '/contacts',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.contacts?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/contacts',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/contacts',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test opportunities endpoint
   */
  private async testOpportunities(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/opportunities', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateOpportunitiesSchema(data);
        
        return {
          endpoint: '/opportunities',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.opportunities?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/opportunities',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/opportunities',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test campaigns endpoint
   */
  private async testCampaigns(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/campaigns', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateCampaignsSchema(data);
        
        return {
          endpoint: '/campaigns',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.campaigns?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/campaigns',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/campaigns',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test appointments endpoint
   */
  private async testAppointments(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/appointments', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateAppointmentsSchema(data);
        
        return {
          endpoint: '/appointments',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.appointments?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/appointments',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/appointments',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test calendars endpoint
   */
  private async testCalendars(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/calendars', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateCalendarsSchema(data);
        
        return {
          endpoint: '/calendars',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.calendars?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/calendars',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/calendars',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test users endpoint
   */
  private async testUsers(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/users', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateUsersSchema(data);
        
        return {
          endpoint: '/users',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.users?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/users',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/users',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test pipelines endpoint
   */
  private async testPipelines(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/pipelines', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validatePipelinesSchema(data);
        
        return {
          endpoint: '/pipelines',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.pipelines?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/pipelines',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/pipelines',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test custom fields endpoint
   */
  private async testCustomFields(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/custom-fields', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateCustomFieldsSchema(data);
        
        return {
          endpoint: '/custom-fields',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.customFields?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/custom-fields',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/custom-fields',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test webhooks endpoint
   */
  private async testWebhooks(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/webhooks', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateWebhooksSchema(data);
        
        return {
          endpoint: '/webhooks',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.webhooks?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/webhooks',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/webhooks',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test tags endpoint
   */
  private async testTags(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/tags', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateTagsSchema(data);
        
        return {
          endpoint: '/tags',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.tags?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/tags',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/tags',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test tasks endpoint
   */
  private async testTasks(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/tasks', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateTasksSchema(data);
        
        return {
          endpoint: '/tasks',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.tasks?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/tasks',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/tasks',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test notes endpoint
   */
  private async testNotes(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/notes', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateNotesSchema(data);
        
        return {
          endpoint: '/notes',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.notes?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/notes',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/notes',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test files endpoint
   */
  private async testFiles(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/files', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateFilesSchema(data);
        
        return {
          endpoint: '/files',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.files?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/files',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/files',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test conversations endpoint (replaces SMS/Email)
   */
  private async testConversations(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/conversations', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateConversationsSchema(data);
        
        return {
          endpoint: '/conversations',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.conversations?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/conversations',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/conversations',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test reports endpoint
   */
  private async testReports(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/reports', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateReportsSchema(data);
        
        return {
          endpoint: '/reports',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.reports?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/reports',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/reports',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test integrations endpoint
   */
  private async testIntegrations(): Promise<GHLTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/integrations', 'GET');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const issues = this.validateIntegrationsSchema(data);
        
        return {
          endpoint: '/integrations',
          method: 'GET',
          success: true,
          statusCode: response.status,
          responseTime,
          data: { count: data.integrations?.length || 0 },
          issues
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          endpoint: '/integrations',
          method: 'GET',
          success: false,
          statusCode: response.status,
          responseTime,
          error: errorData.message || response.statusText,
          issues: this.detectPermissionIssues(response.status, errorData)
        };
      }
    } catch (error) {
      return {
        endpoint: '/integrations',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Network error']
      };
    }
  }

  /**
   * Test rate limiting based on official API 2.0 limits:
   * - Burst Limit: 100 requests per 10 seconds per resource
   * - Daily Limit: 200,000 requests per day per resource
   */
  private async testRateLimiting(): Promise<GHLTestResult> {
    const startTime = Date.now();
    const requests = [];
    
    // Make 5 rapid requests to test burst limit (well under 100/10s limit)
    for (let i = 0; i < 5; i++) {
      requests.push(this.makeRequest('/locations', 'GET'));
    }

    try {
      const responses = await Promise.allSettled(requests);
      const responseTime = Date.now() - startTime;
      
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.ok
      ).length;
      
      const rateLimited = responses.some(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Check for rate limit headers
      const rateLimitHeaders = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<Response>).value.headers)
        .find(headers => headers.get('X-RateLimit-Remaining'));

      return {
        endpoint: '/locations (rate limit test)',
        method: 'GET',
        success: successCount > 0,
        statusCode: rateLimited ? 429 : 200,
        responseTime,
        data: { 
          requestsMade: 5, 
          successfulRequests: successCount,
          rateLimitHeaders: rateLimitHeaders ? {
            remaining: rateLimitHeaders.get('X-RateLimit-Remaining'),
            reset: rateLimitHeaders.get('X-RateLimit-Reset'),
            limit: rateLimitHeaders.get('X-RateLimit-Limit')
          } : null
        },
        issues: rateLimited ? ['Rate limiting detected - API 2.0 burst limit exceeded'] : []
      };
    } catch (error) {
      return {
        endpoint: '/locations (rate limit test)',
        method: 'GET',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        issues: ['Rate limit test failed']
      };
    }
  }

  /**
   * Make HTTP request to GHL API 2.0
   */
  private async makeRequest(endpoint: string, method: string): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'GHL-Client-Verifier/1.0',
      'X-API-Version': '2.0'
    };

    const options: RequestInit = {
      method,
      headers,
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    };

    return fetch(url, options);
  }

  /**
   * Detect authentication issues based on API 2.0 error responses
   */
  private detectAuthIssues(statusCode: number, errorData: any): string[] {
    const issues: string[] = [];

    switch (statusCode) {
      case 401:
        issues.push('Invalid API key or expired OAuth 2.0 token');
        if (errorData.message?.includes('token')) {
          issues.push('OAuth 2.0 access token has expired - implement token refresh');
        }
        break;
      case 403:
        issues.push('Insufficient permissions or API key not authorized for this endpoint');
        break;
      case 404:
        issues.push('API endpoint not found - verify base URL and endpoint path');
        break;
      case 422:
        issues.push('Invalid request parameters or malformed request body');
        break;
      case 429:
        issues.push('Rate limit exceeded - API 2.0 burst limit (100/10s) or daily limit (200k/day) reached');
        break;
      case 500:
        issues.push('Internal server error - GoHighLevel API issue');
        break;
      case 503:
        issues.push('Service temporarily unavailable - check GoHighLevel status page');
        break;
    }

    if (errorData.message) {
      if (errorData.message.includes('unauthorized')) {
        issues.push('API key lacks required OAuth 2.0 scopes for this endpoint');
      }
      if (errorData.message.includes('expired')) {
        issues.push('OAuth 2.0 access token has expired - use refresh token to obtain new access token');
      }
      if (errorData.message.includes('invalid')) {
        issues.push('API key format is invalid or malformed');
      }
      if (errorData.message.includes('scope')) {
        issues.push('Missing required OAuth 2.0 scopes - check authorization permissions');
      }
    }

    return issues;
  }

  /**
   * Detect permission issues specific to API 2.0
   */
  private detectPermissionIssues(statusCode: number, errorData: any): string[] {
    const issues: string[] = [];

    if (statusCode === 403) {
      issues.push('Insufficient permissions for this endpoint');
      
      if (errorData.message?.includes('scope')) {
        issues.push('Missing required OAuth 2.0 scopes - review authorization flow');
      }
      if (errorData.message?.includes('role')) {
        issues.push('User role does not have access to this resource');
      }
      if (errorData.message?.includes('location')) {
        issues.push('API key not associated with required location');
      }
      if (errorData.message?.includes('resource')) {
        issues.push('Access denied to specific resource - check resource permissions');
      }
    }

    return issues;
  }

  /**
   * Validate locations schema based on API 2.0
   */
  private validateLocationsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.locations || !Array.isArray(data.locations)) {
      issues.push('Locations data is not an array');
      return issues;
    }

    data.locations.forEach((location: any, index: number) => {
      if (!location.id) {
        issues.push(`Location ${index} missing required 'id' field`);
      }
      if (!location.name) {
        issues.push(`Location ${index} missing required 'name' field`);
      }
      if (!location.address) {
        issues.push(`Location ${index} missing 'address' field`);
      }
    });

    return issues;
  }

  /**
   * Validate contacts schema based on API 2.0
   */
  private validateContactsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.contacts || !Array.isArray(data.contacts)) {
      issues.push('Contacts data is not an array');
      return issues;
    }

    data.contacts.forEach((contact: any, index: number) => {
      if (!contact.id) {
        issues.push(`Contact ${index} missing required 'id' field`);
      }
      if (!contact.email && !contact.phone) {
        issues.push(`Contact ${index} missing both 'email' and 'phone' fields`);
      }
    });

    return issues;
  }

  /**
   * Validate opportunities schema based on API 2.0
   */
  private validateOpportunitiesSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.opportunities || !Array.isArray(data.opportunities)) {
      issues.push('Opportunities data is not an array');
      return issues;
    }

    data.opportunities.forEach((opportunity: any, index: number) => {
      if (!opportunity.id) {
        issues.push(`Opportunity ${index} missing required 'id' field`);
      }
      if (!opportunity.name) {
        issues.push(`Opportunity ${index} missing required 'name' field`);
      }
      if (!opportunity.pipelineId) {
        issues.push(`Opportunity ${index} missing 'pipelineId' field`);
      }
    });

    return issues;
  }

  /**
   * Validate campaigns schema based on API 2.0
   */
  private validateCampaignsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.campaigns || !Array.isArray(data.campaigns)) {
      issues.push('Campaigns data is not an array');
      return issues;
    }

    data.campaigns.forEach((campaign: any, index: number) => {
      if (!campaign.id) {
        issues.push(`Campaign ${index} missing required 'id' field`);
      }
      if (!campaign.name) {
        issues.push(`Campaign ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate appointments schema based on API 2.0
   */
  private validateAppointmentsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.appointments || !Array.isArray(data.appointments)) {
      issues.push('Appointments data is not an array');
      return issues;
    }

    data.appointments.forEach((appointment: any, index: number) => {
      if (!appointment.id) {
        issues.push(`Appointment ${index} missing required 'id' field`);
      }
      if (!appointment.startTime) {
        issues.push(`Appointment ${index} missing required 'startTime' field`);
      }
    });

    return issues;
  }

  /**
   * Validate calendars schema based on API 2.0
   */
  private validateCalendarsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.calendars || !Array.isArray(data.calendars)) {
      issues.push('Calendars data is not an array');
      return issues;
    }

    data.calendars.forEach((calendar: any, index: number) => {
      if (!calendar.id) {
        issues.push(`Calendar ${index} missing required 'id' field`);
      }
      if (!calendar.name) {
        issues.push(`Calendar ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate users schema based on API 2.0
   */
  private validateUsersSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.users || !Array.isArray(data.users)) {
      issues.push('Users data is not an array');
      return issues;
    }

    data.users.forEach((user: any, index: number) => {
      if (!user.id) {
        issues.push(`User ${index} missing required 'id' field`);
      }
      if (!user.email) {
        issues.push(`User ${index} missing required 'email' field`);
      }
    });

    return issues;
  }

  /**
   * Validate pipelines schema based on API 2.0
   */
  private validatePipelinesSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.pipelines || !Array.isArray(data.pipelines)) {
      issues.push('Pipelines data is not an array');
      return issues;
    }

    data.pipelines.forEach((pipeline: any, index: number) => {
      if (!pipeline.id) {
        issues.push(`Pipeline ${index} missing required 'id' field`);
      }
      if (!pipeline.name) {
        issues.push(`Pipeline ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate custom fields schema based on API 2.0
   */
  private validateCustomFieldsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.customFields || !Array.isArray(data.customFields)) {
      issues.push('Custom fields data is not an array');
      return issues;
    }

    data.customFields.forEach((field: any, index: number) => {
      if (!field.id) {
        issues.push(`Custom field ${index} missing required 'id' field`);
      }
      if (!field.name) {
        issues.push(`Custom field ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate webhooks schema based on API 2.0
   */
  private validateWebhooksSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.webhooks || !Array.isArray(data.webhooks)) {
      issues.push('Webhooks data is not an array');
      return issues;
    }

    data.webhooks.forEach((webhook: any, index: number) => {
      if (!webhook.id) {
        issues.push(`Webhook ${index} missing required 'id' field`);
      }
      if (!webhook.url) {
        issues.push(`Webhook ${index} missing required 'url' field`);
      }
    });

    return issues;
  }

  /**
   * Validate tags schema based on API 2.0
   */
  private validateTagsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.tags || !Array.isArray(data.tags)) {
      issues.push('Tags data is not an array');
      return issues;
    }

    data.tags.forEach((tag: any, index: number) => {
      if (!tag.id) {
        issues.push(`Tag ${index} missing required 'id' field`);
      }
      if (!tag.name) {
        issues.push(`Tag ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate tasks schema based on API 2.0
   */
  private validateTasksSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.tasks || !Array.isArray(data.tasks)) {
      issues.push('Tasks data is not an array');
      return issues;
    }

    data.tasks.forEach((task: any, index: number) => {
      if (!task.id) {
        issues.push(`Task ${index} missing required 'id' field`);
      }
      if (!task.title) {
        issues.push(`Task ${index} missing required 'title' field`);
      }
    });

    return issues;
  }

  /**
   * Validate notes schema based on API 2.0
   */
  private validateNotesSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.notes || !Array.isArray(data.notes)) {
      issues.push('Notes data is not an array');
      return issues;
    }

    data.notes.forEach((note: any, index: number) => {
      if (!note.id) {
        issues.push(`Note ${index} missing required 'id' field`);
      }
      if (!note.body) {
        issues.push(`Note ${index} missing required 'body' field`);
      }
    });

    return issues;
  }

  /**
   * Validate files schema based on API 2.0
   */
  private validateFilesSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.files || !Array.isArray(data.files)) {
      issues.push('Files data is not an array');
      return issues;
    }

    data.files.forEach((file: any, index: number) => {
      if (!file.id) {
        issues.push(`File ${index} missing required 'id' field`);
      }
      if (!file.name) {
        issues.push(`File ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate conversations schema based on API 2.0
   */
  private validateConversationsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.conversations || !Array.isArray(data.conversations)) {
      issues.push('Conversations data is not an array');
      return issues;
    }

    data.conversations.forEach((conversation: any, index: number) => {
      if (!conversation.id) {
        issues.push(`Conversation ${index} missing required 'id' field`);
      }
      if (!conversation.type) {
        issues.push(`Conversation ${index} missing required 'type' field`);
      }
    });

    return issues;
  }

  /**
   * Validate reports schema based on API 2.0
   */
  private validateReportsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.reports || !Array.isArray(data.reports)) {
      issues.push('Reports data is not an array');
      return issues;
    }

    data.reports.forEach((report: any, index: number) => {
      if (!report.id) {
        issues.push(`Report ${index} missing required 'id' field`);
      }
      if (!report.name) {
        issues.push(`Report ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Validate integrations schema based on API 2.0
   */
  private validateIntegrationsSchema(data: any): string[] {
    const issues: string[] = [];

    if (!data.integrations || !Array.isArray(data.integrations)) {
      issues.push('Integrations data is not an array');
      return issues;
    }

    data.integrations.forEach((integration: any, index: number) => {
      if (!integration.id) {
        issues.push(`Integration ${index} missing required 'id' field`);
      }
      if (!integration.name) {
        issues.push(`Integration ${index} missing required 'name' field`);
      }
    });

    return issues;
  }

  /**
   * Generate comprehensive verification report
   */
  private generateReport(results: GHLTestResult[]): GHLVerificationReport {
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;
    const totalTests = results.length;

    // Collect all issues
    const allIssues = results.flatMap(r => r.issues || []);
    const commonIssues = this.identifyCommonIssues(allIssues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, commonIssues);

    // Determine summary status
    const summary = {
      authentication: results.some(r => r.endpoint === '/locations' && r.success),
      permissions: results.filter(r => !r.success && r.statusCode === 403).length === 0,
      rateLimiting: results.some(r => r.endpoint.includes('rate limit') && !r.success),
      schemaCompliance: results.filter(r => r.success && (r.issues?.length || 0) > 0).length === 0
    };

    return {
      overallSuccess: failedTests === 0,
      totalTests,
      passedTests,
      failedTests,
      results,
      commonIssues,
      recommendations,
      summary
    };
  }

  /**
   * Identify common issues across all tests
   */
  private identifyCommonIssues(allIssues: string[]): string[] {
    const issueCounts = new Map<string, number>();
    
    allIssues.forEach(issue => {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
    });

    // Return issues that appear more than once
    return Array.from(issueCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([issue, _]) => issue)
      .sort();
  }

  /**
   * Generate recommendations based on test results and API 2.0 best practices
   */
  private generateRecommendations(results: GHLTestResult[], commonIssues: string[]): string[] {
    const recommendations: string[] = [];

    // Authentication issues
    if (results.some(r => r.statusCode === 401)) {
      recommendations.push('Check your API key - it may be invalid or expired. For API 2.0, ensure you\'re using OAuth 2.0 tokens');
    }

    // Permission issues
    if (results.some(r => r.statusCode === 403)) {
      recommendations.push('Review OAuth 2.0 scopes and ensure your API key has access to required endpoints');
    }

    // Rate limiting
    if (results.some(r => r.statusCode === 429)) {
      recommendations.push('Implement rate limiting in your application. API 2.0 limits: 100 requests/10s burst, 200k/day');
    }

    // Schema issues
    if (commonIssues.some(issue => issue.includes('missing required'))) {
      recommendations.push('Update your data handling to account for missing required fields in API 2.0 responses');
    }

    // Network issues
    if (results.some(r => r.issues?.includes('Network error'))) {
      recommendations.push('Check your network connection and verify API endpoint URLs');
    }

    // Performance issues
    const slowRequests = results.filter(r => r.responseTime && r.responseTime > 5000);
    if (slowRequests.length > 0) {
      recommendations.push('Consider implementing request caching for slow endpoints');
    }

    // OAuth 2.0 specific recommendations
    if (results.some(r => r.issues?.some(issue => issue.includes('OAuth 2.0')))) {
      recommendations.push('Implement OAuth 2.0 token refresh mechanism for long-running applications');
    }

    // API version specific
    if (results.some(r => r.statusCode === 404)) {
      recommendations.push('Verify you\'re using the correct API 2.0 endpoints and base URL');
    }

    return recommendations;
  }
}

/**
 * Main verification function
 */
export async function verifyGHLClient(config: GHLClientConfig): Promise<GHLVerificationReport> {
  const verifier = new GHLClientVerifier(config);
  return await verifier.verifyClient();
}

/**
 * Quick verification function for basic testing
 */
export async function quickVerifyGHLClient(apiKey: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const verifier = new GHLClientVerifier({ apiKey });
    const report = await verifier.verifyClient();
    
    return {
      success: report.overallSuccess,
      message: report.overallSuccess 
        ? 'GHL API 2.0 client verification passed' 
        : `${report.failedTests} out of ${report.totalTests} tests failed`,
      details: {
        passedTests: report.passedTests,
        failedTests: report.failedTests,
        commonIssues: report.commonIssues,
        recommendations: report.recommendations,
        summary: report.summary
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : error }
    };
  }
}
