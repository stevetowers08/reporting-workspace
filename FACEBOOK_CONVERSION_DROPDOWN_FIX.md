# Facebook Ads Conversion Action Dropdown Fix

## Problem
The Facebook Ads conversion action dropdown in the client edit form was not working properly. Users could select a Facebook Ads account but the conversion action dropdown would not populate with available options.

## Root Causes Identified

1. **Missing useEffect dependency**: The `loadFacebookConversionActions` function was not included in the useEffect dependency array, causing stale closures.

2. **Account ID format inconsistency**: The Facebook Ads service expects account IDs with `act_` prefix, but the form might pass raw account IDs.

3. **Missing loading state**: No visual feedback when conversion actions are being loaded.

4. **API call not using rate limiting**: The `getConversionActions` method was using regular `fetch` instead of the rate-limited fetch method.

5. **Insufficient error handling**: Limited debugging information when API calls fail.

## Fixes Applied

### 1. ClientForm.tsx Changes

#### Added Loading State
```typescript
const [conversionActionsLoading, setConversionActionsLoading] = useState<Record<string, boolean>>({});
```

#### Improved loadFacebookConversionActions Function
- Made it a `useCallback` to prevent unnecessary re-renders
- Added proper account ID formatting (`act_` prefix)
- Added loading state management
- Enhanced error handling and logging

#### Fixed useEffect Dependencies
```typescript
useEffect(() => {
  if (formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none') {
    debugLogger.info('ClientForm', 'Facebook Ads account changed, loading conversion actions', { 
      accountId: formData.accounts.facebookAds 
    });
    loadFacebookConversionActions(formData.accounts.facebookAds);
  } else {
    debugLogger.debug('ClientForm', 'Facebook Ads account not set or is none, skipping conversion actions load');
  }
}, [formData.accounts.facebookAds, loadFacebookConversionActions]);
```

#### Enhanced Dropdown UI
- Added loading spinner when conversion actions are being fetched
- Better error handling with fallback options
- Improved user feedback

### 2. FacebookAdsService.ts Changes

#### Enhanced getConversionActions Method
- Now uses `rateLimitedFetch` instead of regular `fetch`
- Added comprehensive logging for debugging
- Better error handling with detailed error information
- Improved account ID formatting

```typescript
static async getConversionActions(adAccountId: string): Promise<any[]> {
  try {
    const token = await this.getAccessToken();
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    debugLogger.debug('FacebookAdsService', 'Fetching conversion actions', { 
      accountId: formattedAccountId,
      tokenLength: token.length 
    });

    const response = await this.rateLimitedFetch(
      `${this.BASE_URL}/${formattedAccountId}/customconversions?fields=id,name,category,type,status&access_token=${token}`
    );
    // ... rest of implementation
  } catch (error) {
    // ... error handling
  }
}
```

## Testing

Created a test script (`test-facebook-conversion-actions.mjs`) to verify the fix works correctly.

## Expected Behavior After Fix

1. **When a Facebook Ads account is selected**: The conversion action dropdown should automatically load available conversion actions
2. **Loading state**: Users see a loading spinner while conversion actions are being fetched
3. **Fallback options**: If no custom conversions exist or API fails, fallback options are shown
4. **Error handling**: Proper error logging and user-friendly fallbacks
5. **Rate limiting**: API calls respect Facebook's rate limits

## Debug Information

The fix includes comprehensive logging to help debug any future issues:
- Account ID formatting logs
- API request/response logs
- Error details with context
- Loading state transitions

## Files Modified

- `src/components/agency/ClientForm.tsx`
- `src/services/api/facebookAdsService.ts`
- `test-facebook-conversion-actions.mjs` (new test file)

## Verification Steps

1. Open the client edit form
2. Select a Facebook Ads account
3. Verify the conversion action dropdown populates with options
4. Check browser console for debug logs
5. Test with different Facebook Ads accounts
6. Verify fallback options work when no custom conversions exist
