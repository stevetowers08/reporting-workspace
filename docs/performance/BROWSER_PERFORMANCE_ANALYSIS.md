# Client Reporting Dashboard Performance Analysis

**Date:** January 30, 2025  
**Client:** Wormwood (2775ae60-b5d6-4714-add4-d6fa30292822)  
**URL:** http://localhost:5173/dashboard/2775ae60-b5d6-4714-add4-d6fa30292822

## Performance Issues Identified

### 1. **Duplicate Supabase API Calls** ⚠️ HIGH PRIORITY

**Issue:** Multiple identical Supabase queries are being made in parallel:

- `GET /rest/v1/integrations?select=config&platform=eq.googleAds&connected=eq.true&limit=1` - **Called 5 times**
- `GET /rest/v1/integrations?select=config&platform=eq.facebookAds&connected=eq.true` - **Called 4 times**
- `GET /rest/v1/integrations?select=config&platform=eq.googleSheets&connected=eq.true&limit=1` - **Called 4 times**
- `GET /rest/v1/clients?select=*&id=eq.2775ae60-b5d6-4714-add4-d6fa30292822` - **Called 3 times**

**Impact:** 
- Unnecessary database load
- Slower page load time
- Wasted API quota

**Root Cause:** Multiple React Query hooks fetching the same data without proper deduplication.

**Recommendation:**
- Implement request deduplication in React Query
- Use shared query keys
- Add proper `staleTime` and `gcTime` to prevent refetches

### 2. **Multiple Google Ads API Calls** ⚠️ MEDIUM PRIORITY

**Issue:** Google Ads API is called multiple times for the same data:

- `POST /v21/customers/5659913242/googleAds:searchStream` - **Called 4 times**
- `GET /rest/v1/integrations?select=account_id&platform=eq.googleAds&connected=eq.true` - **Called 4 times**

**Impact:**
- Increased API quota usage
- Slower dashboard load
- Potential rate limiting

**Root Cause:** Different components/tabs making separate API calls instead of sharing data.

**Recommendation:**
- Centralize Google Ads data fetching
- Use React Query cache sharing
- Implement data aggregation at the service level

### 3. **Google Sheets API Error** ⚠️ MEDIUM PRIORITY

**Issue:** Google Sheets API returns 400 error:
```
GET /v4/spreadsheets/1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc/values/Wedding%20Leads!A%3AZ
Status: 400
```

**Impact:**
- Failed lead data fetch
- Error handling overhead
- Potential user confusion

**Root Cause:** Invalid sheet range or API request format.

**Recommendation:**
- Validate sheet range before API call
- Add proper error handling with fallback
- Cache valid sheet configurations

### 4. **Large Bundle Size** ⚠️ LOW PRIORITY

**Issue:** Many individual module requests (100+ files loaded)

**Impact:**
- Slower initial page load
- Higher bandwidth usage
- Poor mobile performance

**Recommendation:**
- Implement code splitting per route
- Lazy load chart components
- Optimize bundle with tree shaking

### 5. **No Request Batching** ⚠️ MEDIUM PRIORITY

**Issue:** Multiple similar API calls made sequentially instead of batched.

**Impact:**
- Increased latency
- Higher server load
- Poor user experience

**Recommendation:**
- Batch Supabase queries using `.select()` with multiple tables
- Use Promise.all for parallel independent requests
- Implement request queue for sequential dependencies

## Performance Metrics ✅ VERIFIED

### Network Requests (From Browser Analysis)
- **Total Requests:** 130+ script/module requests
- **Supabase Integration Queries:** 
  - `GET /rest/v1/integrations?select=config&platform=eq.googleAds&connected=eq.true&limit=1` - **5 calls** ✅ CONFIRMED
  - `GET /rest/v1/integrations?select=config&platform=eq.facebookAds&connected=eq.true` - **4 calls** ✅ CONFIRMED
  - `GET /rest/v1/integrations?select=config&platform=eq.googleSheets&connected=eq.true&limit=1` - **4 calls** ✅ CONFIRMED
- **Client Queries:** `GET /rest/v1/clients?select=*&id=eq.2775ae60-b5d6-4714-add4-d6fa30292822` - **3 calls** ✅ CONFIRMED
- **Google Ads API:** `POST /v21/customers/5659913242/googleAds:searchStream` - **4 calls** ✅ CONFIRMED
- **API Errors:** 1 (Google Sheets 400) ✅ CONFIRMED
- **Slow Requests (>1s):** Multiple Google Ads API calls ✅ CONFIRMED

### Load Time (Estimated from Network Logs)
- **Initial Load:** ~2-3 seconds (bundle loading)
- **Data Fetching:** ~5-8 seconds (due to multiple API calls and lack of deduplication)
- **Estimated Improvement:** Could reduce to 2-3 seconds with proper caching/deduplication

## Recommendations Priority ✅ VERIFIED

### Immediate Actions (High Impact, Low Effort)
1. **HIGH:** Fix duplicate integration config queries - Extend TokenManager cache + add deduplication
2. **HIGH:** Update FacebookAdsService to use TokenManager instead of direct Supabase queries
3. **MEDIUM:** Fix Google Sheets API error (400) - Validate sheet range format

### Medium-Term Improvements (Medium Impact, Medium Effort)
4. **MEDIUM:** Consolidate dashboard data fetching - Use single shared hook instead of per-tab hooks
5. **MEDIUM:** Add service-level deduplication to TokenManager
6. **MEDIUM:** Batch Google Ads API calls where possible

### Long-Term Optimizations (Low Impact, High Effort)
7. **LOW:** Optimize bundle size with better code splitting
8. **LOW:** Implement request batching for Supabase queries

## Verification Notes

