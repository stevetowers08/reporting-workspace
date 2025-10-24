# GoHighLevel CRM Integration

**Last Updated:** January 20, 2025  
**Service Version:** 2021-04-15 (API 2.0)  
**OAuth Implementation:** ✅ Complete with PKCE + State Parameter  
**Implementation Status:** ✅ Production Ready

## Official Documentation

- **GoHighLevel API:** https://highlevel.stoplight.io/docs/integrations
- **API Reference:** https://highlevel.stoplight.io/docs/integrations/ZG9jOjEwMDAwMDAw-api-reference
- **Authentication Guide:** https://highlevel.stoplight.io/docs/integrations/ZG9jOjEwMDAwMDAw-authentication
- **Rate Limits:** https://highlevel.stoplight.io/docs/integrations/ZG9jOjEwMDAwMDAw-rate-limits

## Current Implementation

### Service Architecture
- **OAuth Service:** `src/services/ghl/simpleGHLService.ts` - Complete OAuth implementation
- **API Service:** `src/services/ghl/goHighLevelApiService.ts` - API calls and data management
- **Analytics Service:** `src/services/ghl/goHighLevelAnalyticsService.ts` - Analytics and metrics
- **Authentication:** OAuth 2.0 + PKCE with automatic token refresh

### Key Features
- ✅ **Secure OAuth Flow** - PKCE + State parameter for enterprise security
- ✅ **Automatic Token Refresh** - Seamless token renewal before expiry
- ✅ **Contact Management** - Full CRUD operations with pagination
- ✅ **Opportunity Tracking** - Pipeline management and analytics
- ✅ **Funnel Analytics** - Complete funnel performance metrics
- ✅ **Pipeline Stage Management** - Opportunity stage tracking
- ✅ **Rate Limiting** - Automatic API rate limit handling
- ✅ **Error Recovery** - Comprehensive error handling and retry logic

## OAuth 2.0 Authentication Flow (Enhanced)

### 1. OAuth Configuration
```typescript
// Required environment variables
VITE_GHL_CLIENT_ID=68e135aa17f574067cfb7e39-mh47d35v
VITE_GHL_CLIENT_SECRET=dd991e4f-8f15-4d8f-a519-bbfc258341f7
VITE_GHL_REDIRECT_URI=https://yourdomain.com/oauth/callback
```

### Important: GoHighLevel OAuth Requirements

**GoHighLevel requires `client_secret` even with PKCE implementation.** This differs from standard OAuth 2.0 PKCE specifications where `client_secret` is optional for public clients.

**Request Format:** `application/x-www-form-urlencoded` (required)
**Endpoint:** `https://services.leadconnectorhq.com/oauth/token`

### Common 422 Error Causes
1. **Redirect URI Mismatch** - Must exactly match GoHighLevel app settings
2. **Code Expiration** - Authorization codes expire quickly (10 minutes)
3. **Code Already Used** - Codes can only be used once
4. **Missing user_type** - Must be "Company" or "Location"
5. **Invalid client_secret** - Check environment variables

### 2. Secure OAuth Flow (PKCE + State)
```typescript
import { SimpleGHLService } from '@/services/ghl/simpleGHLService';

// Generate secure authorization URL with PKCE + State
const authUrl = await SimpleGHLService.getAuthorizationUrl(
  clientId, 
  redirectUri, 
  scopes
);

// Open OAuth popup
const authWindow = window.open(authUrl, 'ghl-oauth', 'width=600,height=700');

// Handle callback with PKCE + state validation
const tokenData = await SimpleGHLService.exchangeCodeForToken(
  authCode, clientId, redirectUri, state
);
```

### 3. Token Management (Enhanced)
- ✅ **Secure Storage** - Tokens encrypted in Supabase database
- ✅ **Automatic Refresh** - Seamless token renewal with 5-minute buffer
- ✅ **PKCE Security** - No client secret exposure in frontend
- ✅ **Session Security** - PKCE verifier auto-clears on tab close
- ✅ **Expiry Tracking** - Automatic token expiration monitoring

