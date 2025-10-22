# GoHighLevel API Documentation

## Overview

The GoHighLevel API integration provides comprehensive CRM and marketing automation capabilities. This service handles OAuth authentication, location management, contact tracking, campaign analytics, and funnel management using GoHighLevel's Lead Connector API.

## Service Architecture

### Core Services
- **Main Service**: `GoHighLevelService` - Unified interface
- **API Service**: `GoHighLevelApiService` - Core API operations
- **Analytics Service**: `GoHighLevelAnalyticsService` - Metrics and reporting
- **Auth Service**: `GoHighLevelAuthService` - Authentication and token management
- **Webhook Handler**: `ghlWebhookHandler` - Real-time event processing

### API Configuration
- **Base URL**: `https://services.leadconnectorhq.com`
- **API Version**: `2021-07-28`
- **Authentication**: OAuth 2.0 + Agency Token (deprecated)

## Authentication

### OAuth 2.0 Flow
- **Authorization URL**: `https://marketplace.leadconnectorhq.com/oauth/chooselocation`
- **Token URL**: `https://services.leadconnectorhq.com/oauth/token`
- **Grant Type**: `authorization_code`
- **User Type**: `Location`

### OAuth Implementation
```typescript
// Generate authorization URL
const authUrl = GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, scopes);

// Exchange code for token
const tokenData = await GoHighLevelAuthService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
```

### Agency Token (Deprecated)
- **Token Format**: Starts with "pit-" (Private Integration Token)
- **Storage**: Supabase `integrations` table
- **Usage**: Fallback for legacy integrations

### Location-Based Authentication
- **Primary Method**: Client-specific OAuth tokens
- **Storage**: Per-location token mapping
- **Validation**: Location ID format validation

## API Endpoints

### Location Management

#### Get Locations
```typescript
const locations = await GoHighLevelApiService.getLocations();
```

**Endpoint**: `/locations`
**Features**:
- Pagination support
- Status filtering
- Comprehensive location data

#### Get Location Details
```typescript
const location = await GoHighLevelApiService.getLocation(locationId);
```

**Endpoint**: `/locations/{locationId}`
**Fields**: `id`, `name`, `address`, `phone`, `website`, `timezone`

### Contact Management

#### Get Contacts
```typescript
const contacts = await GoHighLevelApiService.getContacts(locationId, limit, offset);
```

**Endpoint**: `/contacts/?locationId={locationId}`
**Parameters**:
- `limit`: Number of contacts per page (default: 100)
- `offset`: Pagination offset (default: 0)
- `locationId`: Required location identifier

**Features**:
- Pagination support
- Contact filtering
- Custom field support

#### Get Contact Count
```typescript
const count = await GoHighLevelApiService.getContactCount(locationId, dateParams);
```

**Endpoint**: `/contacts/search` (POST)
**Parameters**:
- `locationId`: Required location identifier
- `dateParams`: Optional date range filtering

**⚠️ API Limitations**:
- **Date Filtering**: GoHighLevel API 2.0 does NOT support `gte`/`lte` operators for `date_added` field
- **Workaround**: Use in-memory filtering for date-based queries
- **Performance**: Fetch limited records (100) and filter client-side

**Implementation**:
```typescript
// ❌ NOT SUPPORTED - Will cause 422 error
filters: [{
  field: "dateAdded",
  operator: "gte",
  value: startDate
}]

// ✅ CORRECT - Use in-memory filtering
const contacts = await fetch('/contacts/search', {
  method: 'POST',
  body: JSON.stringify({ locationId, limit: 100 })
});
const filteredCount = contacts.filter(contact => 
  new Date(contact.dateAdded) >= startDate
).length;
```

#### Get Contact by ID
```typescript
const contact = await GoHighLevelApiService.getContact(contactId, locationId);
```

**Endpoint**: `/contacts/{contactId}`
**Fields**: `id`, `firstName`, `lastName`, `email`, `phone`, `tags`, `customFields`

### Campaign Management

#### Get Campaigns
```typescript
const campaigns = await GoHighLevelApiService.getCampaigns(locationId);
```

