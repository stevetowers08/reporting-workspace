# Integrations Guide

## Overview

This project integrates with multiple external APIs and services to provide comprehensive marketing analytics. This guide covers setup, implementation, and testing strategies for all integrations.

## Integration Architecture

### Service Layer Pattern
Each external service has its own service file in `src/services/` that handles:
- Authentication and token management
- API communication
- Data normalization
- Error handling
- Rate limiting

### Data Flow
```
External API → Service Layer → Database → React Query → UI Components
```

## Facebook Marketing API

### Setup

#### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Marketing API" product
4. Get App ID and App Secret

#### 2. Configure OAuth
```typescript
// src/services/facebookAdsService.ts
interface FacebookConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string[];
}

const facebookConfig: FacebookConfig = {
  appId: process.env.REACT_APP_FACEBOOK_APP_ID!,
  appSecret: process.env.REACT_APP_FACEBOOK_APP_SECRET!,
  redirectUri: `${window.location.origin}/oauth/callback`,
  scope: ['ads_read', 'ads_management', 'business_management']
};
```

#### 3. Environment Variables
```bash
# .env.local
REACT_APP_FACEBOOK_APP_ID=your_app_id
REACT_APP_FACEBOOK_APP_SECRET=your_app_secret
REACT_APP_FACEBOOK_REDIRECT_URI=http://localhost:8080/oauth/callback
```

#### 4. Common Issues and Fixes

**Demographics Error**: `(#100) age, gender are not valid for fields param`
- **Problem**: Including `age` and `gender` in the `fields` parameter
- **Solution**: Use `breakdowns` parameter instead:
```typescript
// ❌ INCORRECT
const fields = ['impressions', 'clicks', 'spend', 'age', 'gender'];

// ✅ CORRECT
const fields = ['impressions', 'clicks', 'spend'];
const breakdowns = 'age,gender';
```

**Platform Error**: `(#100) placement is not valid for breakdowns param`
- **Problem**: Including `publisher_platform` and `placement` in the `fields` parameter
- **Solution**: Use `breakdowns` parameter instead:
```typescript
// ❌ INCORRECT
const fields = ['impressions', 'clicks', 'spend', 'publisher_platform', 'placement'];

// ✅ CORRECT
const fields = ['impressions', 'clicks', 'spend'];
const breakdowns = 'publisher_platform,placement';
```

### Implementation

#### Authentication Service
```typescript
// src/services/facebookAdsService.ts
export class FacebookAdsService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private accessToken: string | null = null;

  async authenticate(): Promise<AuthResult> {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${facebookConfig.appId}&` +
      `redirect_uri=${facebookConfig.redirectUri}&` +
      `scope=${facebookConfig.scope.join(',')}&` +
      `response_type=code`;

    window.location.href = authUrl;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: facebookConfig.appId,
        client_secret: facebookConfig.appSecret,
        redirect_uri: facebookConfig.redirectUri,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: facebookConfig.appId,
        client_secret: facebookConfig.appSecret,
        fb_exchange_token: refreshToken
      })
    });

    return response.json();
  }
}
```

#### Data Fetching
```typescript
export class FacebookAdsService {
  async getAdAccounts(): Promise<AdAccount[]> {
    const response = await fetch(
      `${this.baseUrl}/me/adaccounts?access_token=${this.accessToken}&fields=id,name,account_status,currency`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ad accounts');
    }

    const data = await response.json();
    return data.data.map(this.normalizeAdAccount);
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    const response = await fetch(
      `${this.baseUrl}/${accountId}/campaigns?access_token=${this.accessToken}&fields=id,name,status,objective,start_time,end_time,daily_budget,lifetime_budget`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }

    const data = await response.json();
    return data.data.map(this.normalizeCampaign);
  }

  async getCampaignMetrics(campaignId: string, dateRange: DateRange): Promise<CampaignMetrics[]> {
    const response = await fetch(
      `${this.baseUrl}/${campaignId}/insights?` +
      `access_token=${this.accessToken}&` +
      `fields=impressions,clicks,spend,conversions&` +
      `time_range={"since":"${dateRange.start}","until":"${dateRange.end}"}&` +
      `level=campaign&breakdowns=day`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch campaign metrics');
    }

    const data = await response.json();
    return data.data.map(this.normalizeMetrics);
  }

  private normalizeAdAccount(raw: any): AdAccount {
    return {
      id: raw.id,
      name: raw.name,
      status: raw.account_status,
      currency: raw.currency,
      platform: 'facebook'
    };
  }

