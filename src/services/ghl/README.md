# GoHighLevel Service - Modular Architecture

## Overview

This implements a development-friendly modular structure for the GoHighLevel service, allowing gradual migration from the monolithic service to focused modules while maintaining backward compatibility.

## Structure

```text
src/services/ghl/
├── index.ts                    # Main export interface
├── goHighLevelService.ts       # Original working service (copied)
└── modules/
    ├── contacts.ts            # Contact-related functionality
    └── analytics.ts           # Analytics and metrics functionality
```

## Usage

### Backward Compatibility (Current Approach)

```typescript
import { GoHighLevelService } from '@/services/api/goHighLevelService';

// All existing code continues to work
const contacts = await GoHighLevelService.getAllContacts(locationId);
const metrics = await GoHighLevelService.getGHLMetrics(locationId);
```

### New Modular Approach

```typescript
import { GHLContacts, GHLAnalytics } from '@/services/ghl';

// Contact operations
const contacts = await GHLContacts.getContacts(locationId);
const recentContacts = await GHLContacts.getRecentContacts(locationId, 10);
const contactsBySource = await GHLContacts.getContactsBySource(locationId, 'facebook');

// Analytics operations
const metrics = await GHLAnalytics.getMetrics(locationId);
const sourceBreakdown = await GHLAnalytics.getSourceBreakdown(locationId);
const conversionRate = await GHLAnalytics.getConversionRate(locationId);
```

### Gradual Migration Strategy

1. **Phase 1**: Keep existing code working with `GoHighLevelService`
2. **Phase 2**: Use new modules for new features
3. **Phase 3**: Gradually migrate existing components when convenient
4. **Phase 4**: Remove old service when all code is migrated

## Module Details

### GHLContactsModule

**Purpose**: Handle all contact-related operations

**Methods**:

- `getContacts(locationId, options?)` - Get contacts with optional filtering
- `getContactCount(locationId, dateParams?)` - Get total contact count
- `searchContacts(locationId, criteria)` - Search contacts with specific criteria
- `getRecentContacts(locationId, limit?)` - Get most recent contacts
- `getContactsBySource(locationId, source)` - Filter contacts by source
- `getContactsWithGuests(locationId)` - Get contacts with guest information

**Example**:

```typescript
import { GHLContacts } from '@/services/ghl';

// Get all contacts
const contacts = await GHLContacts.getContacts('location123');

// Get contacts from last 30 days
const recentContacts = await GHLContacts.getContacts('location123', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Search contacts by source
const facebookContacts = await GHLContacts.getContactsBySource('location123', 'facebook');
```

### GHLAnalyticsModule

**Purpose**: Handle analytics and metrics calculations

**Methods**:

- `getMetrics(locationId, dateRange?)` - Get comprehensive metrics
- `getSourceBreakdown(locationId, dateRange?)` - Get source performance breakdown
- `getGuestDistribution(locationId, dateRange?)` - Get guest count distribution
- `getTopPerformingSources(locationId, dateRange?)` - Get best performing sources
- `getPageViewAnalytics(locationId, dateRange?)` - Get page view analytics
- `getConversionRate(locationId, dateRange?)` - Get conversion rate
- `getRecentContactsAnalytics(locationId, limit?)` - Get recent contacts analytics
- `calculateCustomAnalytics(locationId, dateRange?, customFields?)` - Calculate custom analytics

**Example**:

```typescript
import { GHLAnalytics } from '@/services/ghl';

// Get comprehensive metrics
const metrics = await GHLAnalytics.getMetrics('location123');

// Get source breakdown
const sources = await GHLAnalytics.getSourceBreakdown('location123');

// Get custom analytics for specific fields
const customAnalytics = await GHLAnalytics.calculateCustomAnalytics(
  'location123',
  { start: '2024-01-01', end: '2024-01-31' },
  ['guestCount', 'eventType']
);
```

## Migration Examples

### Component Migration

**Before**:

```typescript
import { GoHighLevelService } from '@/services/api/goHighLevelService';

const fetchData = async () => {
  const contacts = await GoHighLevelService.getAllContacts(locationId);
  const metrics = await GoHighLevelService.getGHLMetrics(locationId);
};
```

**After**:

```typescript
import { GHLContacts, GHLAnalytics } from '@/services/ghl';

const fetchData = async () => {
  const contacts = await GHLContacts.getContacts(locationId);
  const metrics = await GHLAnalytics.getMetrics(locationId);
};
```

### Gradual Migration Approach

```typescript
// Keep both imports during transition
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import { GHLContacts, GHLAnalytics } from '@/services/ghl';

const fetchData = async () => {
  // Use new modules for new functionality
  const recentContacts = await GHLContacts.getRecentContacts(locationId, 10);
  
  // Keep old service for existing functionality
  const allContacts = await GoHighLevelService.getAllContacts(locationId);
  
  // Gradually migrate when convenient
  // const allContacts = await GHLContacts.getContacts(locationId);
};
```

## Benefits

1. **Backward Compatibility**: Existing code continues to work
2. **Focused Modules**: Each module has a single responsibility
3. **Better Testing**: Easier to test individual modules
4. **Improved Maintainability**: Smaller, focused files
5. **Gradual Migration**: No big-bang rewrite required
6. **Development-Friendly**: Clear separation of concerns

## Type Safety

All modules include proper TypeScript interfaces:

```typescript
// Contact types
interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  dateAdded: string;
}

// Analytics types
interface GHLAnalyticsMetrics {
  totalContacts: number;
  newContacts: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
  // ... more fields
}
```

## Error Handling

All modules include comprehensive error handling with debug logging:

```typescript
try {
  const contacts = await GHLContacts.getContacts(locationId);
  debugLogger.success('GHL-Contacts', `Retrieved ${contacts.length} contacts`);
  return contacts;
} catch (error) {
  debugLogger.error('GHL-Contacts', 'Failed to fetch contacts', error);
  throw error;
}
```

## Performance Considerations

- **Caching**: Inherits caching from the original service
- **Rate Limiting**: Maintains API rate limiting
- **Batch Operations**: Supports efficient batch processing
- **Memory Management**: Focused modules reduce memory footprint

## Testing

Each module can be tested independently:

```typescript
// Test contacts module
import { GHLContactsModule } from '@/services/ghl/modules/contacts';

describe('GHLContactsModule', () => {
  it('should fetch contacts', async () => {
    const contacts = await GHLContactsModule.getContacts('test-location');
    expect(contacts).toBeDefined();
  });
});
```

## Future Enhancements

1. **Additional Modules**: Add modules for campaigns, opportunities, etc.
2. **Caching Layer**: Implement module-specific caching
3. **Validation Layer**: Add input validation for each module
4. **Metrics Collection**: Add performance metrics for each module
5. **Plugin System**: Allow extending modules with custom functionality