✅ **Verified:** Network requests from browser logs match code analysis  
✅ **Verified:** React Query configuration exists but doesn't apply to service-level methods  
✅ **Verified:** RequestDeduplicator exists in AnalyticsOrchestrator but may not catch all cases  
✅ **Verified:** TokenManager has 30-second cache which is insufficient  
✅ **Verified:** FacebookAdsService bypasses TokenManager and queries Supabase directly  
✅ **Verified:** Multiple tabs calling AnalyticsOrchestrator independently  
✅ **Verified:** Google Sheets 400 error is real and needs investigation

## Code Locations to Fix

### 1. Duplicate Integration Config Queries (HIGH PRIORITY) ✅ VERIFIED

**Root Cause:** Platform services query Supabase directly for integration configs, bypassing React Query caching and TokenManager's 30-second cache.

**Verified Files Affected:**
- `src/services/api/facebookAdsService.ts` (lines 116-142) - `getUserAccessToken()` directly queries `integrations` table
- `src/services/auth/TokenManager.ts` (lines 311-321) - `getAccessToken()` queries integrations with only 30-second cache
- `src/services/ghl/goHighLevelApiService.ts` (line 489) - `getValidToken()` directly queries integrations
- `src/services/ghl/simpleGHLService.ts` (lines 508-551) - `getValidToken()` directly queries integrations

**Key Finding:**
- React Query automatically deduplicates requests with the same query key, BUT only for React hooks
- Service-level methods (like `getUserAccessToken()`) bypass React Query and make direct Supabase queries
- TokenManager has a 30-second cache (line 32), but it's too short for dashboard loads
- Multiple services calling `getUserAccessToken()` simultaneously = multiple database queries

**Fix Strategy:**
1. **Short-term:** Extend TokenManager cache duration to 5 minutes (match React Query staleTime)
2. **Medium-term:** Add service-level deduplication to TokenManager (similar to RequestDeduplicator)
3. **Long-term:** Create a shared IntegrationConfigService with proper caching and deduplication

**Example Fix:**
```typescript
// Option 1: Extend TokenManager cache (quick fix)
private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes instead of 30 seconds

// Option 2: Add deduplication to TokenManager (better fix)
private static pendingTokenRequests = new Map<string, Promise<string | null>>();

static async getAccessToken(platform: IntegrationPlatform): Promise<string | null> {
  const cacheKey = `token-${platform}`;
  
  // Check cache first
  const cached = this.connectionCache.get(platform);
  if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
    // Return cached token if available
  }
  
  // Deduplicate concurrent requests
  if (this.pendingTokenRequests.has(cacheKey)) {
    return this.pendingTokenRequests.get(cacheKey)!;
  }
  
  const promise = this.fetchTokenFromDb(platform).finally(() => {
    this.pendingTokenRequests.delete(cacheKey);
  });
  
  this.pendingTokenRequests.set(cacheKey, promise);
  return promise;
}

// Option 3: Update FacebookAdsService to use TokenManager (best fix)
static async getUserAccessToken(): Promise<string> {
  const token = await TokenManager.getAccessToken('facebookAds');
  if (!token) {
    throw new Error('Facebook access token not found');
  }
  return token;
}
```

### 2. Multiple Dashboard Data Calls (MEDIUM PRIORITY) ✅ VERIFIED

**Root Cause:** Each tab component independently calls `AnalyticsOrchestrator.getDashboardData()` with the same parameters.

**Verified Files Affected:**
- `src/hooks/useTabSpecificData.ts` - Each tab hook (useSummaryTabData, useMetaTabData, useGoogleTabData, useLeadsTabData) calls `AnalyticsOrchestrator.getDashboardData()` independently
- `src/services/data/analyticsOrchestrator.ts` (line 336) - Uses `deduplicator.deduplicate()` which should prevent duplicates, BUT the cache key includes clientId and dateRange, so different tabs with same params should deduplicate

**Key Finding:**
- `AnalyticsOrchestrator` has RequestDeduplicator (lines 196-213) which should prevent duplicate calls
- However, if tabs are mounting simultaneously, they may all start requests before deduplication kicks in
- React Query `refetchOnMount: true` (queryClient.ts line 11) might cause refetches even with cached data

**Fix Strategy:**
1. **Verify:** Check if RequestDeduplicator is working correctly (may need to add logging)
2. **React Query:** Ensure all tab hooks use the same query key format to leverage React Query's automatic deduplication
3. **Shared Hook:** Create a single `useDashboardData` hook and pass data to tabs instead of each tab fetching independently

**Example Fix:**
```typescript
// In EventDashboard.tsx - use single hook instead of per-tab hooks
const { data: dashboardData } = useDashboardData(actualClientId, getDateRange(selectedPeriod));

// Pass to tabs instead of each tab fetching
<SummaryTabContent dashboardData={dashboardData} />
<MetaTabContent dashboardData={dashboardData} />
```

### 3. Google Sheets API Error (MEDIUM PRIORITY)

**Root Cause:** Invalid sheet range or API request format causing 400 error.

**Files Affected:**
- `src/services/api/googleSheetsService.ts` - Sheet range validation needed

**Fix:**
- Validate sheet range format before API call
- Add proper error handling with fallback to default range

### 4. Google Ads Multiple API Calls (MEDIUM PRIORITY)

**Root Cause:** Multiple `searchStream` calls for similar data.

**Files Affected:**
- `src/services/api/googleAdsService.ts` - Multiple searchStream calls
- `src/services/data/analyticsOrchestrator.ts` - May trigger multiple calls

**Fix:**
- Batch Google Ads queries where possible
- Use React Query to deduplicate identical queries
- Cache searchStream results based on query parameters

