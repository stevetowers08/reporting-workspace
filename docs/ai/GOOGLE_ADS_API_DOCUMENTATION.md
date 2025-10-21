# Google Ads API Documentation

**Last Updated:** January 21, 2025  
**Version:** 2.1.0  
**Status:** ✅ **PRODUCTION READY - TIMEZONE ISSUES RESOLVED**

## Overview

The Google Ads API integration provides comprehensive advertising analytics and campaign management capabilities. The current implementation (v2.1.0) uses direct API calls with smart caching, simplified UTC-based date calculations, and proper error handling for consistent data across all charts.

### ✅ **Key Improvements in v2.1.0**
- **Simplified Timezone Handling**: Using UTC consistently for all date calculations
- **Fixed Date Range Issues**: Resolved discrepancies between summary cards and monthly chart
- **Better Error Handling**: Improved error messages and logging with debugLogger
- **Production Ready**: All timezone-related bugs resolved
- **Cleaner Code**: Removed complex timezone calculations

## Current Service Architecture

### ✅ **GoogleAdsService** - Current Implementation
- **Location**: `src/services/api/googleAdsService.ts`
- **API Version**: v21 (Latest 2025)
- **Base URL**: `https://googleads.googleapis.com/v21`
- **Features**: Simplified UTC date handling, comprehensive campaign fetching, proper OAuth 2.0, smart caching

### ✅ **AnalyticsOrchestrator** - Data Orchestration
- **Location**: `src/services/data/analyticsOrchestrator.ts`
- **API Version**: v21
- **Base URL**: `https://googleads.googleapis.com/v21`
- **Features**: Direct API calls, smart caching, request deduplication, error isolation, UTC-based date calculations

### Supporting Services
- **Token Management**: `TokenManager` from `@/services/auth/TokenManager`
- **OAuth Service**: `OAuthService` from `@/services/auth/oauthService`
- **Account Discovery**: `GoogleAdsAccountDiscovery`

## Authentication

### OAuth 2.0 Flow
- **Authorization URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL**: `https://oauth2.googleapis.com/token`
- **Scopes**: 
  - `https://www.googleapis.com/auth/adwords`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`

### PKCE Implementation
- **Code Challenge Method**: S256
- **Code Verifier**: 43-128 characters
- **Storage**: localStorage for code verifier

### Token Management
```typescript
// Get access token
const token = await GoogleAdsService.ensureValidToken();

// Test connection
const testResult = await GoogleAdsService.testConnection();

// Authenticate
const isValid = await GoogleAdsService.authenticate();
```

### Required Credentials
- **Developer Token**: From Google Ads API Center
- **Client ID**: OAuth 2.0 client ID
- **Client Secret**: OAuth 2.0 client secret
- **Manager Account ID**: Google Ads manager account

## API Endpoints

### Supabase Edge Functions

#### Google Ads API Edge Function
- **Endpoint**: `${VITE_SUPABASE_URL}/functions/v1/google-ads-api`
- **Purpose**: Secure backend proxy for Google Ads API calls
- **Authentication**: Uses Supabase JWT tokens
- **Developer Token**: Retrieved from environment variables

#### Available Actions

##### Get Accounts
```http
GET /functions/v1/google-ads-api/accounts
Headers:
  Authorization: Bearer {supabase_jwt}
  Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "name": "Account Name",
      "currency": "USD",
      "timezone": "America/New_York",
      "descriptiveName": "Account Display Name"
    }
  ],
  "cached": false
}
```

**Features**:
- Automatic token management
- Caching (5 minutes)
- Error handling
- Rate limiting

##### Get Campaigns
```http
GET /functions/v1/google-ads-api/campaigns?customerId={customer_id}
Headers:
  Authorization: Bearer {supabase_jwt}
  Content-Type: application/json
