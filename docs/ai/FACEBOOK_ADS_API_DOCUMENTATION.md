# Facebook Ads API Documentation

## Overview

The Facebook Ads API integration provides comprehensive advertising analytics and campaign management capabilities. This service handles authentication, account discovery, metrics retrieval, and campaign data processing.

## Service Architecture

### Core Service: `FacebookAdsService`
- **Location**: `src/services/api/facebookAdsService.ts`
- **API Version**: v18.0 (configurable via `API_VERSIONS.FACEBOOK`)
- **Base URL**: `https://graph.facebook.com/v18.0`

## Authentication

### Token Management
- **Storage**: Supabase `integrations` table
- **Platform**: `facebookAds`
- **Token Type**: Long-lived access token
- **Scopes**: `ads_read`, `ads_management`, `business_management`

### Authentication Flow
```typescript
// Get access token from database
const token = await FacebookAdsService.getAccessToken();

// Validate token
const isValid = await FacebookAdsService.authenticate(token);

// Test connection
const testResult = await FacebookAdsService.testConnection();
```

### Token Validation
- Validates token with Facebook Graph API `/me` endpoint
- Checks for business management permissions
- Returns scope information and capabilities

## API Endpoints

### Account Management

#### Get Ad Accounts
```typescript
const accounts = await FacebookAdsService.getAdAccounts();
```

**Endpoint**: Multiple Facebook Graph API endpoints
- `/me/adaccounts` - User accounts
- `/me/businesses/{business_id}/owned_ad_accounts` - Business owned accounts
- `/me/businesses/{business_id}/client_ad_accounts` - Business client accounts
- System user accounts via business managers

**Features**:
- Comprehensive account discovery
- Pagination support
- Duplicate removal
- Caching in Supabase

#### Refresh Ad Accounts
```typescript
const accounts = await FacebookAdsService.refreshAdAccounts();
```
Forces fresh fetch from Facebook API, bypassing cache.

#### Search Ad Account by Name
```typescript
const accounts = await FacebookAdsService.searchAdAccountByName("Account Name");
```

#### Debug Ad Accounts
```typescript
const debugInfo = await FacebookAdsService.debugAdAccounts();
```
Returns detailed breakdown of account sources and access methods.

### Campaign Management

#### Get Campaigns
```typescript
const campaigns = await FacebookAdsService.getCampaigns(adAccountId, dateRange);
```

**Endpoint**: `/{ad_account_id}/campaigns`
**Fields**: `id`, `name`, `status`, `objective`, `insights{...}`

#### Get Conversion Actions
```typescript
const actions = await FacebookAdsService.getConversionActions(adAccountId);
```

**Endpoint**: `/{ad_account_id}/customconversions`
**Fallback**: Returns standard conversion actions if no custom conversions exist

### Metrics and Analytics

#### Get Account Metrics
```typescript
const metrics = await FacebookAdsService.getAccountMetrics(adAccountId, dateRange, conversionAction);
```

**Endpoint**: `/{ad_account_id}/insights`
**Fields**: `impressions`, `clicks`, `spend`, `actions`, `ctr`, `cpc`, `cpm`, `reach`, `frequency`

**Features**:
- 5-minute caching
- Demographic breakdown
- Platform breakdown
- Conversion action filtering

#### Get Demographic Breakdown
```typescript
const demographics = await FacebookAdsService.getDemographicBreakdown(adAccountId, dateRange);
```

**Endpoint**: `/{ad_account_id}/insights`
**Breakdown**: `age`, `gender`
**Age Groups**: 25-34, 35-44, 45-54, 55+

#### Get Platform Breakdown
```typescript
const platformData = await FacebookAdsService.getPlatformBreakdown(adAccountId, dateRange);
```

**Endpoint**: `/{ad_account_id}/insights`
**Breakdown**: `publisher_platform`, `platform_position`
**Platforms**: Facebook vs Instagram
**Positions**: Feed, Stories, Reels

## Rate Limiting

### Implementation
- **Token Bucket**: 5 requests per second maximum
- **Minimum Interval**: 100ms between requests
- **Retry Logic**: Exponential backoff with 3 max retries
- **Rate Limit Handling**: Automatic retry with `Retry-After` header

### Rate Limit Headers
- `X-App-Usage-Call-Count`: Remaining calls
- `X-App-Usage-Time-Reset`: Reset timestamp
- `Retry-After`: Seconds to wait

## Error Handling

### Common Error Codes
- **429**: Rate limit exceeded
- **613**: App rate limit exceeded
- **4**: Application request limit reached
- **190**: Access token expired

### Error Recovery
- Automatic retry with exponential backoff
- Token refresh for expired tokens
- Graceful degradation for missing permissions

## Data Models

### FacebookAdsMetrics
```typescript
interface FacebookAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
  demographics?: {
    ageGroups: {
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
    gender: {
      female: number;
      male: number;
    };
  };
  platformBreakdown?: {
    facebookVsInstagram: {
      facebook: number;
      instagram: number;
    };
    adPlacements: {
      feed: number;
      stories: number;
      reels: number;
    };
  };
}
```

