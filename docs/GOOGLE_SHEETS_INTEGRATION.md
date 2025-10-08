# Google Sheets Integration - Working Solution

## Overview

This document describes the working solution for Google Sheets integration in the Marketing Analytics Dashboard. The integration allows the application to fetch lead data from Google Sheets for client-specific analytics.

## Architecture

### Current Working Setup

- **Frontend**: React components (`LeadInfoMetricsCards`, `LandingPagePerformance`)
- **Service Layer**: `LeadDataService` class
- **Backend**: Supabase Edge Function (`google-sheets-data`)
- **Data Source**: Google Sheets API
- **Authentication**: OAuth 2.0 with refresh token support

### Data Flow

1. **Frontend Component** calls `LeadDataService.fetchLeadData()`
2. **LeadDataService** makes HTTP request to Supabase Edge Function
3. **Edge Function** retrieves access token from Supabase database
4. **Edge Function** calls Google Sheets API with proper URL encoding
5. **Google Sheets API** returns lead data
6. **Edge Function** processes and returns data to frontend
7. **Frontend** displays lead metrics and analytics

## Key Components

### 1. LeadDataService (`src/services/data/leadDataService.ts`)

```typescript
static async fetchLeadData(
  spreadsheetId?: string,
  sheetName?: string
): Promise<LeadData | null> {
  // Uses Supabase Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/google-sheets-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      spreadsheetId: actualSpreadsheetId,
      range: `${actualSheetName}!A:Z`
    })
  });
}
```

### 2. Supabase Edge Function (`supabase/functions/google-sheets-data/index.ts`)

```typescript
// Correct URL construction for Google Sheets API
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`

// Fetch data from Google Sheets API
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Frontend Components

- **LeadInfoMetricsCards**: Displays lead metrics cards
- **LandingPagePerformance**: Shows landing page performance data
- **EventDashboard**: Main dashboard with leads tab

## Critical Fixes Applied

### 1. URL Encoding Fix

**Problem**: Google Sheets API was returning 404 errors
**Root Cause**: Incorrect URL construction in Edge Function
**Solution**: Use `/values/{range}` format instead of `?range={range}`

```typescript
// ❌ Wrong (caused 404 errors)
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values?range=${encodeURIComponent(range)}`

// ✅ Correct (working solution)
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
```

### 2. Client-Specific Configuration

**Problem**: Components were using hardcoded spreadsheet IDs
**Solution**: Pass client-specific configuration from database

```typescript
// Use client-specific Google Sheets configuration
if (clientData?.accounts?.googleSheetsConfig) {
  leadDataResult = await LeadDataService.fetchLeadData(
    clientData.accounts.googleSheetsConfig.spreadsheetId,
    clientData.accounts.googleSheetsConfig.sheetName
  );
}
```

### 3. Database Structure Cleanup

**Problem**: Malformed JSON structure in integrations table
**Solution**: Cleaned up duplicate fields and normalized structure

```sql
-- Removed duplicate 'connected' field from config
UPDATE integrations 
SET config = jsonb_build_object(
  'tokens', config->'tokens',
  'lastSync', config->'lastSync',
  'metadata', config->'metadata',
  'syncStatus', config->'syncStatus',
  'accountInfo', config->'accountInfo',
  'connectedAt', config->'connectedAt'
)
WHERE platform = 'googleSheets';
```

## Current Status

### ✅ Working Components

- **Supabase Edge Function**: Version 10, actively deployed
- **Google Sheets API**: Returning 2,418 rows of lead data
- **Frontend Components**: Updated to use client-specific configuration
- **Database**: Clean structure with proper token storage
- **Authentication**: OAuth tokens working correctly

### 📊 Data Retrieved

For Magnolia Terrace client:
- **Spreadsheet ID**: `1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4`
- **Sheet Name**: `Wedding Leads`
- **Total Rows**: 2,418 leads
- **Data Includes**: Customer ID, Date, Source, Name, Email, Guest Count, Event Date, etc.

## Testing

### Manual Testing

1. **Edge Function Test**:
   ```bash
   curl -X POST "https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/google-sheets-data" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
     -d '{"spreadsheetId": "1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4", "range": "Wedding Leads!A:Z"}'
   ```

2. **Frontend Test**:
   - Navigate to `/dashboard/[client-id]`
   - Click on "Lead Info" tab
   - Verify lead metrics are displayed

### Expected Results

- **Success Response**: `{"success": true, "data": {...}}`
- **Lead Metrics**: Total leads, Facebook vs Google breakdown, guest counts
- **Charts**: Event types, guest ranges, day preferences
- **Performance**: Landing page metrics and conversion data

## Troubleshooting

### Common Issues

1. **404 Error from Google Sheets API**
   - Check URL construction in Edge Function
   - Verify spreadsheet ID and sheet name
   - Ensure proper URL encoding

2. **No Data Displayed**
   - Check client configuration in database
   - Verify `googleSheetsConfig` is set for client
   - Check browser console for errors

3. **Authentication Errors**
   - Verify access token is valid
   - Check token expiration
   - Ensure OAuth scopes are correct

### Debug Steps

1. **Check Edge Function Logs**:
   ```bash
   # View Supabase Edge Function logs
   supabase functions logs google-sheets-data
   ```

2. **Test Direct API Call**:
   ```bash
   # Test Google Sheets API directly
   curl -H "Authorization: Bearer [ACCESS_TOKEN]" \
     "https://sheets.googleapis.com/v4/spreadsheets/[SPREADSHEET_ID]/values/[RANGE]"
   ```

3. **Check Database**:
   ```sql
   -- Verify integration data
   SELECT platform, connected, config->'tokens'->>'accessToken' as has_token 
   FROM integrations WHERE platform = 'googleSheets';
   ```

## Future Improvements

### Planned Enhancements

1. **Token Refresh Logic**: Implement automatic token refresh in Edge Function
2. **Error Handling**: Add comprehensive error handling and retry logic
3. **Caching**: Implement data caching to reduce API calls
4. **Real-time Updates**: Add webhook support for real-time data updates
5. **Multiple Sheets**: Support for multiple Google Sheets per client

### Security Considerations

1. **Token Storage**: Ensure tokens are stored securely in database
2. **Access Control**: Implement proper access control for client data
3. **Rate Limiting**: Add rate limiting to prevent API abuse
4. **Audit Logging**: Log all data access for security auditing

## Support

For issues with Google Sheets integration:

1. Check the troubleshooting section above
2. Review Edge Function logs in Supabase dashboard
3. Verify client configuration in database
4. Test with direct API calls to isolate issues
5. Contact development team for complex issues

## Related Documentation

- [OAuth Setup Guide](OAUTH_SETUP.md)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [React Components Documentation](../components/README.md)