```

##### Get Campaign Performance
```http
GET /functions/v1/google-ads-api/campaign-performance?customerId={customer_id}&dateRange={date_range}
Headers:
  Authorization: Bearer {supabase_jwt}
  Content-Type: application/json
```

### Frontend Service Integration

#### Get Ad Accounts (Updated)
```typescript
const accounts = await GoogleAdsService.getAdAccounts();
```

**Implementation**: Now uses Edge Function instead of direct API calls
**Benefits**:
- Secure developer token handling
- Automatic caching
- Simplified error handling
- No frontend token exposure

**Previous GAQL Query** (now handled by Edge Function): 
```sql
SELECT customer_client.id, customer_client.descriptive_name, customer_client.status, customer_client.manager 
FROM customer_client
```

**Features**:
- Edge Function integration
- Automatic token management
- Caching support
- Error handling

#### Manager Account Discovery
```typescript
const managerId = await GoogleAdsService.discoverManagerAccount(accessToken, developerToken);
```

**Process**:
1. Get accessible customers via `listAccessibleCustomers`
2. Query each customer for manager status
3. Store manager account ID in database
4. Return first manager account found

### Metrics and Analytics

#### Get Account Metrics
```typescript
const metrics = await GoogleAdsService.getAccountMetrics(customerId, dateRange);
```

**GAQL Query**:
```sql
SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks 
FROM customer 
WHERE segments.date BETWEEN 'start_date' AND 'end_date'
```

**Metrics Returned**:
- Impressions
- Clicks
- Cost (converted from micros)
- Conversions/Leads
- CTR (calculated)
- Average CPC (calculated)

#### Get Conversion Actions
```typescript
const actions = await GoogleAdsService.getConversionActions(customerId);
```

**GAQL Query**:
```sql
SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type 
FROM conversion_action 
WHERE conversion_action.status = ENABLED
```

**Conversion Types**:
- WEBSITE
- APP
- PHONE_CALL
- UPLOAD

## Rate Limiting

### Token Bucket Implementation
- **Max Tokens**: 5 requests per second
- **Refill Rate**: 1000ms (1 second)
- **Wait Strategy**: Blocking wait for token availability

### Rate Limit Handling
```typescript
private static async waitForToken(): Promise<void> {
  const now = Date.now();
  const timePassed = now - this.lastRefill;
  
  // Refill tokens based on time passed
  if (timePassed >= this.REFILL_RATE) {
    this.tokens = Math.min(this.MAX_TOKENS, this.tokens + Math.floor(timePassed / this.REFILL_RATE));
    this.lastRefill = now;
  }
  
  // Wait if no tokens available
  if (this.tokens <= 0) {
    const waitTime = this.REFILL_RATE - (now - this.lastRefill);
    if (waitTime > 0) {
      await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
      return this.waitForToken();
    }
  }
  
  this.tokens--;
}
```

### Error Handling
- **429**: Rate limit exceeded - exponential backoff
- **403**: Quota exhausted - daily limit reached
- **Retry Logic**: Automatic retry with backoff

## Data Processing

### NDJSON Response Parsing
```typescript
private static parseSearchStreamText(text: string): unknown[] {
  const trimmed = text?.trim();
  if (!trimmed) return [];

  return trimmed.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        debugLogger.warn('GoogleAdsService', 'Failed to parse NDJSON line', { line: line.substring(0, 100), error });
        return null;
      }
    })
    .filter(item => item !== null);
}
```

### Customer ID Normalization
```typescript
private static normalizeCid(id: string | number): string {
  return String(id).replace(/\D/g, '');
}
```

## Data Models

### GoogleAdsAccount
```typescript
interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}
```

### Account Metrics
```typescript
interface AccountMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  leads: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
}
```

### Conversion Action
```typescript
interface ConversionAction {
  id: string;
  name: string;
  status: string;
  type: string;
}
```

## Database Schema

### Google Ads Authentication
```sql
CREATE TABLE user_google_ads_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  google_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT[],
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Google Ads Configuration
```sql
CREATE TABLE google_ads_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Integrations Table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai')),
  connected BOOLEAN DEFAULT false,
  account_name VARCHAR,
  account_id VARCHAR, -- Manager account ID
  last_sync TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## OAuth Implementation

### Authorization URL Generation
```typescript
const authUrl = await OAuthService.generateAuthUrl('googleAds', {
  access_type: 'offline',
  prompt: 'consent'
});
```

### Token Exchange
```typescript
const tokens = await OAuthService.exchangeCodeForTokens('googleAds', code, state);
```

### Token Refresh
```typescript
const newTokens = await OAuthService.refreshAccessToken('googleAds');
```

### PKCE Flow
1. Generate code verifier (43-128 characters)
2. Create code challenge using SHA256
3. Store code verifier in localStorage
4. Include code challenge in authorization URL
5. Use code verifier in token exchange

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid parameters
- **401**: Unauthorized - Invalid credentials
- **403**: Forbidden - Quota exhausted or insufficient permissions
- **429**: Too Many Requests - Rate limit exceeded

### Error Recovery
```typescript
// Handle rate limiting
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
  await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
  return this.makeApiRequest({ accessToken, developerToken, customerId, managerId, gaql });
}