### 4. Required Scopes (Enhanced)
- `contacts.read` - Read contact data
- `contacts.write` - Create/update contacts (✅ Added)
- `opportunities.read` - Read opportunity data
- `opportunities.write` - Create/update opportunities (✅ Added)
- `calendars.read` - Read calendar data
- `calendars.write` - Create/update calendar events (✅ Added)
- `funnels/funnel.readonly` - Read funnel data
- `funnels/page.readonly` - Read funnel page data
- `locations.readonly` - Read location information

## API Endpoints

### Base Configuration
- **Base URL:** `https://services.leadconnectorhq.com`
- **API Version:** `2021-04-15` (API 2.0)
- **Rate Limit:** 1000 calls/hour per location
- **Authentication:** Bearer token in Authorization header

### Available Endpoints

#### Search Contacts
```http
POST /contacts/search
```
**Purpose:** Search and retrieve contacts with pagination  
**Headers:**
- `Authorization: Bearer {location_token}`
- `Version: 2021-04-15`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "locationId": "V7bzEjKiigXzh8r6sQq0",
  "query": {
    "locationId": "V7bzEjKiigXzh8r6sQq0",
    "startAfterId": "contact_id_for_pagination",
    "limit": 100
  }
}
```

**Response:**
```json
{
  "contacts": [
    {
      "id": "contact_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "source": "Facebook Ads",
      "tags": ["lead", "hot"],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-20T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1500,
    "hasMore": true,
    "nextStartAfterId": "next_contact_id"
  }
}
```

#### Search Opportunities
```http
GET /opportunities/search?location_id={locationId}&limit=100
```
**Purpose:** Retrieve opportunities for a location  
**Parameters:**
- `location_id`: GoHighLevel location ID
- `limit`: Number of results (max 100)

**Response:**
```json
{
  "opportunities": [
    {
      "id": "opportunity_id",
      "contactId": "contact_id",
      "title": "Wedding Package",
      "value": 5000,
      "stage": "Qualified",
      "status": "Open",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-20T00:00:00Z"
    }
  ]
}
```

#### Refresh Token
```http
POST /oauth/token
```
**Purpose:** Refresh expired access tokens  
**Request Body:**
```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "refresh_token": "refresh_token",
  "grant_type": "refresh_token"
}
```

## Data Models

### GHLContact
```typescript
interface GHLContact {
  id: string;                    // Contact ID
  firstName: string;             // First name
  lastName: string;              // Last name
  email: string;                 // Email address
  phone: string;                 // Phone number
  source: string;                // Lead source
  tags: string[];                // Contact tags
  createdAt: string;            // Creation date
  updatedAt: string;            // Last update date
  locationId: string;           // Location ID
  customFields?: Record<string, any>; // Custom fields
}
```

### GHLOpportunity
```typescript
interface GHLOpportunity {
  id: string;                    // Opportunity ID
  contactId: string;             // Associated contact ID
  title: string;                 // Opportunity title
  value: number;                 // Opportunity value
  stage: string;                 // Pipeline stage
  status: 'Open' | 'Won' | 'Lost'; // Opportunity status
  createdAt: string;            // Creation date
  updatedAt: string;            // Last update date
  locationId: string;           // Location ID
  probability?: number;         // Win probability
  closeDate?: string;          // Expected close date
}
```

### GHLLocation
```typescript
interface GHLLocation {
  id: string;                    // Location ID
  name: string;                  // Location name
  address: string;               // Physical address
  city: string;                  // City
  state: string;                 // State
  phone: string;                 // Phone number
  website: string;               // Website URL
  timezone: string;              // Timezone
  currency: string;              // Currency
  status: string;               // Location status
}
```

## Pagination Handling

### Contact Pagination
```typescript
// Automatic pagination for large contact lists
const getAllContacts = async (locationId: string) => {
  let allContacts: GHLContact[] = [];
  let startAfterId: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await GoHighLevelApiService.searchContacts(
      locationId,
      startAfterId
    );
    
    allContacts.push(...response.contacts);
    hasMore = response.meta.hasMore;
    startAfterId = response.meta.nextStartAfterId;
  }

  return allContacts;
};
```

## Error Handling

### Common Error Codes
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Response Format
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": 429,
    "details": "Too many requests. Please try again later."
  }
}
```

