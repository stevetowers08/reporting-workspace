# Go High Level (GHL) API Guide

## Overview

This guide provides comprehensive documentation for integrating with the Go High Level API using **OAuth 2.0** for secure authentication. Our implementation supports both **agency-level** and **location-level** tokens with **API 2.0** endpoints for optimal performance and data access.

## Recent Updates (January 2025)

### ✅ OAuth 2.0 Integration Complete
- **OAuth Flow**: Full OAuth 2.0 implementation with authorization code exchange
- **Token Management**: Automatic token refresh and secure storage
- **API 2.0 Endpoints**: Updated to use correct API 2.0 endpoints for all data access
- **Location-Level Access**: Direct OAuth connection to specific GoHighLevel locations
- **Real-time Testing**: Successfully tested with Magnolia Terrace location (V7bzEjKiigXzh8r6sQq0)

### ✅ Working API 2.0 Endpoints
- **Contacts**: `POST /contacts/search` - ✅ Working (20 contacts retrieved)
- **Calendars**: `GET /calendars/?locationId=...` - ✅ Working (5 calendars found)
- **Funnels**: `GET /funnels/funnel/list?locationId=...` - ✅ Working (9 funnels found)
- **Opportunities**: `POST /opportunities/search` - ✅ Working (API ready, no data yet)

## Table of Contents