// Handle quota exhaustion
if (response.status === 403) {
  const errorText = await response.text();
  if (errorText.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('Google Ads API daily quota exhausted. Please try again tomorrow.');
  }
}
```

## Testing and Debugging

### Connection Testing
```typescript
const testResult = await GoogleAdsService.testConnection();
// Returns: { success: boolean, error?: string, accountInfo?: { managerAccountId: string, hasAccessToken: boolean, hasDeveloperToken: boolean } }
```

### Authentication Testing
```typescript
const isValid = await GoogleAdsService.authenticate();
// Returns: boolean
```

### Debug Methods
- `ensureValidToken()`: Validates and returns access token
- `getManagerAccountId()`: Retrieves manager account from database
- `getDeveloperToken()`: Gets developer token from environment

## Environment Configuration

### Required Environment Variables

#### Frontend (.env.local)
```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Supabase Edge Functions (Environment Variables)
```bash
# Google Ads API Configuration
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: The developer token is now stored securely in Supabase Edge Function environment variables, not exposed to the frontend.

### OAuth Redirect URIs
- **Development**: `http://localhost:3000/oauth/callback`
- **Production**: `https://tulenreporting.vercel.app/oauth/callback`
- **Backend**: `${VITE_SUPABASE_URL}/functions/v1/google-ads-oauth`

## GAQL (Google Ads Query Language)

### Basic Query Structure
```sql
SELECT field1, field2, field3
FROM resource_name
WHERE condition
ORDER BY field1
LIMIT 100
```

### Common Resources
- `customer`: Customer information
- `customer_client`: Client accounts under manager
- `campaign`: Campaign data
- `ad_group`: Ad group data
- `ad_group_ad`: Ad data
- `conversion_action`: Conversion tracking

### Metrics and Segments
- `metrics.impressions`: Impression count
- `metrics.clicks`: Click count
- `metrics.cost_micros`: Cost in micros
- `metrics.conversions`: Conversion count
- `segments.date`: Date segmentation
- `segments.device`: Device segmentation

### Example Queries
```sql
-- Get campaign performance
SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros
FROM campaign
WHERE segments.date BETWEEN '2024-01-01' AND '2024-01-31'

-- Get conversion actions
SELECT conversion_action.id, conversion_action.name, conversion_action.status
FROM conversion_action
WHERE conversion_action.status = ENABLED

-- Get ad group performance
SELECT ad_group.id, ad_group.name, metrics.impressions, metrics.clicks
FROM ad_group
WHERE campaign.id = '123456789'
```

## Best Practices

### Token Management
- Use refresh tokens for long-term access
- Implement automatic token refresh
- Store tokens securely in database
- Handle token expiration gracefully