**Endpoint**: `/campaigns/?locationId={locationId}`
**Fields**: `id`, `name`, `status`, `type`, `createdAt`, `updatedAt`

#### Get Campaign Details
```typescript
const campaign = await GoHighLevelApiService.getCampaign(campaignId, locationId);
```

**Endpoint**: `/campaigns/{campaignId}`
**Features**:
- Campaign metrics
- Performance data
- Status information

### Funnel Management

#### Get Funnels
```typescript
const funnels = await GoHighLevelApiService.getFunnels(locationId);
```

**Endpoint**: `/funnels/?locationId={locationId}`
**Fields**: `id`, `name`, `status`, `pages`, `conversions`

#### Get Funnel Pages
```typescript
const pages = await GoHighLevelApiService.getFunnelPages(funnelId, locationId);
```

**Endpoint**: `/funnels/{funnelId}/pages`
**Features**:
- Page analytics
- Conversion tracking
- Performance metrics

### Opportunity Management

#### Get Opportunities
```typescript
const opportunities = await GoHighLevelApiService.getOpportunities(locationId, limit, offset);
```

**Endpoint**: `/opportunities/?locationId={locationId}`
**Parameters**:
- `limit`: Number of opportunities per page
- `offset`: Pagination offset
- `locationId`: Required location identifier

**Fields**: `id`, `title`, `status`, `value`, `contactId`, `pipelineId`

### Calendar Management

#### Get Calendar Events
```typescript
const events = await GoHighLevelApiService.getCalendarEvents(locationId);
```

**Endpoint**: `/calendars/events?locationId={locationId}` (GET)
**Parameters**:
- `locationId`: Required location identifier

**⚠️ Important**: 
- **HTTP Method**: Must use GET, not POST
- **Query Parameters**: Pass `locationId` as query parameter, not in body
- **Response Format**: Events are in `response.events` or `response.data`

**Fields**: `id`, `title`, `startTime`, `endTime`, `attendees`, `status`

**Implementation**:
```typescript
// ✅ CORRECT - GET method with query parameters
const response = await this.makeApiRequest(
  `/calendars/events?locationId=${locationId}`,
  { token, method: 'GET' }
);
const events = response.events || response.data || [];

// ❌ INCORRECT - POST method will fail
const response = await this.makeApiRequest('/calendars/events', {
  method: 'POST',
  body: JSON.stringify({ locationId })
});
```

## Analytics and Metrics

### Comprehensive Metrics
```typescript
const metrics = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, dateRange);
```

**Metrics Included**:
- Contact metrics
- Campaign performance
- Funnel analytics
- Page analytics
- Opportunity tracking
- Calendar events

### Contact Analytics
```typescript
const contactMetrics = await GoHighLevelAnalyticsService.getContactMetrics(locationId, dateRange);
```

**Metrics**:
- Total contacts
- New contacts (simplified due to API limitations)
- Contact growth rate (simplified due to API limitations)
- Source attribution
- Tag distribution

**⚠️ API Limitations**:
- **Date Filtering**: GoHighLevel API 2.0 has limited date filtering support
- **Workaround**: Analytics service uses simplified metrics without complex date calculations
- **Performance**: Fetch total counts and calculate basic metrics only

**Implementation**:
```typescript
// ✅ SIMPLIFIED - Works within API constraints
return {
  total: await GoHighLevelApiService.getContactCount(locationId),
  newThisMonth: 0, // Set to 0 due to API limitations
  growthRate: 0 // Calculate manually if needed
};

// ❌ COMPLEX - Will fail due to unsupported date operators
const newThisMonth = await GoHighLevelApiService.getContactCount(locationId, {
  startDate: startOfMonth.toISOString(),
  endDate: now.toISOString()
});
```

### Campaign Analytics
```typescript
const campaignMetrics = await GoHighLevelAnalyticsService.getCampaignMetrics(locationId, dateRange);
```

**Metrics**:
- Campaign performance
- Conversion rates
- Cost per acquisition
- Return on investment
- Engagement metrics

### Funnel Analytics
```typescript
const funnelMetrics = await GoHighLevelAnalyticsService.getFunnelAnalytics(locationId, dateRange);
```