### FacebookAdsCampaign
```typescript
interface FacebookAdsCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  objective: string;
  metrics: FacebookAdsMetrics;
  dateRange: {
    start: string;
    end: string;
  };
}
```

## Caching Strategy

### Request Caching
- **Duration**: 5 minutes
- **Storage**: In-memory Map
- **Key Format**: `{endpoint}-{parameters}`
- **Cache Control**: Manual invalidation

### Account Caching
- **Storage**: Supabase `integrations` table
- **Field**: `config.settings.adAccounts`
- **Refresh**: Manual or API failure fallback

## Business Manager Integration

### Tulen Agency Access
```typescript
const access = await FacebookAdsService.checkTulenAgencyAccess();
```

**Features**:
- Business manager discovery
- Owned vs client account separation
- Comprehensive access reporting

### System User Accounts
- Additional method for account discovery
- Handles complex business structures
- Ensures comprehensive coverage

## Webhook Support

### Webhook Handler
- **Location**: `src/services/webhooks/ghlWebhookHandler.ts`
- **Verification**: HMAC signature validation
- **Events**: Contact updates, campaign changes

## Environment Configuration

### Required Environment Variables
```bash
# Facebook App Configuration
VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_APP_SECRET=your_app_secret

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

### Integrations Table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai')),
  connected BOOLEAN DEFAULT false,
  account_name VARCHAR,
  account_id VARCHAR,
  last_sync TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Config Structure
```json
{
  "accessToken": "long_lived_access_token",
  "settings": {
    "adAccounts": [
      {
        "id": "act_123456789",
        "name": "Account Name",
        "account_status": "ACTIVE",
        "currency": "USD",
        "timezone_name": "America/New_York"
      }
    ]
  }
}
```

## Testing and Debugging

### Connection Testing
```typescript
const testResult = await FacebookAdsService.testConnection();
// Returns: { success: boolean, error?: string, accountInfo?: any }
```

### Debug Methods
- `debugAdAccounts()`: Detailed account discovery breakdown
- `checkTulenAgencyAccess()`: Business manager access verification
- `searchAdAccountByName()`: Account search functionality

### Logging
- **Service**: `debugLogger` from `@/lib/debug`
- **Levels**: debug, info, warn, error
- **Context**: Service name, method, data

## Best Practices

### Token Management
- Use long-lived tokens when possible
- Implement automatic refresh for expired tokens
- Store tokens securely in database

### Rate Limiting
- Respect Facebook's rate limits
- Implement exponential backoff
- Monitor usage headers

### Error Handling
- Handle all API error codes
- Provide meaningful error messages
- Implement retry logic for transient errors

### Data Processing
- Normalize data from different endpoints
- Handle missing or null values
- Implement proper type checking

## Troubleshooting

### Common Issues

#### No Ad Accounts Found
- Check business management permissions
- Verify token scopes
- Use `debugAdAccounts()` for detailed analysis

#### Rate Limit Errors
- Implement proper rate limiting
- Check `X-App-Usage` headers
- Use exponential backoff

#### Token Expiration
- Implement token refresh
- Handle 190 error codes
- Re-authenticate when necessary

### Debug Commands
```typescript
// Test connection
await FacebookAdsService.testConnection();

// Debug account discovery
await FacebookAdsService.debugAdAccounts();

// Check business manager access
await FacebookAdsService.checkTulenAgencyAccess();

// Search for specific account
await FacebookAdsService.searchAdAccountByName("Account Name");
```

## Security Considerations

### Token Security
- Store tokens encrypted in database
- Use HTTPS for all communications
- Implement proper token rotation

### API Security
- Validate all input parameters
- Use proper error handling
- Implement request signing where applicable

### Data Privacy
- Follow Facebook's data usage policies
- Implement proper data retention
- Handle user consent appropriately

## Performance Optimization

### Caching
- Implement request-level caching
- Cache account lists
- Use appropriate cache durations

### Parallel Requests
- Use `Promise.allSettled()` for parallel operations
- Implement proper error handling
- Balance performance vs rate limits

### Data Processing
- Process large datasets efficiently
- Implement pagination for large results
- Use appropriate data structures

## Future Enhancements

### Planned Features
- Real-time webhook processing
- Advanced campaign management
- Custom audience integration
- A/B testing support

### API Updates
- Monitor Facebook API version updates
- Implement new features as available
- Maintain backward compatibility

## Related Documentation

- [Facebook Marketing API Documentation](https://developers.facebook.com/docs/marketing-api/)
- [Facebook Business Manager Guide](https://www.facebook.com/business/help/117592471334245)
- [Facebook Ads Manager](https://www.facebook.com/business/ads-manager)
- [Supabase Database Documentation](./SUPABASE_DATABASE_DOCUMENTATION.md)
- [OAuth Implementation Guide](./OAUTH_IMPLEMENTATION_GUIDE.md)