  private normalizeCampaign(raw: any): Campaign {
    return {
      id: raw.id,
      name: raw.name,
      status: raw.status,
      objective: raw.objective,
      startDate: raw.start_time,
      endDate: raw.end_time,
      budget: raw.daily_budget || raw.lifetime_budget,
      platform: 'facebook'
    };
  }

  private normalizeMetrics(raw: any): CampaignMetrics {
    return {
      date: raw.date_start,
      impressions: parseInt(raw.impressions) || 0,
      clicks: parseInt(raw.clicks) || 0,
      spend: parseFloat(raw.spend) || 0,
      conversions: parseInt(raw.conversions) || 0
    };
  }
}
```

## Google Ads API

### Setup

#### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Ads API
4. Create OAuth 2.0 credentials

#### 2. Configure OAuth
```typescript
// src/services/googleAdsService.ts
interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

const googleConfig: GoogleConfig = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID!,
  clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET!,
  redirectUri: `${window.location.origin}/oauth/callback`,
  scope: ['https://www.googleapis.com/auth/adwords']
};
```

#### 3. Environment Variables
```bash
# .env.local
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_client_secret
REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:8080/oauth/callback
```

### Implementation

#### Authentication Service
```typescript
// src/services/googleAdsService.ts
export class GoogleAdsService {
  private baseUrl = 'https://googleads.googleapis.com/v14';
  private accessToken: string | null = null;