**Metrics**:
- Funnel conversion rates
- Page performance
- Drop-off analysis
- Completion rates
- Revenue attribution

### Page Analytics
```typescript
const pageMetrics = await GoHighLevelAnalyticsService.getPageAnalytics(locationId, dateRange);
```

**Metrics**:
- Page views
- Unique visitors
- Conversion rates
- Bounce rates
- Time on page

### Opportunity Analytics
```typescript
const opportunityMetrics = await GoHighLevelAnalyticsService.getOpportunitiesAnalytics(locationId, dateRange);
```

**Metrics**:
- Opportunity count
- Win rate
- Average deal size
- Sales cycle length
- Pipeline value

### Calendar Analytics
```typescript
const calendarMetrics = await GoHighLevelAnalyticsService.getCalendarAnalytics(locationId, dateRange);
```

**Metrics**:
- Event count
- Attendance rates
- Booking conversion
- Time slot utilization
- Revenue per event

## Rate Limiting

### Implementation
- **Rate Limiter**: `GHLRateLimiter` utility class
- **Strategy**: Token bucket with configurable limits
- **Retry Logic**: Exponential backoff
- **Error Handling**: Automatic retry on 429 responses

### Official Rate Limits (API 2.0)
- **Burst Limit**: 100 requests per 10 seconds per resource
- **Daily Limit**: 200,000 requests per day per resource
- **Per Location**: Limits apply per location, not globally

### Rate Limit Management
```typescript
// Enforce rate limit before API calls
await GHLRateLimiter.enforceRateLimit();

// Handle rate limit errors
if (response.status === 429) {
  await GHLRateLimiter.handleRateLimitError(response);
  // Retry the request
  return this.makeApiRequest<T>(endpoint, options);
}
```

## Data Models

### GHLContact
```typescript
interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### GHLCampaign
```typescript
interface GHLCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
```

### GHLFunnel
```typescript
interface GHLFunnel {
  id: string;
  name: string;
  status: string;
  pages: GHLFunnelPage[];
  conversions: number;
}
```

### GHLFunnelPage
```typescript
interface GHLFunnelPage {
  id: string;
  name: string;
  url: string;
  views: number;
  conversions: number;
  conversionRate: number;
}
```

### GHLOpportunity
```typescript
interface GHLOpportunity {
  id: string;
  title: string;
  status: string;
  value: number;
  contactId: string;
  pipelineId: string;
  createdAt: string;
  updatedAt: string;
}
```

### GHLCalendarEvent
```typescript
interface GHLCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  status: string;
}
```

### GHLMetrics
```typescript
interface GHLMetrics {
  contacts: GHLContactAnalytics;
  campaigns: GHLCampaignAnalytics;
  funnels: GHLFunnelAnalytics;
  pages: GHLPageAnalytics;
  opportunities: GHLOpportunityAnalytics;
  calendars: GHLCalendarAnalytics;
}
```

## Database Schema

### GoHighLevel App Credentials
```sql
CREATE TABLE ghl_app_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name VARCHAR DEFAULT 'Marketing Analytics Dashboard',
  client_id VARCHAR,
  client_secret VARCHAR,
  shared_secret VARCHAR,
  redirect_uri VARCHAR,
  environment VARCHAR DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
  is_active BOOLEAN DEFAULT true,
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
  account_id VARCHAR, -- Location ID for GHL
  last_sync TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Config Structure
```json
{
  "apiKey": {
    "apiKey": "pit-your-agency-token"
  },
  "oauth": {
    "accessToken": "oauth_access_token",
    "refreshToken": "oauth_refresh_token",
    "expiresAt": "2024-12-31T23:59:59Z",
    "locationId": "location_123456"
  },
  "settings": {
    "locations": [
      {
        "id": "location_123456",
        "name": "Client Location",
        "status": "active"
      }
    ]
  }
}
```

## Webhook Integration

### Webhook Handler
- **Location**: `src/services/webhooks/ghlWebhookHandler.ts`
- **Events**: Contact updates, opportunity changes, campaign events
- **Verification**: HMAC signature validation
- **Processing**: Real-time data synchronization

