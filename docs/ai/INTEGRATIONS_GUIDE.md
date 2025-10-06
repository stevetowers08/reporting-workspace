Hu# Integrations Guide

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

### Overview

Go High Level (GHL) is a comprehensive CRM and marketing automation platform that provides contact management, pipeline tracking, and conversion analytics. Our integration uses **Private Integration Tokens (PIT)** for simplified authentication and supports **lazy loading** for optimal performance.

### Setup

#### 1. Create Private Integration Token
1. Go to [Go High Level](https://gohighlevel.com/)
2. Navigate to **Settings → Private Integrations**
3. Create a new integration with these scopes:
   - `locations.readonly` - List all sub-accounts
   - `companies.readonly` - Access company information
   - `contacts.readonly` - Access contact data
   - `opportunities.readonly` - Access pipeline data
   - `calendars.readonly` - Access calendar events
   - `funnels/funnel.readonly` - Access funnel data
   - `funnels/page.readonly` - Access page data
   - `conversations.readonly` - Access conversation data
4. Copy the generated token (starts with `pit-`)

#### 2. Single Agency Token Approach
```typescript
// src/services/api/goHighLevelService.ts
export class GoHighLevelService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static agencyToken: string | null = null;
  
  // Token format validation
  static validateTokenFormat(token: string): boolean {
    return token.startsWith('pit-');
  }
  
  // Load agency token from database
  static async loadAgencyToken(): Promise<void> {
    const integrations = await DatabaseService.getIntegrations();
    const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel');
    
    if (ghlIntegration?.connected && ghlIntegration.config?.agencyToken) {
      this.agencyToken = ghlIntegration.config.agencyToken;
    }
  }
}
```

#### 3. Environment Variables
```bash
# .env.local - No longer needed for GHL!
# Private Integration Tokens are stored in the database
# Only Supabase configuration is required
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4. Database Setup
```sql
-- Create GHL app credentials table
CREATE TABLE ghl_app_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'development',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create integrations table for storing tokens
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  account_id TEXT,
  connected BOOLEAN DEFAULT false,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Implementation

#### Service Architecture with Lazy Loading
```typescript
// src/services/api/goHighLevelService.ts
export class GoHighLevelService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static agencyToken: string | null = null;
  
  // Lazy loading states for UI components
  private static facebookAccountsLoaded = false;
  private static googleAccountsLoaded = false;
  private static ghlAccountsLoaded = false;
  
  // Caching and rate limiting
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second
}
```

#### Private Integration Token Flow
```typescript
export class GoHighLevelService {
  /**
   * Test and validate agency token
   */
  static async testAgencyToken(token: string): Promise<{
    valid: boolean;
    capabilities: string[];
    companyId?: string;
  }> {
    if (!this.validateTokenFormat(token)) {
      throw new Error('Invalid token format. Must start with "pit-"');
    }

    try {
      // Test with company info endpoint
      const response = await fetch(`${this.API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        valid: true,
        capabilities: ['locations.readonly', 'contacts.readonly', 'opportunities.readonly'],
        companyId: 'WgNZ7xm35vYaZwflSov7' // Known company ID
      };
    } catch (error) {
      throw new Error(`Token test failed: ${error.message}`);
    }
  }

  /**
   * Get all locations using agency token
   */
  static async getAllLocations(): Promise<Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    website: string;
    timezone: string;
    currency: string;
    status: string;
  }>> {
    try {
      if (!this.agencyToken) {
        await this.loadAgencyToken();
      }

      if (!this.agencyToken) {
        throw new Error('Agency token not set. Please configure in admin settings.');
      }

      const { companyId } = await this.getCompanyInfo();

      const response = await fetch(`${this.API_BASE_URL}/locations/search?companyId=${companyId}&limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.agencyToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get locations: ${response.statusText}`);
      }

      const data = await response.json();
      const locations = data.locations || [];
      
      return locations.map((location: any) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.postalCode || location.zipCode,
        country: location.country,
        phone: location.phone,
        website: location.website,
        timezone: location.timezone,
        currency: location.currency,
        status: location.status || 'active'
      }));

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get contacts for a specific location
   */
  static async getContacts(locationId: string, limit = 100, offset = 0): Promise<GHLContact[]> {
    try {
      if (!this.agencyToken) {
        await this.loadAgencyToken();
      }

      if (!this.agencyToken) {
        throw new Error('Agency token not set. Please configure in admin settings.');
      }

      const searchBody = {
        locationId: locationId,
        limit: limit,
        offset: offset,
        query: {}
      };
      
      const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.agencyToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to get contacts: ${response.statusText}`);
      }

      const data = await response.json();
      return data.contacts || [];

    } catch (error) {
      throw error;
    }
  }
}
```

#### Data Fetching with Caching
```typescript
export class GoHighLevelService {
  /**
   * Get comprehensive GHL metrics for dashboard
   */
  static async getGHLMetrics(dateRange?: { start: string; end: string }): Promise<{
    totalContacts: number;
    newContacts: number;
    totalGuests: number;
    averageGuestsPerLead: number;
    sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
    guestCountDistribution: Array<{ range: string; count: number; percentage: number }>;
    eventTypeBreakdown: Array<{ type: string; count: number; percentage: number }>;
    recentContacts: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      source: string;
      dateAdded: string;
      guestCount?: number;
      eventDate?: string;
    }>;
    conversionRate: number;
    topPerformingSources: Array<{ source: string; leads: number; avgGuests: number }>;
    pageViewAnalytics: {
      totalPageViews: number;
      uniquePages: Array<{ page: string; views: number; percentage: number }>;
      topLandingPages: Array<{ url: string; views: number; conversions: number; conversionRate: number }>;
      utmCampaigns: Array<{ campaign: string; views: number; conversions: number; conversionRate: number }>;
      utmSources: Array<{ source: string; views: number; conversions: number; conversionRate: number }>;
      referrerBreakdown: Array<{ referrer: string; views: number; percentage: number }>;
    };
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-metrics-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached GHL metrics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Get all contacts with pagination
      const allContacts = await this.getAllContacts();
      
      // Filter by date range if provided
      let filteredContacts = allContacts;
      if (dateRange) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        filteredContacts = allContacts.filter(contact => {
          const contactDate = new Date(contact.dateAdded);
          return contactDate >= startDate && contactDate <= endDate;
        });
      }

      // Calculate metrics
      const totalContacts = allContacts.length;
      const newContacts = filteredContacts.length;
      
      // Extract guest counts from custom fields (dynamic approach)
      const contactsWithGuests = filteredContacts.filter(contact => {
        if (!contact.customFields || contact.customFields.length === 0) return false;
        
        // Look for numeric values in custom fields (likely guest counts)
        return contact.customFields.some((field: any) => {
          const value = parseInt(field.value);
          return !isNaN(value) && value > 0 && value <= 500; // Reasonable guest count range
        });
      });
      
      const guestCounts = contactsWithGuests.map(contact => {
        if (!contact.customFields) return 0;
        
        // Find the first numeric field that looks like a guest count
        const guestField = contact.customFields.find((field: any) => {
          const value = parseInt(field.value);
          return !isNaN(value) && value > 0 && value <= 500;
        });
        
        return guestField ? parseInt(guestField.value) : 0;
      }).filter(count => count > 0);
      
      const totalGuests = guestCounts.reduce((sum, count) => sum + count, 0);
      const averageGuestsPerLead = guestCounts.length > 0 ? totalGuests / guestCounts.length : 0;

      // Source breakdown
      const sourceCounts = filteredContacts.reduce((acc, contact) => {
        const source = contact.source || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count: count as number,
        percentage: newContacts > 0 ? ((count as number) / newContacts) * 100 : 0
      })).sort((a, b) => (b.count as number) - (a.count as number));

      // Guest count distribution
      const guestRanges = [
        { range: '1-25', min: 1, max: 25 },
        { range: '26-50', min: 26, max: 50 },
        { range: '51-100', min: 51, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '200+', min: 201, max: Infinity }
      ];

      const guestCountDistribution = guestRanges.map(range => {
        const count = guestCounts.filter(guestCount => guestCount >= range.min && guestCount <= range.max).length;
        return {
          range: range.range,
          count: count as number,
          percentage: guestCounts.length > 0 ? (count / guestCounts.length) * 100 : 0
        };
      });

      // Recent contacts (last 10)
      const recentContacts = filteredContacts
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 10)
        .map(contact => {
          const guestField = contact.customFields?.find((field: any) => {
            const value = parseInt(field.value);
            return !isNaN(value) && value > 0 && value <= 500;
          });
          const dateField = contact.customFields?.find((field: any) => field.id === 'Y0VtlMHIFGgRtqQimAdg');
          
          return {
            id: contact.id,
            name: contact.contactName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            email: contact.email || '',
            phone: contact.phone || '',
            source: contact.source || 'Unknown',
            dateAdded: contact.dateAdded,
            guestCount: guestField ? parseInt(guestField.value) : undefined,
            eventDate: dateField ? new Date(parseInt(dateField.value)).toISOString().split('T')[0] : undefined
          };
        });

      // Conversion rate (contacts with guest count / total contacts)
      const conversionRate = newContacts > 0 ? (contactsWithGuests.length / newContacts) * 100 : 0;

      // Top performing sources
      const topPerformingSources = sourceBreakdown.slice(0, 3).map(source => {
        const sourceContacts = filteredContacts.filter(contact => contact.source === source.source);
        const sourceGuestCounts = sourceContacts.map(contact => {
          const guestField = contact.customFields?.find((field: any) => {
            const value = parseInt(field.value);
            return !isNaN(value) && value > 0 && value <= 500;
          });
          return guestField ? parseInt(guestField.value) : 0;
        }).filter(count => count > 0);
        
        const avgGuests = sourceGuestCounts.length > 0 
          ? sourceGuestCounts.reduce((sum, count) => sum + count, 0) / sourceGuestCounts.length 
          : 0;

        return {
          source: source.source,
          leads: source.count as number,
          avgGuests: Math.round(avgGuests)
        };
      });

      const result = {
        totalContacts,
        newContacts,
        totalGuests,
        averageGuestsPerLead: Math.round(averageGuestsPerLead),
        sourceBreakdown,
        guestCountDistribution,
        eventTypeBreakdown: [], // Can be extended based on custom fields
        recentContacts,
        conversionRate: Math.round(conversionRate * 10) / 10,
        topPerformingSources,
        pageViewAnalytics: {
          totalPageViews: totalContacts,
          uniquePages: [],
          topLandingPages: [],
          utmCampaigns: [],
          utmSources: [],
          referrerBreakdown: []
        }
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get GHL metrics', error);
      throw error;
    }
  }

  /**
   * Get all contacts with pagination and rate limiting
   */
  private static async getAllContacts(): Promise<any[]> {
    const allContacts = [];
    let nextPageUrl: string | null = null;
    let page = 1;

    do {
      // Rate limiting - wait if requests are too frequent
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      const url: string = nextPageUrl || `${this.API_BASE_URL}/contacts/?locationId=${this.locationId}&limit=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        }
      });

      this.lastRequestTime = Date.now();

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }

      const data: any = await response.json();
      allContacts.push(...data.contacts);
      
      nextPageUrl = data.meta?.nextPageUrl || null;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 20) { break; }
      
    } while (nextPageUrl);

    return allContacts;
  }
}
```

### Common Issues and Fixes

#### 1. Guest Count Extraction Issues
**Problem**: Custom fields showing `undefined` keys but valid values
```typescript
// ❌ INCORRECT - Looking for specific field ID
const guestField = contact.customFields?.find(field => field.id === 'spSlgg7eis8kwORECHZ9');

