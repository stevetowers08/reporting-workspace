# Google Ads Integration

**Last Updated:** January 20, 2025  
**Service Version:** v14 (V2 planned for v21)  
**Implementation Status:** 🔄 **V2 IMPLEMENTATION PENDING**

## V2 Architecture Implementation (Planned)

### 🔄 **AnalyticsOrchestratorV2** - Planned Implementation
- **Location:** `src/services/data/analyticsOrchestratorV2.ts`
- **API Version:** v21 (upgrade from v14)
- **Features:** Direct API calls, smart caching, request deduplication, error isolation
- **Status:** Following Facebook Ads V2 pattern for implementation

### Current Service: `GoogleAdsService` (V1)
- **Location:** `src/services/googleAds/accountsService.ts`
- **API Version:** v14
- **Status:** Active, will be replaced by V2 orchestrator

## Official Documentation

- **Google Ads API:** https://developers.google.com/google-ads/api
- **API Reference:** https://developers.google.com/google-ads/api/reference
- **Authentication Guide:** https://developers.google.com/google-ads/api/docs/oauth
- **Rate Limits:** https://developers.google.com/google-ads/api/docs/rate-limits

## Current Implementation

### Service Location
- **File:** `src/services/googleAds/accountsService.ts`
- **Class:** `GoogleAdsService`
- **Authentication:** OAuth 2.0 with access tokens

### Key Features
- ✅ Campaign management and insights
- ✅ Account configuration
- ✅ Comparison data and trends
- ✅ Cost Per Lead analysis with color coding
- ✅ Enhanced reporting with proper API endpoints
- ✅ Rate limiting and error handling

## Authentication Flow

### 1. OAuth Setup
```typescript
// Required environment variables
VITE_GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
VITE_GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret
```

### 2. Token Management
- Access tokens stored in Supabase `oauth_tokens` table
- Automatic token refresh using refresh tokens
- Secure token handling with encryption

### 3. Developer Token
- Required for all API calls
- Must be approved by Google
- Stored securely in environment variables

## API Endpoints

### Base Configuration
- **Base URL:** `https://googleads.googleapis.com/v14`
- **Rate Limit:** 10,000 calls/day
- **Authentication:** Bearer token in Authorization header
- **Developer Token:** Required in X-Goog-Developer-Token header

### Available Endpoints

#### Search Campaigns
```http
POST /customers/{customerId}/googleAds:search
```
**Purpose:** Search for campaigns, ad groups, keywords, etc.  
**Headers:**
- `Authorization: Bearer {access_token}`
- `X-Goog-Developer-Token: {developer_token}`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "query": "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status = 'ENABLED'"
}
```

#### Get Campaign Performance
```http
POST /customers/{customerId}/googleAds:search
```
**Query for Campaign Metrics:**
```sql
SELECT 
  campaign.id,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.cost_per_conversion,
  segments.date
FROM campaign 
WHERE segments.date BETWEEN '2025-01-01' AND '2025-01-20'
```

#### Get Account Information
```http
GET /customers/{customerId}
```
**Purpose:** Retrieve customer account details  
**Response includes:**
- Customer ID and name
- Currency code
- Time zone
- Account status

## Data Models

### GoogleAdsAccount
```typescript
interface GoogleAdsAccount {
  id: string;                    // Customer ID (1234567890)
  name: string;                  // Account name
  currency_code: string;         // Currency (USD, EUR, etc.)
  time_zone: string;             // Time zone
  descriptive_name: string;      // Descriptive name
  manager: boolean;              // Is manager account
  test_account: boolean;          // Is test account
  pay_per_conversion_eligibility_failure_reasons: string[];
}
```

### CampaignMetrics
```typescript
interface CampaignMetrics {
  campaign_id: string;           // Campaign ID
  campaign_name: string;         // Campaign name
  impressions: number;           // Total impressions
  clicks: number;               // Total clicks
  cost_micros: number;          // Cost in micros (divide by 1,000,000)
  conversions: number;          // Conversion count
  cost_per_conversion: number;  // Cost per conversion
  ctr: number;                  // Click-through rate
  cpc: number;                  // Cost per click
  date: string;                 // Date (YYYY-MM-DD)
  status: CampaignStatus;       // Campaign status
}
```

### CampaignStatus
```typescript
enum CampaignStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED'
}
```

## Cost Per Lead Color Coding

### Implementation
```typescript
const getCostPerLeadColor = (cpl: number): string => {
  if (cpl < 0) return 'text-green-600';      // Green: < $0
  if (cpl <= 20) return 'text-blue-600';    // Blue: $0-20
  if (cpl <= 30) return 'text-yellow-600';  // Yellow: $20-30
  if (cpl <= 100) return 'text-orange-600'; // Orange: $30-100
  return 'text-red-600';                     // Red: > $100
};
```

### Color Legend
- 🟢 **Green:** Cost Per Lead < $0 (Profitable)
- 🔵 **Blue:** Cost Per Lead $0-20 (Good)
- 🟡 **Yellow:** Cost Per Lead $20-30 (Moderate)
- 🟠 **Orange:** Cost Per Lead $30-100 (High)
- 🔴 **Red:** Cost Per Lead > $100 (Very High)

## Error Handling

### Common Error Codes
- `UNAUTHENTICATED` - Invalid or expired token
- `PERMISSION_DENIED` - Insufficient permissions
- `QUOTA_EXCEEDED` - Rate limit exceeded
- `INVALID_ARGUMENT` - Invalid request parameters
- `NOT_FOUND` - Resource not found

### Error Response Format
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials.",
    "status": "UNAUTHENTICATED",
    "details": [
      {
        "@type": "type.googleapis.com/google.ads.googleads.v14.errors.GoogleAdsFailure",
        "errors": [
          {
            "errorCode": {
              "authenticationError": "INVALID_CREDENTIALS"
            },
            "message": "Invalid credentials"
          }
        ]
      }
    ]
  }
}
```