### Supported Webhook Events
- `contact.created`
- `contact.updated`
- `contact.deleted`
- `opportunity.created`
- `opportunity.updated`
- `opportunity.deleted`
- `campaign.created`
- `campaign.updated`

### Webhook Setup
```typescript
await GoHighLevelAuthService.setupWebhook(locationId, webhookUrl, events);
```

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid parameters
- **401**: Unauthorized - Invalid token
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **422**: Unprocessable Entity - Invalid operator or field (e.g., `gte` operator for `date_added`)
- **429**: Too Many Requests - Rate limit exceeded

### Error Recovery
```typescript
if (!response.ok) {
  const errorText = await response.text();
  let errorMessage = `API request failed: ${response.statusText}`;
  let errorDetails: any = {};
  
  try {
    const errorData = JSON.parse(errorText);
    if (errorData.error) {
      errorMessage = errorData.error;
    }
    if (errorData.message) {
      errorMessage = errorData.message;
    }
    errorDetails = errorData;
  } catch {
    // Use default error message if JSON parsing fails
    errorDetails = { rawError: errorText };
  }
  
  debugLogger.error('GoHighLevelApiService', 'API request failed', {
    url,
    status: response.status,
    statusText: response.statusText,
    errorMessage,
    errorDetails
  });
  
  throw new Error(`${errorMessage} (Status: ${response.status})`);
}
```

## Testing and Debugging

### Connection Testing
```typescript
const testResult = await GoHighLevelAuthService.testAgencyToken(token);
// Returns: { success: boolean, message: string, locations?: any[], capabilities?: any }
```

### Authentication Testing
```typescript
const accountInfo = await GoHighLevelAuthService.getAccountInfo();
const companyInfo = await GoHighLevelAuthService.getCompanyInfo();
```

### Debug Methods
- `testAgencyToken()`: Test agency token validity
- `getAccountInfo()`: Get account information
- `getCompanyInfo()`: Get company details
- `verifyWebhookSignature()`: Validate webhook signatures

## Environment Configuration

### Required Environment Variables
```bash
# GoHighLevel OAuth Configuration
VITE_GHL_CLIENT_ID=your_client_id
VITE_GHL_CLIENT_SECRET=your_client_secret
VITE_GHL_REDIRECT_URI=your_redirect_uri

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### OAuth Redirect URIs
- **Development**: `http://localhost:3000/oauth/ghl-callback`
- **Production**: `https://reporting.tulenagency.com/oauth/ghl-callback`

## API Limitations & Constraints

### Contact Search Limitations
- **Date Filtering**: `gte`/`lte` operators NOT supported for `date_added` field
- **Workaround**: Use in-memory filtering for date-based queries
- **Performance Impact**: Fetch limited records (100) and filter client-side
- **Alternative Fields**: `createdAt` field may support some operators

### Calendar Events Limitations
- **HTTP Method**: Must use GET, not POST
- **Query Parameters**: Pass `locationId` as query parameter only
- **Response Format**: Events may be in `response.events` or `response.data`

### Analytics Limitations
- **Complex Date Calculations**: Not supported due to API constraints
- **Workaround**: Use simplified metrics without complex date filtering
- **Performance**: Focus on total counts rather than date-specific metrics

### Rate Limiting Constraints
- **Burst Limit**: 100 requests per 10 seconds per resource
- **Daily Limit**: 200,000 requests per day per resource
- **Per Location**: Limits apply per location, not globally

## Best Practices

### Token Management
- Use OAuth tokens for client-specific access
- Implement automatic token refresh
- Store tokens securely in database
- Handle token expiration gracefully

### Rate Limiting
- Respect GoHighLevel's rate limits (100/10s burst, 200k/day)
- Implement proper backoff strategies
- Use rate limiter utility
- Monitor API usage patterns

### Error Handling
- Handle all API error codes (especially 422 for invalid operators)
- Implement retry logic for transient errors
- Provide meaningful error messages with status codes
- Log detailed error information for debugging

### Data Processing
- Validate all input parameters
- Handle missing or null values gracefully
- Implement proper type checking
- Use appropriate data structures
- **Avoid unsupported operators**: Don't use `gte`/`lte` for `date_added` field