// ✅ CORRECT - Dynamic approach
const guestField = contact.customFields?.find((field: any) => {
  const value = parseInt(field.value);
  return !isNaN(value) && value > 0 && value <= 500;
});
```

#### 2. Excessive API Requests
**Problem**: Multiple components making independent API calls
```typescript
// ❌ INCORRECT - Each component fetches independently
useEffect(() => {
  const ghlResult = await GoHighLevelService.getGHLMetrics(); // 1,553 contacts!
  setGhlData(ghlResult);
}, []);

// ✅ CORRECT - Use dashboard data with caching
const landingPageViews = data?.ghlMetrics?.totalContacts || 0; // From dashboard
```

#### 3. Rate Limiting Issues
**Problem**: API requests made too frequently
```typescript
// ✅ SOLUTION - Add rate limiting
private static lastRequestTime = 0;
private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second

// In API calls:
const timeSinceLastRequest = Date.now() - this.lastRequestTime;
if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
  await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
}
```

#### 4. Token Management Issues
**Problem**: Tokens not being refreshed properly
```typescript
// ✅ SOLUTION - Automatic token refresh
if (response.status === 401) {
  debugLogger.info('GoHighLevelService', 'Token expired, attempting refresh');
  try {
    const connection = await this.getGHLConnection();
    if (connection?.config?.refreshToken) {
      const newTokens = await this.refreshAccessToken(connection.config.refreshToken);
      this.setCredentials(newTokens.accessToken, this.locationId || '');
      
      // Retry the request with new token
      return this.makeApiRequest(endpoint, options);
    }
  } catch (refreshError) {
    debugLogger.error('GoHighLevelService', 'Token refresh failed', refreshError);
    throw new Error('Authentication failed');
  }
}
```

### Lazy Loading Implementation

#### Client Form with On-Demand Loading
```typescript
// src/components/admin/ClientForm.tsx
export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, isEdit, clientId }) => {
  const [facebookAccountsLoaded, setFacebookAccountsLoaded] = useState(false);
  const [googleAccountsLoaded, setGoogleAccountsLoaded] = useState(false);
  const [ghlAccountsLoaded, setGhlAccountsLoaded] = useState(false);

  // Load Facebook Ads accounts when needed
  const loadFacebookAccounts = async () => {
    if (facebookAccountsLoaded) return;
    
    console.log('🔍 ClientForm: Loading Facebook accounts on demand...');
    setFacebookAccountsLoaded(true);
    
    try {
      const adAccounts = await FacebookAdsService.getAdAccounts();
      const facebookAccounts = adAccounts.map(account => ({
        id: account.id,
        name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
        platform: 'facebookAds' as const
      }));
      
      setConnectedAccounts(prev => [...prev, ...facebookAccounts]);
    } catch (error) {
      console.error('🔍 ClientForm: Facebook error', error);
    }
  };

  // Load GoHighLevel locations when needed
  const loadGHLAccounts = async () => {
    if (ghlAccountsLoaded) return;
    
    console.log('🔍 ClientForm: Loading GoHighLevel accounts on demand...');
    setGhlAccountsLoaded(true);
    
    try {
      const integrations = await DatabaseService.getIntegrations();
      const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel');
      
      if (ghlIntegration?.connected) {
        const locations = await GoHighLevelService.getAllLocations();
        const ghlAccounts = locations.map(location => ({
          id: location.id,
          name: `${location.name} (${location.city}, ${location.state})`,
          platform: 'goHighLevel' as const
        }));
        
        setConnectedAccounts(prev => [...prev, ...ghlAccounts]);
      }
    } catch (error) {
      console.error('🔍 ClientForm: GoHighLevel error', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Facebook Ads Dropdown with Lazy Loading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">f</span>
          </div>
          <span className="text-sm font-medium">Facebook Ads</span>
        </div>
        {isIntegrationConnected('facebookAds') ? (
          <SearchableSelect
            options={[
              { value: "none", label: "None" },
              ...getAvailableAccounts('facebookAds').map(account => ({
                value: account.id,
                label: account.name
              }))
            ]}
            value={formData.accounts.facebookAds || "none"}
            onValueChange={(value) => handleAccountSelect("facebookAds", value)}
            placeholder="Select Facebook Ad Account"
            searchPlaceholder="Search Facebook accounts..."
            className="min-w-[400px]"
            onOpenChange={(open) => {
              if (open && !facebookAccountsLoaded) {
                loadFacebookAccounts();
              }
            }}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>Facebook Ads not connected</span>
          </div>
        )}
      </div>

      {/* GoHighLevel Dropdown with Lazy Loading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="text-sm font-medium">GoHighLevel CRM</span>
        </div>
        {isIntegrationConnected('goHighLevel') ? (
          <div className="space-y-2">
            <SearchableSelect
              value={typeof formData.accounts.goHighLevel === 'string' 
                ? formData.accounts.goHighLevel 
                : formData.accounts.goHighLevel?.locationId || "none"}
              onValueChange={(value) => handleAccountSelect("goHighLevel", value)}
              placeholder="Search GoHighLevel locations..."
              options={[
                { value: "none", label: "None" },
                ...getAvailableAccounts('goHighLevel').map(account => ({
                  value: account.id,
                  label: account.name
                }))
              ]}
              onOpenChange={(open) => {
                if (open && !ghlAccountsLoaded) {
                  loadGHLAccounts();
                }
              }}
            />
            
            {/* Show selected location info */}
            {typeof formData.accounts.goHighLevel === 'object' && formData.accounts.goHighLevel?.locationId && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="font-medium">Selected Location:</div>
                <div>{formData.accounts.goHighLevel.locationName}</div>
                <div className="text-gray-500 mt-1">
                  Location ID: {formData.accounts.goHighLevel.locationId}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>GoHighLevel not connected</span>
          </div>
        )}
      </div>
    </form>
  );
};
```

#### Benefits of Lazy Loading
- **⚡ Faster Form Loading**: No automatic API calls on mount
- **🔧 No Infinite Loops**: Prevents hanging on slow API responses
- **💾 Better UX**: Form is immediately submittable
- **🎯 On-Demand**: Only loads data when user actually needs it
- **⏱️ Timeout Protection**: Built-in timeouts prevent hanging

### Dashboard Integration

#### Component Usage
```typescript
// src/components/dashboard/LeadInfoMetricsCards.tsx
export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = ({ data }) => {
  // Use dashboard data instead of independent API calls
  const landingPageViews = data?.ghlMetrics?.totalContacts || 0;
  const conversionRate = landingPageViews > 0 ? (leadData.totalLeads / landingPageViews) * 100 : 0;

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Landing Page Views</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{landingPageViews.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-blue-600 font-medium">GHL</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
      {/* More cards... */}
    </div>
  );
};
```

#### Funnel Chart Integration
```typescript
// src/components/dashboard/GHLFunnelChart.tsx
export const GHLFunnelChart: React.FC<GHLFunnelChartProps> = ({ dateRange }) => {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        const metrics = await GoHighLevelService.getGHLMetrics(dateRange);
        
        // Calculate funnel stages
        const totalPageViews = metrics.pageViewAnalytics?.totalPageViews || metrics.totalContacts;
        const totalContacts = metrics.totalContacts;
        const qualifiedLeads = metrics.totalContacts * (metrics.conversionRate / 100);
        const leadsWithGuests = metrics.totalGuests > 0 ? metrics.totalGuests : 0;
        
        const funnelStages: FunnelData[] = [
          {
            name: 'Page Views',
            value: totalPageViews,
            percentage: 100,
            color: FUNNEL_COLORS[0]
          },
          {
            name: 'Landing Page Visits',
            value: totalContacts,
            percentage: totalPageViews > 0 ? (totalContacts / totalPageViews) * 100 : 0,
            color: FUNNEL_COLORS[1]
          },
          {
            name: 'Form Submissions',
            value: Math.round(qualifiedLeads),
            percentage: totalContacts > 0 ? (qualifiedLeads / totalContacts) * 100 : 0,
            color: FUNNEL_COLORS[2]
          },
          {
            name: 'Qualified Leads',
            value: Math.round(qualifiedLeads),
            percentage: totalContacts > 0 ? (qualifiedLeads / totalContacts) * 100 : 0,
            color: FUNNEL_COLORS[3]
          },
          {
            name: 'Booked Events',
            value: Math.round(leadsWithGuests),
            percentage: qualifiedLeads > 0 ? (leadsWithGuests / qualifiedLeads) * 100 : 0,
            color: FUNNEL_COLORS[4]
          }
        ];

        setFunnelData(funnelStages);
      } catch (error) {
        console.error('Failed to fetch GHL funnel data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [dateRange]);

  // Render funnel chart...
};
```

### Performance Optimizations

#### 1. Caching Strategy
- **5-minute cache** for GHL metrics to prevent excessive API calls
- **Cache invalidation** when new data is available
- **Memory-based caching** for fast access

#### 2. Rate Limiting
- **1-second minimum interval** between API requests
- **Request queuing** to prevent concurrent calls
- **Automatic retry** with exponential backoff

#### 3. Data Optimization
- **Pagination handling** with safety limits (max 20 pages)
- **Selective field fetching** to reduce payload size
- **Client-side filtering** to minimize API calls

### Testing

#### Unit Tests
```typescript
// src/services/__tests__/goHighLevelService.test.ts
import { GoHighLevelService } from '../api/goHighLevelService';
import { server } from '../../setupTests';
import { rest } from 'msw';

describe('GoHighLevelService', () => {
  beforeEach(() => {
    // Mock GHL API responses
    server.use(
      rest.get('https://services.leadconnectorhq.com/contacts/', (req, res, ctx) => {
        return res(
          ctx.json({
            contacts: [
              {
                id: 'test-contact-1',
                contactName: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                source: 'wedding info - google ads',
                dateAdded: '2024-01-01T00:00:00Z',
                customFields: [
                  { key: 'guest_count', value: '50' }
                ]
              }
            ],
            meta: { total: 1 }
          })
        );
      })
    );
  });

  it('should fetch and process GHL metrics', async () => {
    const metrics = await GoHighLevelService.getGHLMetrics();
    
    expect(metrics.totalContacts).toBe(1);
    expect(metrics.totalGuests).toBe(50);
    expect(metrics.conversionRate).toBe(100);
  });

  it('should handle guest count extraction', async () => {
    const metrics = await GoHighLevelService.getGHLMetrics();
    
    expect(metrics.guestCountDistribution).toHaveLength(5);
    expect(metrics.guestCountDistribution[0]).toMatchObject({
      range: '26-50',
      count: 1,
      percentage: 100
    });
  });
});
```

#### Integration Tests
```typescript
// tests/e2e/ghl-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GHL Integration', () => {
  test('should display GHL metrics on dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for GHL data to load
    await page.waitForSelector('[data-testid="landing-page-views"]');
    
    // Verify GHL metrics are displayed
    await expect(page.locator('[data-testid="landing-page-views"]')).toContainText('1,553');
    await expect(page.locator('[data-testid="ghl-source"]')).toContainText('GHL');
  });

  test('should display funnel chart with GHL data', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to leads tab
    await page.click('[data-testid="leads-tab"]');
    
    // Wait for funnel chart
    await page.waitForSelector('[data-testid="funnel-chart"]');
    
    // Verify funnel stages
    await expect(page.locator('[data-testid="funnel-stage"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="funnel-stage"]').first()).toContainText('Page Views');
  });
});
```

### Security Considerations

#### 1. Token Security
- Store tokens securely in database
- Implement automatic token refresh
- Use HTTPS for all API communications
- Implement proper token revocation

#### 2. Data Privacy
- Follow GDPR/CCPA compliance
- Implement data retention policies
- Provide data deletion capabilities
- Encrypt sensitive contact data

#### 3. API Security
- Validate all API responses
- Implement proper error handling
- Use rate limiting to prevent abuse
- Monitor API usage patterns

### Monitoring and Debugging

#### 1. Logging
```typescript
// Enable debug logging for GHL service
debugLogger.debug('GoHighLevelService', 'API request', { 
  endpoint, 
  timestamp: Date.now() 
});