1. [API Endpoints & Structure](#api-endpoints--structure)
2. [Authentication Flow](#authentication-flow)
3. [Database Schema & Operations](#database-schema--operations)
4. [Critical Settings & Configuration](#critical-settings--configuration)
5. [API Call Patterns](#api-call-patterns)
6. [Error Handling & Troubleshooting](#error-handling--troubleshooting)
7. [Performance Optimizations](#performance-optimizations)
8. [Common Issues & Solutions](#common-issues--solutions)

## API Endpoints & Structure

### Base URLs
```typescript
// Production API
const API_BASE_URL = 'https://services.leadconnectorhq.com';
const OAUTH_BASE_URL = 'https://services.leadconnectorhq.com';

// API Version
const API_VERSION = '2021-07-28';
```

### Core Endpoints

#### 1. Authentication Endpoints
```typescript
// OAuth Authorization
GET /oauth/chooselocation
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope=contacts.readonly locations.readonly oauth.readonly opportunities.readonly funnels/redirect.readonly funnels/page.readonly funnels/funnel.readonly funnels/pagecount.readonly

// Token Exchange
POST /oauth/token
Content-Type: application/json
{
  "grant_type": "authorization_code",
  "code": "{authorization_code}",
  "client_id": "{client_id}",
  "client_secret": "{client_secret}",
  "redirect_uri": "{redirect_uri}",
  "user_type": "Location"
}

// Token Refresh
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
grant_type=refresh_token&refresh_token={refresh_token}&client_id={client_id}&client_secret={client_secret}&user_type=Location
```

#### 2. Data Endpoints (API 2.0)
```typescript
// Get Contacts (API 2.0 - POST Search)
POST /contacts/search
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28
  Content-Type: application/json
Body:
{
  "locationId": "{locationId}",
  "query": "",
  "pageLimit": 10
}

// Get Calendars (API 2.0)
GET /calendars/?locationId={locationId}
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28

// Get Funnels (API 2.0)
GET /funnels/funnel/list?locationId={locationId}
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28

// Get Opportunities (API 2.0 - POST Search)
POST /opportunities/search
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28
  Content-Type: application/json
Body:
{
  "locationId": "{locationId}",
  "query": ""
}
```

## Authentication Flow

### 1. OAuth 2.0 Setup
```typescript
interface GHLOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Required OAuth Scopes
const REQUIRED_SCOPES = [
  'contacts.readonly',           // Access contact data
  'opportunities.readonly',      // Access pipeline data  
  'calendars.readonly',          // Access calendar events
  'funnels/funnel.readonly',     // Access funnel data
  'funnels/page.readonly'        // Access page data
];

// Environment Variables
const oauthConfig: GHLOAuthConfig = {
  clientId: process.env.GHL_CLIENT_ID!,
  clientSecret: process.env.GHL_CLIENT_SECRET!,
  redirectUri: `${process.env.APP_URL}/api/leadconnector/oath`,
  scopes: REQUIRED_SCOPES
};
```

### 2. OAuth Authorization Flow
```typescript
// Generate OAuth Authorization URL
static getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[]): string {
  const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' ')
  });
  return `${baseUrl}?${params.toString()}`;
}

// Exchange Authorization Code for Access Token
static async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}
```

### 3. API 2.0 Data Access Examples
```typescript
// Get Contacts using API 2.0
static async getContacts(locationId: string, limit = 10): Promise<any[]> {
  const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locationId: locationId,
      query: '',
      pageLimit: limit
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get contacts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.contacts || [];
}

// Get Funnels using API 2.0
static async getFunnels(locationId: string): Promise<any[]> {
  const response = await fetch(`${this.API_BASE_URL}/funnels/funnel/list?locationId=${locationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get funnels: ${response.statusText}`);
  }

  const data = await response.json();
  return data.funnels || [];
}

// Get Opportunities using API 2.0
static async getOpportunities(locationId: string): Promise<any[]> {
  const response = await fetch(`${this.API_BASE_URL}/opportunities/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locationId: locationId,
      query: ''
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get opportunities: ${response.statusText}`);
  }

  const data = await response.json();
  return data.opportunities || [];
}
```

### 4. Contact Data Access
```typescript
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
```

## Database Schema & Operations

### 1. Required Tables

#### Integrations Table (for Private Integration Tokens)
```sql
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL UNIQUE CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets')),
  connected BOOLEAN DEFAULT FALSE,
  account_name VARCHAR(255),
  account_id VARCHAR(255),
  last_sync TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example config for GoHighLevel Private Integration Token:
-- {
--   "agencyToken": "pit-bdd2a6a2-734e-4e46-88a3-161683bd4bde",
--   "companyId": "WgNZ7xm35vYaZwflSov7",
--   "capabilities": ["locations.readonly", "contacts.readonly", "opportunities.readonly"]
-- }
```

#### Clients Table (for location selection)
```sql
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  accounts JSONB DEFAULT '{}',
  -- Example accounts structure for GoHighLevel:
  -- {
  --   "goHighLevel": {
  --     "locationId": "abc123",
  --     "locationName": "Magnolia Terrace (Frisco, Texas)"
  --   }
  -- }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Database Operations

#### Save Private Integration Token
```typescript
static async saveGHLPrivateIntegrationToken(token: string): Promise<void> {
  // Test the token first
  const testResult = await this.testAgencyToken(token);
  
  if (!testResult.valid) {
    throw new Error('Invalid private integration token');
  }

  const { error } = await supabase
    .from('integrations')
    .upsert({
      platform: 'goHighLevel',
      connected: true,
      account_name: 'GoHighLevel Agency',
      config: {
        agencyToken: token,
        companyId: testResult.companyId,
        capabilities: testResult.capabilities,
        connectedAt: new Date().toISOString()
      },
      last_sync: new Date().toISOString()
    }, {
      onConflict: 'platform'
    });

  if (error) throw error;
}
```

#### Get Private Integration Token
```typescript
static async getGHLConnection(): Promise<any | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('config, account_name')
    .eq('platform', 'goHighLevel')
    .eq('connected', true)
    .single();

  if (error || !data?.config) {
    return null;
  }

  return {
    config: data.config,
    account_name: data.account_name
  };
}
```

## Critical Settings & Configuration

### 1. Environment Variables
```bash
# Required Environment Variables - Only Supabase needed!
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# No longer needed for GoHighLevel:
# REACT_APP_GHL_CLIENT_ID=your_ghl_client_id
# REACT_APP_GHL_CLIENT_SECRET=your_ghl_client_secret
# REACT_APP_GHL_REDIRECT_URI=http://localhost:8080/oauth/callback
```

### 2. Private Integration Token Scopes
```typescript
const REQUIRED_SCOPES = [
  'locations.readonly',    // List all sub-accounts
  'companies.readonly',    // Access company information
  'contacts.readonly',     // Access contact data
  'opportunities.readonly', // Access pipeline data
  'calendars.readonly',    // Access calendar events
  'funnels/funnel.readonly', // Access funnel data
  'funnels/page.readonly', // Access page data
  'conversations.readonly' // Access conversation data
];
```

### 3. Rate Limiting Settings
```typescript
// Critical Performance Settings
private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
private static readonly MAX_PAGINATION_PAGES = 20; // Safety limit for pagination
```

### 4. API Headers
```typescript
const API_HEADERS = {
  'Authorization': `Bearer ${accessToken}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json'
};
```

## API Call Patterns

### 1. Paginated Data Fetching
```typescript
private static async getAllContacts(): Promise<any[]> {
  const allContacts = [];
  let nextPageUrl: string | null = null;
  let page = 1;

  do {
    // Rate limiting
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    const url = nextPageUrl || `${this.API_BASE_URL}/contacts/?locationId=${this.locationId}&limit=100`;
    
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

    const data = await response.json();
    allContacts.push(...data.contacts);
    
    nextPageUrl = data.meta?.nextPageUrl || null;
    page++;
    
    // Safety limit
    if (page > 20) break;
    
  } while (nextPageUrl);

  return allContacts;
}
```

### 2. Cached API Calls
```typescript
static async getGHLMetrics(dateRange?: { start: string; end: string }): Promise<any> {
  // Check cache first
  const cacheKey = `ghl-metrics-${JSON.stringify(dateRange || {})}`;
  const cached = this.cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
    return cached.data;
  }

  // Make API call
  const data = await this.fetchDataFromAPI();
  
  // Cache result
  this.cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

### 3. Error Handling with Retry
```typescript
private static async makeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${this.API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
    },
    ...options
  });

  // Handle token expiration
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

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}
```

## Error Handling & Troubleshooting

### 1. Common Error Codes
```typescript
// 401 - Unauthorized (Token expired/invalid)
if (response.status === 401) {
  // Attempt token refresh
  await this.refreshAccessToken(refreshToken);
}

// 403 - Forbidden (No access to location)
if (response.status === 403) {
  throw new Error('Token does not have access to this location');
}

// 429 - Rate Limited
if (response.status === 429) {
  // Wait and retry
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### 2. Debug Logging
```typescript
// Enable debug logging
debugLogger.debug('GoHighLevelService', 'API request', { 
  endpoint, 
  timestamp: Date.now() 
});

debugLogger.error('GoHighLevelService', 'API error', { 
  error: error.message, 
  status: response.status 
});
```

### 3. Error Recovery Patterns
```typescript
// Automatic token refresh on 401
if (response.status === 401) {
  const newTokens = await this.refreshAccessToken(refreshToken);
  this.setCredentials(newTokens.accessToken, this.locationId);
  return this.makeApiRequest(endpoint, options); // Retry
}

// Rate limit handling
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
  await new Promise(resolve => setTimeout(resolve, delay));
  return this.makeApiRequest(endpoint, options); // Retry
}
```

## Performance Optimizations

### 1. Caching Strategy
```typescript
// Memory-based caching
private static cache = new Map<string, { data: any; timestamp: number }>();
private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache check before API call
const cached = this.cache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
  return cached.data;
}
```

### 2. Rate Limiting
```typescript
// Request throttling
private static lastRequestTime = 0;
private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second

// Wait between requests
const timeSinceLastRequest = Date.now() - this.lastRequestTime;
if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
  await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
}
```

### 3. Pagination Limits
```typescript
// Safety limits to prevent infinite loops
private static readonly MAX_PAGINATION_PAGES = 20;

// Break pagination loop
if (page > this.MAX_PAGINATION_PAGES) {
  debugLogger.warn('GoHighLevelService', 'Pagination limit reached', { page });
  break;
}
```

## Common Issues & Solutions

### 1. Guest Count Extraction Issues
**Problem**: Custom fields showing `undefined` keys but valid values
```typescript
// ❌ INCORRECT - Looking for specific field ID
const guestField = contact.customFields?.find(field => field.id === 'spSlgg7eis8kwORECHZ9');

// ✅ CORRECT - Dynamic approach
const guestField = contact.customFields?.find((field: any) => {
  const value = parseInt(field.value);
  return !isNaN(value) && value > 0 && value <= 500; // Reasonable guest count range
});
```

### 2. Excessive API Requests
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

### 3. Token Management Issues
**Problem**: Tokens not being refreshed properly
```typescript
// ✅ SOLUTION - Automatic token refresh
if (response.status === 401) {
  const connection = await this.getGHLConnection();
  if (connection?.config?.refreshToken) {
    const newTokens = await this.refreshAccessToken(connection.config.refreshToken);
    this.setCredentials(newTokens.accessToken, this.locationId || '');
    return this.makeApiRequest(endpoint, options); // Retry with new token
  }
}
```

### 4. Location ID Issues
**Problem**: "Token does not have access to this location"
```typescript
// ✅ SOLUTION - Use account_id as locationId
const connection = await this.getGHLConnection();
if (connection?.account_id) {
  this.locationId = connection.account_id; // Use account_id as locationId
}
```

## Integration Examples

### 1. Dashboard Integration
```typescript
// Component using GHL data
export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = ({ data }) => {
  // Use dashboard data instead of independent API calls
  const landingPageViews = data?.ghlMetrics?.totalContacts || 0;
  const conversionRate = landingPageViews > 0 ? (leadData.totalLeads / landingPageViews) * 100 : 0;

  return (
    <Card>
      <div>
        <p>Landing Page Views</p>
        <p>{landingPageViews.toLocaleString()}</p>
        <span>GHL</span>
      </div>
    </Card>
  );
};
```

### 2. OAuth Callback Handling
```typescript
// OAuth callback page
export const GHLCallbackPage: React.FC = () => {
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const locationId = searchParams.get('locationId');
      
      if (!code) {
        throw new Error('Authorization code not found');
      }

      // Exchange code for token
      const tokenData = await GoHighLevelService.exchangeCodeForToken(code, locationId || undefined);
      
      // Set credentials
      GoHighLevelService.setCredentials(tokenData.accessToken, tokenData.locationId);

      // Save to database
      await DatabaseService.saveGHLConnection({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        locationId: tokenData.locationId,
        expiresIn: tokenData.expiresIn
      });

      navigate('/admin/integrations');
    };

    handleCallback();
  }, []);
};
```

### 3. React Query Integration
```typescript
// Hook for GHL integration
export const useGHLIntegration = () => {
  const { data: connection, isLoading } = useQuery({
    queryKey: ['ghl-connection'],
    queryFn: async () => {
      const connection = await DatabaseService.getGHLConnection();
      if (connection?.connected && connection.config?.accessToken) {
        GoHighLevelService.setCredentials(
          connection.config.accessToken,
          connection.account_id
        );
      }
      return connection;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { connection, isLoading };
};
```

## Testing Patterns

### 1. Unit Tests
```typescript
describe('GoHighLevelService', () => {
  beforeEach(() => {
    // Mock GHL API responses
    server.use(
      rest.get('https://services.leadconnectorhq.com/contacts/', (req, res, ctx) => {
        return res(ctx.json({
          contacts: [mockContact],
          meta: { total: 1 }
        }));
      })
    );
  });

  it('should fetch and process GHL metrics', async () => {
    const metrics = await GoHighLevelService.getGHLMetrics();
    expect(metrics.totalContacts).toBe(1);
  });
});
```

### 2. Integration Tests
```typescript
test('should display GHL metrics on dashboard', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="landing-page-views"]');
  await expect(page.locator('[data-testid="landing-page-views"]')).toContainText('1,553');
});
```

## Security Considerations

### 1. Token Security
- Store tokens securely in database
- Implement automatic token refresh
- Use HTTPS for all API communications
- Implement proper token revocation

### 2. Data Privacy
- Follow GDPR/CCPA compliance
- Implement data retention policies
- Provide data deletion capabilities
- Encrypt sensitive contact data

### 3. API Security
- Validate all API responses
- Implement proper error handling
- Use rate limiting to prevent abuse
- Monitor API usage patterns

---

This guide provides a comprehensive reference for implementing Go High Level API integration based on our production learnings and best practices.
