# Facebook Ads Integration

**Last Updated:** January 20, 2025  
**Service Version:** v18.0  
**Implementation Status:** ✅ Active

## Official Documentation

- **Facebook Marketing API:** https://developers.facebook.com/docs/marketing-api/
- **Graph API Reference:** https://developers.facebook.com/docs/graph-api/reference/
- **Authentication Guide:** https://developers.facebook.com/docs/marketing-api/authentication
- **Rate Limits:** https://developers.facebook.com/docs/marketing-api/rate-limits

## Current Implementation

### Service Location
- **File:** `src/services/api/facebookAdsService.ts`
- **Class:** `FacebookAdsService`
- **Authentication:** OAuth 2.0 with access tokens

### Key Features
- ✅ Campaign insights and metrics
- ✅ Ad account management
- ✅ Cost Per Link Click accuracy (cost_per_link_click)
- ✅ Comparison data and trends
- ✅ Rate limiting and error handling
- ✅ Caching for performance optimization

## Authentication Flow

### 1. OAuth Setup
```typescript
// Required environment variables
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### 2. Token Management
- Access tokens stored in Supabase `oauth_tokens` table
- Automatic token refresh before expiration
- Secure token handling with encryption

### 3. Permissions Required
- `ads_read` - Read ad account data
- `ads_management` - Manage campaigns
- `business_management` - Access business accounts

## API Endpoints

### Base Configuration
- **Base URL:** `https://graph.facebook.com/v18.0`
- **Rate Limit:** 200 calls/hour per app
- **Authentication:** Bearer token in Authorization header

### Available Endpoints

#### Get Ad Accounts
```http
GET /me/adaccounts
```
**Purpose:** Retrieve all accessible ad accounts  
**Parameters:**
- `fields`: Comma-separated list of fields to return
- `limit`: Number of results per page (max 100)

**Response:**
```json
{
  "data": [
    {
      "id": "act_123456789",
      "name": "Account Name",
      "account_status": 1,
      "currency": "USD",
      "timezone_name": "America/New_York"
    }
  ]
}
```

#### Get Campaign Insights
```http
GET /{ad-account-id}/insights
```
**Purpose:** Retrieve campaign performance metrics  
**Parameters:**
- `date_preset`: Time range (last_7d, last_30d, etc.)
- `level`: Data level (account, campaign, adset, ad)
- `fields`: Metrics to retrieve

**Key Metrics:**
- `impressions` - Number of impressions
- `clicks` - Number of clicks
- `spend` - Amount spent
- `cost_per_link_click` - Cost per link click (accurate CPC)
- `link_clicks` - Number of link clicks
- `conversions` - Conversion events

#### Get Campaigns
```http
GET /{ad-account-id}/campaigns
```
**Purpose:** Retrieve campaign information  
**Parameters:**
- `fields`: Campaign fields to return
- `effective_status`: Filter by campaign status

## Data Models

### FacebookAdsAccount
```typescript
interface FacebookAdsAccount {
  id: string;                    // Account ID (act_123456789)
  name: string;                  // Account name
  account_status: number;        // Account status code
  currency: string;              // Account currency (USD, EUR, etc.)
  timezone_name: string;         // Account timezone
  created_time: string;         // Account creation date
  business_name?: string;        // Business name
  business_id?: string;         // Business ID
}
```

### CampaignInsights
```typescript
interface CampaignInsights {
  campaign_id: string;          // Campaign ID
  campaign_name: string;        // Campaign name
  impressions: number;          // Total impressions
  clicks: number;               // Total clicks
  spend: number;                // Total spend
  cost_per_link_click: number;  // Cost per link click
  link_clicks: number;          // Link clicks
  conversions: number;         // Conversion events
  ctr: number;                 // Click-through rate
  cpm: number;                 // Cost per mille
  date_start: string;          // Campaign start date
  date_stop: string;           // Campaign end date
}
```

## Error Handling

### Common Error Codes
- `190` - Access token expired
- `200` - Permission denied
- `4` - Application request limit reached
- `17` - User request limit reached
- `32` - Page request limit reached

### Error Response Format
```json
{
  "error": {
    "message": "Error description",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 463,
    "fbtrace_id": "ABC123"
  }
}
```

### Retry Logic
- Automatic retry for rate limit errors (429)
- Exponential backoff for temporary failures
- Circuit breaker pattern for persistent failures

## Rate Limiting

### Limits
- **App Level:** 200 calls/hour
- **User Level:** 4,800 calls/hour
- **Page Level:** 4,800 calls/hour

### Implementation
```typescript
// Rate limiting is handled automatically
const insights = await FacebookAdsService.getCampaignInsights(
  accountId, 
  dateRange
);
```

## Caching Strategy

### Cache Duration
- **Campaign Data:** 5 minutes
- **Account Data:** 15 minutes
- **Insights Data:** 2 minutes

### Cache Keys
- Account data: `fb_account_${accountId}`
- Campaign insights: `fb_insights_${accountId}_${dateRange}`
- Campaign list: `fb_campaigns_${accountId}`

## Usage Examples

### Get Account Insights
```typescript
import { FacebookAdsService } from '@/services/api/facebookAdsService';

// Get campaign insights for last 30 days
const insights = await FacebookAdsService.getCampaignInsights(
  'act_123456789',
  {
    start: '2025-01-01',
    end: '2025-01-20'
  }
);
```

### Handle Errors
```typescript
try {
  const accounts = await FacebookAdsService.getAdAccounts();
} catch (error) {
  if (error.code === 190) {
    // Token expired, trigger refresh
    await refreshFacebookToken();
  }
}
```

## Testing

### Test Environment
- Use Facebook Test Users for development
- Test with sandbox ad accounts
- Mock API responses for unit tests

### Test Data
```typescript
// Mock campaign insights for testing
const mockInsights = {
  impressions: 10000,
  clicks: 500,
  spend: 250.00,
  cost_per_link_click: 0.50,
  link_clicks: 400
};
```

## Security Considerations

### Token Security
- Tokens encrypted in database
- HTTPS only for all API calls
- Regular token rotation

### Data Privacy
- No PII stored locally
- GDPR compliant data handling
- Secure data transmission

## Monitoring

### Metrics Tracked
- API call success rate
- Response times
- Rate limit usage
- Error frequency

### Alerts
- High error rates (>5%)
- Rate limit approaching (80% usage)
- Token expiration warnings

## Troubleshooting

### Common Issues

#### Token Expired
```typescript
// Check token expiration
const isExpired = await FacebookAdsService.isTokenExpired();
if (isExpired) {
  await FacebookAdsService.refreshToken();
}
```

#### Rate Limit Exceeded
```typescript
// Implement backoff strategy
await FacebookAdsService.getCampaignInsights(accountId, {
  retry: true,
  maxRetries: 3
});
```

#### Permission Denied
- Verify app permissions in Facebook Developer Console
- Check user has granted required permissions
- Ensure ad account access is granted

## Future Enhancements

### Planned Features
- [ ] Real-time campaign monitoring
- [ ] Advanced audience insights
- [ ] Automated bid optimization
- [ ] Cross-campaign analysis

### API Updates
- Monitor Facebook API version updates
- Plan migration to newer API versions
- Implement new features as they become available
