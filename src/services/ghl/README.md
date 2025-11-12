# GoHighLevel Services

## Architecture Overview

The GHL services are organized by responsibility following separation of concerns. This makes the codebase maintainable, testable, and easy to extend.

## Service Structure

### Core Services (Organized by Responsibility)

1. **`goHighLevelApiService.ts`** - Core API endpoints (contacts, opportunities, funnels, etc.)
2. **`goHighLevelAnalyticsService.ts`** - Analytics aggregations and metrics calculations
3. **`ghlOAuthService.ts`** - OAuth 2.0 flow, token exchange, and token management
4. **`goHighLevelAuthService.ts`** - Token caching and credential management
5. **`goHighLevelOAuthConfigService.ts`** - OAuth configuration management
6. **`goHighLevelTypes.ts`** - TypeScript type definitions
7. **`goHighLevelUtils.ts`** - Rate limiting and shared utilities

## Adding a New GHL Endpoint

### Step 1: Add Type Definition

Add the interface to `goHighLevelTypes.ts`:

```typescript
export interface GHLNewResource {
  id: string;
  name?: string;
  // ... other fields
}
```

### Step 2: Add API Method

Add a static method to `GoHighLevelApiService` class in `goHighLevelApiService.ts`:

**Why separate services?**
- **Separation of Concerns**: Each service has one clear responsibility
- **Maintainability**: Easier to find and fix issues
- **Testability**: Can test each service independently
- **Extensibility**: Easy to add new endpoints without touching other code

```typescript
// Example: Adding a new endpoint
static async getNewResource(locationId: string, params?: { limit?: number }): Promise<GHLNewResource[]> {
  await GHLRateLimiter.enforceRateLimit();
  
  const token = await this.getValidToken(locationId);
  if (!token) {
    throw new Error(`No valid OAuth token found for location ${locationId}`);
  }

  try {
    const url = `${this.API_BASE_URL}/new-resource?location_id=${locationId}&limit=${params?.limit || 100}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': this.API_VERSION,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      await GHLRateLimiter.handleRateLimitError(response);
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || 
        `API call failed: ${response.status} ${response.statusText}`;
      
      debugLogger.error('GoHighLevelApiService', 'New resource API call failed', {
        status: response.status,
        locationId,
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const resources = Array.isArray(data.resources) ? data.resources : [];
    
    debugLogger.info('GoHighLevelApiService', 'New resource fetched successfully', { 
      locationId,
      count: resources.length
    });
    
    return resources;
  } catch (error) {
    debugLogger.error('GoHighLevelApiService', 'Failed to get new resource', error);
    throw error;
  }
}
```

### Step 3: Use in Analytics Service (Optional)

If the endpoint should be aggregated into analytics, add it to `goHighLevelAnalyticsService.ts`:

```typescript
// In getGHLMetrics method
const newResourceData = await GoHighLevelApiService.getNewResource(locationId);
// Process and include in result
```

### Step 4: Add to Analytics Orchestrator (If Needed)

If it should be included in dashboard data, add to `analyticsOrchestrator.ts`:

```typescript
// In getGoHighLevelData method
const newResourceData = await GoHighLevelApiService.getNewResource(locationId);
// Include in normalized data
```

## Key Patterns

### 1. Token Management
All endpoints use `getValidToken(locationId)` which:
- Automatically handles token refresh
- Uses client-specific OAuth credentials
- Caches tokens in memory

### 2. Rate Limiting
Always call `await GHLRateLimiter.enforceRateLimit()` before API calls.

### 3. Error Handling
- Use `GHLRateLimiter.handleRateLimitError(response)` for rate limit errors
- Log errors with `debugLogger.error()`
- Throw descriptive error messages

### 4. Logging
- Use `debugLogger.info()` for successful operations
- Use `debugLogger.error()` for failures
- Include relevant context (locationId, counts, etc.)

### 5. Response Parsing
- Always validate response structure
- Handle empty/null responses gracefully
- Use TypeScript types for type safety

## Current Endpoints

- **Contacts**: `getContacts()`, `getContactsByTag()`
- **Opportunities**: `getOpportunities()`, `getWonOpportunities()`, `getOpportunitiesByStatus()`
- **Funnels**: `getFunnels()`, `getFunnelPages()`
- **Campaigns**: `getCampaigns()` (not available in current API)

## Token Refresh

Token refresh is handled automatically via `getValidToken()`. The system:
1. Checks token expiration (5-minute buffer)
2. Uses stored `oauthClientId` for refresh
3. Falls back to database/environment credentials
4. Invalidates cache after refresh

## Caching

- API responses are cached for 5 minutes
- Cache keys include locationId and parameters
- Cache is invalidated on token refresh