### API Compliance
- **Use correct HTTP methods**: GET for calendar events, POST for contact search
- **Follow query parameter patterns**: Use query params for GET requests
- **Implement fallback strategies**: Handle API limitations gracefully
- **Monitor API changes**: Stay updated with GoHighLevel API updates

## Troubleshooting

### Common Issues

#### Contact Search 422 Error
**Error**: `Invalid Operator (gte) passed for field date_added`
**Cause**: GoHighLevel API 2.0 doesn't support `gte`/`lte` operators for `date_added` field
**Solution**: Use in-memory filtering instead of API filters
```typescript
// ❌ Causes 422 error
filters: [{ field: "dateAdded", operator: "gte", value: startDate }]

// ✅ Correct approach
const contacts = await fetch('/contacts/search', { 
  body: JSON.stringify({ locationId, limit: 100 }) 
});
const filtered = contacts.filter(c => new Date(c.dateAdded) >= startDate);
```

#### Calendar Events API Failure
**Error**: `API request failed` for calendar events
**Cause**: Using POST method instead of GET
**Solution**: Use GET method with query parameters
```typescript
// ❌ Incorrect - POST method
const response = await this.makeApiRequest('/calendars/events', {
  method: 'POST',
  body: JSON.stringify({ locationId })
});

// ✅ Correct - GET method with query params
const response = await this.makeApiRequest(
  `/calendars/events?locationId=${locationId}`,
  { method: 'GET' }
);
```

#### No Locations Found
- Verify OAuth token permissions
- Check location access levels
- Use `testAgencyToken()` for debugging

#### Rate Limit Errors
- Implement proper rate limiting
- Use `GHLRateLimiter` utility
- Monitor API usage patterns
- Respect 100 requests/10s burst limit

#### Token Expiration
- Implement automatic refresh
- Handle 401 errors gracefully
- Re-authenticate when necessary

#### Webhook Failures
- Verify webhook signatures
- Check webhook URL accessibility
- Monitor webhook event processing

### Debug Commands
```typescript
// Test agency token
await GoHighLevelAuthService.testAgencyToken(token);

// Get account info
await GoHighLevelAuthService.getAccountInfo();

// Get locations
await GoHighLevelApiService.getLocations();

// Get metrics
await GoHighLevelAnalyticsService.getGHLMetrics(locationId, dateRange);
```

## Security Considerations

### Token Security
- Store tokens encrypted in database
- Use HTTPS for all communications
- Implement proper token rotation
- Use OAuth 2.0 best practices

### API Security
- Validate all input parameters
- Use proper error handling
- Implement webhook signature verification
- Follow GoHighLevel's security guidelines

### Data Privacy
- Follow GoHighLevel's data usage policies
- Implement proper data retention
- Handle user consent appropriately
- Comply with privacy regulations

## Performance Optimization

### Caching
- Cache location data
- Cache account information
- Use appropriate cache durations
- Implement cache invalidation

### Parallel Requests
- Use `Promise.allSettled()` for parallel operations
- Implement proper error handling
- Balance performance vs rate limits
- Use appropriate concurrency levels

### Data Processing
- Process large datasets efficiently
- Implement pagination for large results
- Use appropriate data structures
- Optimize API calls

## Future Enhancements

### Planned Features
- Advanced campaign management
- Real-time webhook processing
- Custom field integration
- Advanced reporting
- A/B testing support

### API Updates
- Monitor GoHighLevel API updates
- Implement new features as available
- Maintain backward compatibility
- Follow GoHighLevel's migration guides

## Related Documentation

- [GoHighLevel API Documentation](https://highlevel.stoplight.io/docs/integrations)
- [GoHighLevel OAuth Guide](https://highlevel.stoplight.io/docs/integrations/ZG9jOjEwODQ3MjQ0-oauth)
- [GoHighLevel Webhooks](https://highlevel.stoplight.io/docs/integrations/ZG9jOjEwODQ3MjQ1-webhooks)
- [Supabase Database Documentation](./SUPABASE_DATABASE_DOCUMENTATION.md)
- [OAuth Implementation Guide](./OAUTH_IMPLEMENTATION_GUIDE.md)