### Retry Logic
- Automatic retry for quota exceeded errors
- Exponential backoff for temporary failures
- Circuit breaker pattern for persistent failures

## Rate Limiting

### Limits
- **Daily Limit:** 10,000 calls/day
- **Per Customer:** 1,000 calls/day per customer
- **Concurrent Requests:** 10 concurrent requests

### Implementation
```typescript
// Rate limiting is handled automatically
const campaigns = await GoogleAdsService.searchCampaigns(
  customerId, 
  query
);
```

## Caching Strategy

### Cache Duration
- **Account Data:** 15 minutes
- **Campaign Data:** 5 minutes
- **Performance Data:** 2 minutes

### Cache Keys
- Account data: `ga_account_${customerId}`
- Campaign insights: `ga_campaigns_${customerId}_${dateRange}`
- Performance data: `ga_performance_${customerId}_${dateRange}`

## Usage Examples

### Search Campaigns
```typescript
import { GoogleAdsService } from '@/services/googleAds/accountsService';

// Search for active campaigns
const query = `
  SELECT campaign.id, campaign.name, campaign.status 
  FROM campaign 
  WHERE campaign.status = 'ENABLED'
`;

const campaigns = await GoogleAdsService.searchCampaigns(
  '1234567890',
  query
);
```

### Get Performance Data
```typescript
// Get campaign performance for date range
const performanceQuery = `
  SELECT 
    campaign.id,
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    segments.date
  FROM campaign 
  WHERE segments.date BETWEEN '2025-01-01' AND '2025-01-20'
`;

const performance = await GoogleAdsService.getCampaignPerformance(
  customerId,
  performanceQuery
);
```

### Handle Errors
```typescript
try {
  const accounts = await GoogleAdsService.getAccounts();
} catch (error) {
  if (error.code === 'UNAUTHENTICATED') {
    // Token expired, trigger refresh
    await refreshGoogleAdsToken();
  }
}
```

## Testing

### Test Environment
- Use Google Ads test accounts
- Test with sandbox data
- Mock API responses for unit tests

### Test Data
```typescript
// Mock campaign performance for testing
const mockPerformance = {
  campaign_id: '123456789',
  campaign_name: 'Test Campaign',
  impressions: 50000,
  clicks: 2500,
  cost_micros: 50000000, // $50.00
  conversions: 25,
  cost_per_conversion: 2000000 // $2.00
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
- Cost per lead trends

### Alerts
- High error rates (>5%)
- Rate limit approaching (80% usage)
- Token expiration warnings
- Unusual cost per lead spikes

## Troubleshooting

### Common Issues

#### Token Expired
```typescript
// Check token expiration
const isExpired = await GoogleAdsService.isTokenExpired();
if (isExpired) {
  await GoogleAdsService.refreshToken();
}
```

#### Quota Exceeded
```typescript
// Implement backoff strategy
await GoogleAdsService.searchCampaigns(customerId, query, {
  retry: true,
  maxRetries: 3
});
```

#### Permission Denied
- Verify developer token is approved
- Check OAuth scopes include required permissions
- Ensure customer account access is granted

## Future Enhancements

### Planned Features
- [ ] Automated bid strategies
- [ ] Keyword performance analysis
- [ ] Audience insights
- [ ] Cross-campaign optimization

### API Updates
- Monitor Google Ads API version updates
- Plan migration to newer API versions
- Implement new features as they become available