### Retry Logic
- Automatic retry for rate limit errors (429)
- Exponential backoff for temporary failures
- Circuit breaker pattern for persistent failures

## Rate Limiting

### Limits
- **Per Location:** 1000 calls/hour
- **Burst Limit:** 100 calls/minute
- **Concurrent Requests:** 10 per location

### Implementation
```typescript
// Rate limiting is handled automatically
const contacts = await GoHighLevelApiService.searchContacts(
  locationId,
  startAfterId
);
```

## Caching Strategy

### Cache Duration
- **Contact Data:** 5 minutes
- **Opportunity Data:** 5 minutes
- **Location Data:** 15 minutes

### Cache Keys
- Contact data: `ghl_contacts_${locationId}_${startAfterId}`
- Opportunity data: `ghl_opportunities_${locationId}`
- Location data: `ghl_location_${locationId}`

## Usage Examples

### Get All Contacts
```typescript
import { GoHighLevelApiService } from '@/services/ghl/goHighLevelApiService';

// Get all contacts for a location
const contacts = await GoHighLevelApiService.getAllContacts(
  'V7bzEjKiigXzh8r6sQq0'
);
```

### Get Opportunities
```typescript
// Get opportunities for a location
const opportunities = await GoHighLevelApiService.getOpportunities(
  'V7bzEjKiigXzh8r6sQq0'
);
```

### Search Contacts with Filters
```typescript
// Search contacts with specific criteria
const contacts = await GoHighLevelApiService.searchContacts(
  'V7bzEjKiigXzh8r6sQq0',
  undefined, // startAfterId
  {
    tags: ['hot-lead'],
    source: 'Facebook Ads'
  }
);
```

### Handle Errors
```typescript
try {
  const contacts = await GoHighLevelApiService.searchContacts(locationId);
} catch (error) {
  if (error.status === 401) {
    // Token expired, trigger refresh
    await GoHighLevelApiService.refreshToken(locationId, refreshToken);
  }
}
```

## Testing

### Test Environment
- Use GoHighLevel sandbox accounts
- Test with mock data
- Mock API responses for unit tests

### Test Data
```typescript
// Mock contact data for testing
const mockContact: GHLContact = {
  id: 'test_contact_123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  source: 'Facebook Ads',
  tags: ['lead', 'hot'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-20T00:00:00Z',
  locationId: 'V7bzEjKiigXzh8r6sQq0'
};
```

## Security Considerations

### Token Security
- Location-specific tokens only
- Tokens encrypted in database
- HTTPS only for all API calls
- Regular token rotation

### Data Privacy
- No PII stored locally
- GDPR compliant data handling
- Secure data transmission
- Location-based access control

## Monitoring

### Metrics Tracked
- API call success rate
- Response times
- Rate limit usage
- Error frequency
- Contact sync status

### Alerts
- High error rates (>5%)
- Rate limit approaching (80% usage)
- Token expiration warnings
- Sync failures

## Troubleshooting

### Common Issues

#### Token Expired
```typescript
// Check token expiration
const isExpired = await GoHighLevelApiService.isTokenExpired(locationId);
if (isExpired) {
  await GoHighLevelApiService.refreshToken(locationId, refreshToken);
}
```

#### Rate Limit Exceeded
```typescript
// Implement backoff strategy
await GoHighLevelApiService.searchContacts(locationId, undefined, {
  retry: true,
  maxRetries: 3
});
```

#### Permission Denied
- Verify location has required permissions
- Check OAuth scopes include required access
- Ensure location is active and accessible

## Future Enhancements

### Planned Features
- [ ] Real-time contact updates
- [ ] Advanced opportunity analytics
- [ ] Automated lead scoring
- [ ] Cross-location reporting

### API Updates
- Monitor GoHighLevel API updates
- Plan migration to newer API versions
- Implement new features as they become available