  async authenticate(): Promise<AuthResult> {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleConfig.clientId}&` +
      `redirect_uri=${googleConfig.redirectUri}&` +
      `scope=${googleConfig.scope.join(' ')}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        redirect_uri: googleConfig.redirectUri,
        code: code,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    return response.json();
  }
}
```

#### Data Fetching
```typescript
export class GoogleAdsService {
  async getCustomers(): Promise<Customer[]> {
    const response = await fetch(
      `${this.baseUrl}/customers:listAccessibleCustomers`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': process.env.REACT_APP_GOOGLE_DEVELOPER_TOKEN!
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    const data = await response.json();
    return data.resourceNames.map(this.normalizeCustomer);
  }

  async getCampaigns(customerId: string): Promise<Campaign[]> {
    const response = await fetch(
      `${this.baseUrl}/customers/${customerId}/campaigns`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': process.env.REACT_APP_GOOGLE_DEVELOPER_TOKEN!
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }

    const data = await response.json();
    return data.results.map(this.normalizeCampaign);
  }

  async getCampaignMetrics(customerId: string, campaignId: string, dateRange: DateRange): Promise<CampaignMetrics[]> {
    const query = `
      SELECT 
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign 
      WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    `;

    const response = await fetch(
      `${this.baseUrl}/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': process.env.REACT_APP_GOOGLE_DEVELOPER_TOKEN!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch campaign metrics');
    }

    const data = await response.json();
    return data.results.map(this.normalizeMetrics);
  }

  private normalizeCustomer(raw: any): Customer {
    return {
      id: raw.split('/').pop(),
      name: raw.split('/').pop(), // Extract from resource name
      platform: 'google'
    };
  }

  private normalizeCampaign(raw: any): Campaign {
    return {
      id: raw.resourceName.split('/').pop(),
      name: raw.name,
      status: raw.status,
      objective: raw.advertisingChannelType,
      startDate: raw.startDate,
      endDate: raw.endDate,
      budget: raw.campaignBudget ? parseFloat(raw.campaignBudget.split('/').pop()) : 0,
      platform: 'google'
    };
  }

  private normalizeMetrics(raw: any): CampaignMetrics {
    return {
      date: raw.segments.date,
      impressions: parseInt(raw.metrics.impressions) || 0,
      clicks: parseInt(raw.metrics.clicks) || 0,
      spend: parseFloat(raw.metrics.costMicros) / 1000000 || 0, // Convert micros to dollars
      conversions: parseInt(raw.metrics.conversions) || 0
    };
  }
}
```

## Go High Level Integration

### Setup

#### 1. Create Go High Level Account
1. Go to [Go High Level](https://gohighlevel.com/)
2. Create an account and get API access
3. Generate API key from settings
4. Get Location ID from your account

#### 2. Environment Variables
```bash
# .env.local
REACT_APP_GHL_API_KEY=your_ghl_api_key
REACT_APP_GHL_LOCATION_ID=your_ghl_location_id
```

#### 3. Implementation
```typescript
// src/services/goHighLevelService.ts
export class GoHighLevelService {
  private baseUrl = 'https://rest.gohighlevel.com/v1';
  private apiKey: string;
  private locationId: string;

  constructor() {
    this.apiKey = process.env.REACT_APP_GHL_API_KEY!;
    this.locationId = process.env.REACT_APP_GHL_LOCATION_ID!;
  }

  async getContacts(): Promise<Contact[]> {
    const response = await fetch(
      `${this.baseUrl}/contacts/?locationId=${this.locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }

    const data = await response.json();
    return data.contacts.map(this.normalizeContact);
  }

  async getOpportunities(): Promise<Opportunity[]> {
    const response = await fetch(
      `${this.baseUrl}/opportunities/?locationId=${this.locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch opportunities');
    }

    const data = await response.json();
    return data.opportunities.map(this.normalizeOpportunity);
  }

  private normalizeContact(raw: any): Contact {
    return {
      id: raw.id,
      email: raw.email,
      phone: raw.phone,
      firstName: raw.firstName,
      lastName: raw.lastName,
      companyName: raw.companyName,
      source: raw.source,
      createdAt: raw.createdAt
    };
  }

  private normalizeOpportunity(raw: any): Opportunity {
    return {
      id: raw.id,
      contactId: raw.contactId,
      title: raw.title,
      value: raw.value,
      status: raw.status,
      pipelineId: raw.pipelineId,
      createdAt: raw.createdAt
    };
  }
}
```

## Supabase Integration

### Setup

#### 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Get project URL and anon key

#### 2. Environment Variables
```bash
# .env.local
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### Implementation

#### Database Service
```typescript
// src/services/databaseService.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

export class DatabaseService {
  async saveCampaignData(campaigns: Campaign[]): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .upsert(campaigns.map(this.prepareCampaignForDb));

    if (error) {
      throw new Error(`Failed to save campaign data: ${error.message}`);
    }
  }

  async saveMetricsData(metrics: CampaignMetrics[]): Promise<void> {
    const { error } = await supabase
      .from('campaign_metrics')
      .upsert(metrics.map(this.prepareMetricsForDb));

    if (error) {
      throw new Error(`Failed to save metrics data: ${error.message}`);
    }
  }

  async getCampaignData(clientId: string, dateRange: DateRange): Promise<CampaignData[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_metrics (
          date,
          impressions,
          clicks,
          spend,
          conversions
        )
      `)
      .eq('client_id', clientId)
      .gte('start_date', dateRange.start)
      .lte('end_date', dateRange.end);

    if (error) {
      throw new Error(`Failed to fetch campaign data: ${error.message}`);
    }

    return data.map(this.normalizeCampaignData);
  }

  private prepareCampaignForDb(campaign: Campaign): any {
    return {
      platform_campaign_id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      budget: campaign.budget,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      platform: campaign.platform
    };
  }

  private prepareMetricsForDb(metrics: CampaignMetrics): any {
    return {
      campaign_id: metrics.campaignId,
      date: metrics.date,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      spend: metrics.spend,
      conversions: metrics.conversions
    };
  }

  private normalizeCampaignData(raw: any): CampaignData {
    return {
      id: raw.id,
      name: raw.name,
      platform: raw.platform,
      status: raw.status,
      budget: raw.budget,
      metrics: raw.campaign_metrics || []
    };
  }
}
```

## Testing Integrations

### Mock Service Worker (MSW)

#### Setup
```bash
npm install --save-dev msw
```

#### Mock Handlers
```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Facebook API mocks
  rest.get('https://graph.facebook.com/v18.0/me/adaccounts', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '123456789',
            name: 'Test Ad Account',
            account_status: 'ACTIVE',
            currency: 'USD'
          }
        ]
      })
    );
  }),

  rest.get('https://graph.facebook.com/v18.0/:accountId/campaigns', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '987654321',
            name: 'Test Campaign',
            status: 'ACTIVE',
            objective: 'CONVERSIONS',
            start_time: '2024-01-01',
            end_time: '2024-12-31',
            daily_budget: 100
          }
        ]
      })
    );
  }),

  // Google Ads API mocks
  rest.get('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', (req, res, ctx) => {
    return res(
      ctx.json({
        resourceNames: ['customers/1234567890']
      })
    );
  }),

  rest.post('https://googleads.googleapis.com/v14/customers/:customerId/googleAds:search', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          {
            segments: { date: '2024-01-01' },
            metrics: {
              impressions: '1000',
              clicks: '50',
              costMicros: '50000000', // $50
              conversions: '5'
            }
          }
        ]
      })
    );
  }),

  // Supabase mocks
  rest.post('https://your-project.supabase.co/rest/v1/campaigns', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),

  rest.get('https://your-project.supabase.co/rest/v1/campaigns', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: 'Test Campaign',
          platform: 'facebook',
          status: 'active',
          budget: 1000,
          campaign_metrics: [
            {
              date: '2024-01-01',
              impressions: 1000,
              clicks: 50,
              spend: 50,
              conversions: 5
            }
          ]
        }
      ])
    );
  })
];
```

#### Test Setup
```typescript
// src/setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Integration Tests

#### Service Tests
```typescript
// src/services/__tests__/facebookAdsService.test.ts
import { FacebookAdsService } from '../facebookAdsService';
import { server } from '../../setupTests';
import { rest } from 'msw';

describe('FacebookAdsService', () => {
  let service: FacebookAdsService;

  beforeEach(() => {
    service = new FacebookAdsService();
  });

  it('should fetch ad accounts', async () => {
    const accounts = await service.getAdAccounts();
    
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id: '123456789',
      name: 'Test Ad Account',
      status: 'ACTIVE',
      platform: 'facebook'
    });
  });

  it('should handle API errors', async () => {
    server.use(
      rest.get('https://graph.facebook.com/v18.0/me/adaccounts', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
      })
    );

    await expect(service.getAdAccounts()).rejects.toThrow('Failed to fetch ad accounts');
  });

  it('should normalize campaign data', async () => {
    const campaigns = await service.getCampaigns('123456789');
    
    expect(campaigns[0]).toMatchObject({
      id: '987654321',
      name: 'Test Campaign',
      status: 'ACTIVE',
      platform: 'facebook'
    });
  });
});
```

#### End-to-End Tests
```typescript
// tests/e2e/integrations.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Integrations', () => {
  test('should connect to Facebook Ads', async ({ page }) => {
    await page.goto('/admin/integrations');
    
    // Click Facebook connect button
    await page.click('[data-testid="connect-facebook"]');
    
    // Mock OAuth callback
    await page.goto('/oauth/callback?code=test_code&state=facebook');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Facebook connected successfully');
  });

  test('should display campaign data from Facebook', async ({ page }) => {
    await page.goto('/facebook-ads');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="campaign-table"]');
    
    // Verify campaign data is displayed
    await expect(page.locator('[data-testid="campaign-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="campaign-name"]')).toContainText('Test Campaign');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/graph.facebook.com/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/facebook-ads');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load campaign data');
  });
});
```

### Performance Testing

#### Load Testing
```typescript
// tests/performance/api-load.test.ts
import { test, expect } from '@playwright/test';