### Rate Limiting
- Respect Google's rate limits
- Implement proper backoff strategies
- Monitor quota usage
- Use batch operations when possible

### Error Handling
- Handle all API error codes
- Implement retry logic for transient errors
- Provide meaningful error messages
- Log errors for debugging

### Data Processing
- Validate all input parameters
- Handle missing or null values
- Implement proper type checking
- Use appropriate data structures

## Troubleshooting

### Common Issues

#### No Manager Account Found
- Verify manager account permissions
- Check customer access levels
- Use `discoverManagerAccount()` for discovery

#### Quota Exhausted
- Check daily quota limits
- Implement proper rate limiting
- Use batch operations efficiently

#### Token Expiration
- Implement automatic refresh
- Handle 401 errors gracefully
- Re-authenticate when necessary

#### Invalid Customer ID
- Normalize customer IDs properly
- Validate ID format
- Check account access permissions

### Debug Commands
```typescript
// Test connection
await GoogleAdsService.testConnection();

// Get manager account
await GoogleAdsService.getManagerAccountId();

// Discover manager account
await GoogleAdsService.discoverManagerAccount(accessToken, developerToken);

// Get accounts
await GoogleAdsService.getAdAccounts();

// Get metrics
await GoogleAdsService.getAccountMetrics(customerId, dateRange);
```

## Security Considerations

### Token Security
- Store tokens encrypted in database
- Use HTTPS for all communications
- Implement proper token rotation
- Use PKCE for OAuth flows

### API Security
- Validate all input parameters
- Use proper error handling
- Implement request signing
- Follow Google's security guidelines

### Data Privacy
- Follow Google's data usage policies
- Implement proper data retention
- Handle user consent appropriately
- Comply with privacy regulations

## Performance Optimization

### Caching
- Cache account lists
- Cache manager account ID
- Use appropriate cache durations
- Implement cache invalidation

### Parallel Requests
- Use batch operations when possible
- Implement proper error handling
- Balance performance vs rate limits
- Use appropriate concurrency levels

### Data Processing
- Process large datasets efficiently
- Implement pagination for large results
- Use appropriate data structures
- Optimize GAQL queries

## Future Enhancements

### Planned Features
- Campaign management operations
- Bid strategy optimization
- Audience targeting
- A/B testing support
- Real-time reporting

### API Updates
- Monitor Google Ads API version updates
- Implement new features as available
- Maintain backward compatibility
- Follow Google's migration guides

## Token Storage Approach

### Simple Development Storage (Standard)

**This is the standard approach for ALL OAuth services in development:**

- **Direct Storage**: OAuth tokens are stored directly in `integrations.config.tokens` as plain JSON
- **No Encryption Complexity**: Keeps implementation simple and working
- **Database Security**: Tokens protected by Supabase Row Level Security policies
- **Applies to All Services**: Google Ads, Google Sheets, Facebook Ads, GoHighLevel

### Token Structure

```json
{
  "integrations": {
    "platform": "googleAds",
    "connected": true,
    "config": {
      "tokens": {
        "accessToken": "ya29.a0AfH6SMC...",
        "refreshToken": "1//04...",
        "expiresAt": "2024-01-01T12:00:00Z",
        "tokenType": "Bearer",
        "scope": "https://www.googleapis.com/auth/adwords"
      }
    }
  }
}
```

### Security Considerations

- **Database Level**: Supabase Row Level Security policies
- **Network Level**: HTTPS in production
- **Access Control**: Database access controls
- **Future Enhancement**: Encryption can be added later via database triggers without code changes

## Related Documentation

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Google Ads Query Language](https://developers.google.com/google-ads/api/docs/query/overview)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Database Documentation](./SUPABASE_DATABASE_DOCUMENTATION.md)
- [OAuth Implementation Guide](./OAUTH_IMPLEMENTATION_GUIDE.md)
