# INTEGRATION DATA ARCHITECTURE GUIDE

## Overview

This guide explains the **two-tier integration architecture** used in the Marketing Analytics Dashboard to prevent confusion between agency-level and client-level data.

## Architecture Principles

### 1. **Clear Separation of Concerns**

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENCY LEVEL                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              integrations table                      │   │
│  │  - platform: 'facebookAds'                          │   │
│  │  - connected: true/false                            │   │
│  │  - account_name: 'Facebook Marketing API'           │   │
│  │  - account_id: 'agency_platform_id'                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LEVEL                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              clients.accounts                        │   │
│  │  - facebookAds: 'act_925560449746847'              │   │
│  │  - googleAds: '2959629321'                          │   │
│  │  - googleSheetsConfig: { ... }                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Data Flow Rules**

#### Agency-Level Data (`integrations` table)
- **Purpose**: Platform connection status
- **Question**: "Is Facebook Ads connected at the agency level?"
- **Answer**: `true` or `false`
- **Usage**: Determines if clients can select accounts for this platform

#### Client-Level Data (`clients.accounts`)
- **Purpose**: Specific account selections
- **Question**: "Which specific Facebook account did this client choose?"
- **Answer**: Account ID (e.g., `"act_925560449746847"`)
- **Usage**: Determines which account to show in the UI

## Implementation Guidelines

### 1. **Always Use Helper Functions**

❌ **DON'T DO THIS:**
```typescript
// Mixing agency and client data directly
const agencyData = await supabase.from('integrations').select('*');
const clientData = client.accounts;
// This leads to confusion!
```

✅ **DO THIS:**
```typescript
// Use helper functions with clear separation
const agencyStatus = await loadAgencyIntegrationStatus();
const clientNames = await loadClientAccountNames(client.accounts);
```

### 2. **Use Type Guards**

```typescript
import { isAgencyIntegrationStatus, isClientAccountSelections } from '@/types/integrations';

// Validate data types at runtime
if (isAgencyIntegrationStatus(data)) {
  // Safe to use as agency data
  console.log(data.facebookAds); // boolean
}

if (isClientAccountSelections(data)) {
  // Safe to use as client data
  console.log(data.facebookAds); // string (account ID)
}
```

### 3. **Validate Data Consistency**

```typescript
import { validateClientAccountSelections } from '@/lib/integrationHelpers';

// Ensure client selections are valid given agency status
validateClientAccountSelections(client.accounts, agencyStatus);
// Throws IntegrationDataMixingError if invalid
```

## Common Patterns

### 1. **Loading Integration Data**

```typescript
// 1. Load agency status first
const agencyStatus = await loadAgencyIntegrationStatus();

// 2. Load client account names
const clientNames = await loadClientAccountNames(client.accounts);

// 3. Validate consistency
validateClientAccountSelections(client.accounts, agencyStatus);
```

### 2. **Displaying Integration Status**

```typescript
import { getIntegrationDisplayInfo } from '@/lib/integrationHelpers';

const displayInfo = getIntegrationDisplayInfo(
  'facebookAds',
  agencyStatus,
  clientNames
);

// displayInfo.isConnected - boolean (agency level)
// displayInfo.accountName - string (client level)
// displayInfo.canEdit - boolean (derived)
```

### 3. **Error Handling**

```typescript
try {
  const clientNames = await loadClientAccountNames(client.accounts);
} catch (error) {
  if (error instanceof IntegrationDataMixingError) {
    // Handle data mixing error
    console.error('Data architecture violation:', error.message);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## File Organization

```
src/
├── types/
│   └── integrations.ts          # Type definitions and guards
├── lib/
│   └── integrationHelpers.ts    # Helper functions
└── components/
    └── modals/
        └── EditClientModal.tsx  # UI components using helpers
```

## Testing Guidelines

### 1. **Unit Tests**

```typescript
describe('Integration Helpers', () => {
  it('should load agency integration status', async () => {
    const status = await loadAgencyIntegrationStatus();
    expect(isAgencyIntegrationStatus(status)).toBe(true);
  });

  it('should validate client account selections', () => {
    const clientAccounts = { facebookAds: 'act_123', googleAds: 'none' };
    const agencyStatus = { facebookAds: true, googleAds: false };
    
    expect(() => {
      validateClientAccountSelections(clientAccounts, agencyStatus);
    }).not.toThrow();
  });
});
```

### 2. **Integration Tests**

```typescript
describe('EditClientModal Integration', () => {
  it('should display client-specific account names', async () => {
    // Test that UI shows "Magnolia Terrace Facebook Account"
    // not "Facebook Marketing API (All Accounts)"
  });
});
```

## Troubleshooting

### Common Issues

1. **"Showing generic platform names instead of client account names"**
   - **Cause**: Using agency-level `account_name` instead of client-specific account names
   - **Fix**: Use `loadClientAccountNames()` helper function

2. **"Google Sheets not showing configuration"**
   - **Cause**: Loading from wrong data source
   - **Fix**: Load from `client.accounts.googleSheetsConfig`, not `integrations.config`

3. **"Type errors when accessing integration data"**
   - **Cause**: Not using proper type guards
   - **Fix**: Use `isAgencyIntegrationStatus()` and `isClientAccountSelections()`

### Debug Commands

```typescript
// Debug agency status
console.log('Agency Status:', await loadAgencyIntegrationStatus());

// Debug client account names
console.log('Client Names:', await loadClientAccountNames(client.accounts));

// Debug validation
try {
  validateClientAccountSelections(client.accounts, agencyStatus);
  console.log('✅ Data is consistent');
} catch (error) {
  console.error('❌ Data mixing error:', error.message);
}
```

## Migration Guide

If you're updating existing code:

1. **Replace direct database queries** with helper functions
2. **Add type guards** for runtime validation
3. **Use validation functions** to catch data mixing errors
4. **Update UI components** to use display helpers

## Best Practices

1. **Always validate data types** at runtime
2. **Use helper functions** instead of direct data access
3. **Add comprehensive error handling** for data mixing errors
4. **Write tests** for both agency and client data flows
5. **Document data flow** in component comments
6. **Use TypeScript strict mode** to catch type errors at compile time

---

**Remember**: The key to preventing confusion is **clear separation** and **explicit validation**. Always ask yourself: "Am I working with agency-level or client-level data?" and use the appropriate helper functions.