test.describe('API Performance', () => {
  test('should handle multiple concurrent requests', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to dashboard which loads data from multiple APIs
    await page.goto('/');
    
    // Wait for all data to load
    await page.waitForSelector('[data-testid="campaign-metrics"]');
    await page.waitForSelector('[data-testid="facebook-campaigns"]');
    await page.waitForSelector('[data-testid="google-campaigns"]');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should cache API responses', async ({ page }) => {
    await page.goto('/facebook-ads');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="campaign-table"]');
    
    // Navigate away and back
    await page.goto('/');
    await page.goto('/facebook-ads');
    
    // Data should load from cache (faster)
    const loadTime = await page.evaluate(() => {
      const start = performance.now();
      return new Promise(resolve => {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const apiCall = entries.find(entry => entry.name.includes('facebook'));
          if (apiCall) {
            resolve(apiCall.duration);
          }
        });
        observer.observe({ entryTypes: ['resource'] });
      });
    });

    // Cached response should be much faster
    expect(loadTime).toBeLessThan(100);
  });
});
```

## Error Handling

### Retry Logic
```typescript
// src/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
}
```

### Rate Limiting
```typescript
// src/lib/rateLimiter.ts
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}
```

## Security Considerations

### Token Management
- Store tokens securely in HTTP-only cookies
- Implement automatic token refresh
- Use short-lived access tokens
- Implement proper token revocation

### API Key Protection
- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement proper CORS policies
- Use HTTPS for all API communications

### Data Privacy
- Implement proper data encryption
- Follow GDPR/CCPA compliance
- Implement data retention policies
- Provide data deletion capabilities

---

For development setup, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).  
For testing strategies, see [TESTING.md](./TESTING.md).  
For troubleshooting, see [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md).
