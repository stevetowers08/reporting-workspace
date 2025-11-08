# Request Prioritization Implementation

**Date:** January 2025  
**Status:** ✅ Implemented  
**Purpose:** Improve perceived performance by prioritizing critical user-visible data

## Overview

The request prioritization system ensures that critical data (user-visible metrics) loads before less important data (detailed breakdowns, background updates). This improves perceived performance and user experience.

## Architecture

### Priority Levels

```typescript
enum RequestPriority {
  CRITICAL = 1,  // User-visible data (summary metrics, main dashboard)
  HIGH = 2,      // Important metrics (platform-specific data)
  NORMAL = 3,    // Standard data (detailed breakdowns)
  LOW = 4        // Background updates (non-essential data)
}
```

### Components

1. **RequestScheduler** (`src/lib/requestScheduler.ts`)
   - Priority queue implementation
   - Processes up to 3 requests concurrently
   - Maintains priority order (lower number = higher priority)

2. **ApiClient Integration** (`src/lib/apiClient.ts`)
   - Accepts optional `priority` parameter
   - Defaults to `NORMAL` priority
   - Uses scheduler for all requests

3. **AnalyticsOrchestrator Integration** (`src/services/data/analyticsOrchestrator.ts`)
   - Summary metrics: `CRITICAL` priority
   - Monthly leads: `HIGH` priority
   - Detailed breakdowns: `NORMAL` priority

## Usage

### Basic Usage

```typescript
import { scheduleRequest, RequestPriority } from '@/lib/requestScheduler';

// Critical request (user-visible data)
const data = await scheduleRequest(
  () => fetchSummaryMetrics(),
  RequestPriority.CRITICAL
);

// Normal request (detailed data)
const details = await scheduleRequest(
  () => fetchDetailedBreakdown(),
  RequestPriority.NORMAL
);
```

### Using Helper Function

```typescript
import { getPriorityForRequestType } from '@/lib/requestScheduler';

const priority = getPriorityForRequestType('summary'); // Returns CRITICAL
const data = await scheduleRequest(fetchFn, priority);
```

### In ApiClient

```typescript
import { RequestPriority } from '@/lib/requestScheduler';

// High priority API request
const response = await apiClient.request(
  '/endpoint',
  { method: 'GET' },
  true, // useCache
  RequestPriority.HIGH
);
```

## Priority Assignment Guidelines

### CRITICAL Priority
- Summary metrics (total leads, total spend)
- Main dashboard data
- User-visible metrics that block UI rendering
- **Examples:** Facebook/Google summary metrics, monthly leads overview

### HIGH Priority
- Platform-specific metrics
- Important secondary data
- **Examples:** Monthly leads data, platform performance metrics

### NORMAL Priority
- Detailed breakdowns
- Chart data
- Non-blocking data
- **Examples:** Campaign breakdowns, demographic data, GHL metrics

### LOW Priority
- Background updates
- Non-essential data
- Analytics tracking
- **Examples:** Usage analytics, background sync

## Performance Impact

### Expected Improvements
- **Perceived Performance:** 20-30% improvement for critical data
- **Time to First Content:** Faster initial render
- **User Experience:** Critical metrics appear first

### Metrics
- Queue length monitoring
- Priority breakdown tracking
- Active request count
- Average wait time per priority

## Monitoring

```typescript
import { requestScheduler } from '@/lib/requestScheduler';

// Get queue statistics
const stats = requestScheduler.getStats();
console.log(stats);
// {
//   queueLength: 5,
//   activeRequests: 2,
//   priorityBreakdown: {
//     CRITICAL: 2,
//     HIGH: 1,
//     NORMAL: 2,
//     LOW: 0
//   }
// }
```

## Best Practices

1. **Use CRITICAL sparingly** - Only for data that blocks UI rendering
2. **Default to NORMAL** - Most requests should use normal priority
3. **Monitor queue length** - If queue grows too large, consider batching
4. **Test priority assignments** - Verify critical data loads first

## Future Enhancements

- Dynamic priority adjustment based on user interaction
- Priority inheritance for related requests
- Queue size limits per priority level
- Priority-based timeout handling

