# Go High Level (GHL) API Guide

## Overview

This guide provides comprehensive documentation for integrating with the Go High Level API, including authentication, database operations, API call structures, and critical settings based on our implementation learnings.

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

#### 2. Data Endpoints
```typescript
// Get All Contacts (Paginated)
GET /contacts/?locationId={locationId}&limit=100
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28
  Content-Type: application/json

// Get Account Information
GET /locations/{locationId}
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28

// Get Opportunities
GET /opportunities/?locationId={locationId}
Headers:
  Authorization: Bearer {access_token}
  Version: 2021-07-28
```

## Authentication Flow

### 1. OAuth Configuration
```typescript
interface GHLAppCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  environment: string;
  is_active: boolean;
}

// Environment Variables
const credentials = {
  client_id: process.env.REACT_APP_GHL_CLIENT_ID!,
  client_secret: process.env.REACT_APP_GHL_CLIENT_SECRET!,
  redirect_uri: `${window.location.origin}/oauth/callback`
};
```

### 2. Authorization URL Generation
```typescript
static async getAuthorizationUrl(): Promise<string> {
  const credentials = await this.getCredentials();
  
  const authUrl = `${this.OAUTH_BASE_URL}/oauth/chooselocation?` +
    `response_type=code&` +
    `client_id=${credentials.client_id}&` +
    `redirect_uri=${credentials.redirect_uri}&` +
    `scope=contacts.readonly locations.readonly oauth.readonly opportunities.readonly funnels/redirect.readonly funnels/page.readonly funnels/funnel.readonly funnels/pagecount.readonly`;

  return authUrl;
}
```

### 3. Token Exchange
```typescript
static async exchangeCodeForToken(code: string, locationId?: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  locationId: string;
}> {
  const credentials = await this.getCredentials();
  
  const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      redirect_uri: credentials.redirect_uri,
      user_type: 'Location'
    })
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  const finalLocationId = tokenData.locationId || locationId;
  
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    locationId: finalLocationId
  };
}
```

### 4. Token Refresh
```typescript
static async refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const credentials = await this.getCredentials();
  
  const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      user_type: 'Location'
    })
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    throw new Error(`Token refresh failed: ${errorData.error || tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in
  };
}
```

## Database Schema & Operations

### 1. Required Tables

#### GHL App Credentials Table
```sql
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
```

#### Integrations Table (for tokens)
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
```

### 2. Database Operations

#### Save GHL Connection
```typescript
static async saveGHLConnection(connectionData: {
  accessToken: string;
  refreshToken?: string;
  locationId: string;
  expiresIn?: number;
}): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .upsert({
      platform: 'goHighLevel',
      connected: true,
      account_id: connectionData.locationId,
      config: {
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken,
        expiresIn: connectionData.expiresIn,
        connectedAt: new Date().toISOString()
      },
      last_sync: new Date().toISOString()
    }, {
      onConflict: 'platform'
    });

  if (error) throw error;
}
```

#### Get GHL Connection
```typescript
static async getGHLConnection(): Promise<any | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('config, account_id')
    .eq('platform', 'goHighLevel')
    .eq('connected', true)
    .single();

  if (error || !data?.config) {
    return null;
  }

  return {
    config: data.config,
    account_id: data.account_id
  };
}
```

#### Get App Credentials
```typescript
private static async getCredentials(): Promise<GHLAppCredentials | null> {
  const { data, error } = await supabase
    .from('ghl_app_credentials')
    .select('*')
    .eq('is_active', true)
    .eq('environment', import.meta.env.DEV ? 'development' : 'production')
    .single();

  if (error) return null;
  return data;
}
```

## Critical Settings & Configuration

### 1. Environment Variables
```bash
# Required Environment Variables
REACT_APP_GHL_CLIENT_ID=your_ghl_client_id
REACT_APP_GHL_CLIENT_SECRET=your_ghl_client_secret
REACT_APP_GHL_REDIRECT_URI=http://localhost:8080/oauth/callback

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. OAuth Scopes
```typescript
const REQUIRED_SCOPES = [
  'contacts.readonly',
  'locations.readonly', 
  'oauth.readonly',
  'opportunities.readonly',
  'funnels/redirect.readonly',
  'funnels/page.readonly',
  'funnels/funnel.readonly',
  'funnels/pagecount.readonly'
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