debugLogger.error('GoHighLevelService', 'API error', { 
  error: error.message, 
  status: response.status 
});
```

#### 2. Performance Monitoring
```typescript
// Monitor API response times
const startTime = Date.now();
const response = await fetch(url, options);
const duration = Date.now() - startTime;

if (duration > 5000) {
  debugLogger.warn('GoHighLevelService', 'Slow API response', { duration, url });
}
```

#### 3. Error Tracking
```typescript
// Track API errors for monitoring
try {
  const data = await this.getGHLMetrics();
} catch (error) {
  debugLogger.error('GoHighLevelService', 'Metrics fetch failed', {
    error: error.message,
    stack: error.stack,
    timestamp: Date.now()
  });
  throw error;
}
```

### Troubleshooting

#### Common Issues
1. **"Cannot find package 'axios'"** - Install axios: `npm install axios`
2. **"Token does not have access to this location"** - Check location ID and permissions
3. **"Excessive API requests"** - Implement caching and rate limiting
4. **"Guest counts showing 0"** - Check custom field structure and extraction logic

#### Debug Steps
1. Check browser console for API errors
2. Verify GHL credentials in database
3. Test API endpoints directly
4. Check network tab for request/response details
5. Validate custom field data structure

For more troubleshooting details, see [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md).

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
