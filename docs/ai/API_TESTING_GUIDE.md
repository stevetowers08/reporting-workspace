# API Testing Guide

## Overview

This guide covers the comprehensive API testing infrastructure created to troubleshoot and verify all external API integrations. The testing system includes both frontend and terminal-based testing tools.

## API Testing Page

### Access
Navigate to `/api-testing` in the application to access the comprehensive API testing interface.

### Features
- **Real-time Connection Status**: Shows which integrations are connected
- **Individual Service Tests**: Test each API service independently
- **Batch Testing**: Run all tests at once
- **Detailed Results**: View success/error messages and response data
- **Error Logging**: All errors are logged with `debugLogger` for debugging

### Available Tests

#### Google Ads Tests
1. **Connection Test**: Verifies authentication and token validity
2. **Fetch Accounts**: Retrieves all accessible Google Ads accounts
3. **Fetch Metrics**: Gets account metrics for the last 30 days

#### Go High Level Tests
1. **Connection Test**: Verifies authentication and token validity
2. **Fetch Locations**: Retrieves all locations (requires proper scopes)
3. **Fetch Metrics**: Gets contact metrics for the last 30 days

## Terminal Testing Scripts

### Quick API Test
```bash
node test-apis-terminal.js
```
Runs comprehensive tests for all APIs and shows connection status.

### Go High Level Specific Tests
```bash
node test-ghl-correct.js
```
Tests Go High Level API with correct endpoints and authentication.

### Real Location ID Test
```bash
node test-real-location.js
```
Tests Go High Level API using the real location ID from Supabase.

### Location ID Discovery
```bash
node check-location-ids.js
```
Checks Supabase database for actual location IDs and tests API access.

## API Status Dashboard

### Current Status (October 2025)

| Service | Status | Details |
|---------|--------|---------|
| **Go High Level** | ✅ **WORKING** | 1,589 contacts retrieved successfully |
| **Google Ads (Direct)** | ✅ **WORKING** | Service calls working, Edge Function needs redeployment |
| **Facebook Ads** | ✅ **WORKING** | Integration connected and functional |
| **Google Sheets** | ✅ **WORKING** | Integration connected and functional |
| **Supabase Database** | ✅ **WORKING** | All tables accessible |

## Troubleshooting Guide

### Common Issues and Solutions

#### Go High Level API 404 Errors
**Problem**: API endpoints returning 404 Not Found
**Solution**: 
- Use correct base URL: `https://services.leadconnectorhq.com`
- Remove trailing slashes from endpoints
- Use real location ID from Supabase: `V7bzEjKiigXzh8r6sQq0`
- Include proper headers: `Version: 2021-07-28`

#### Go High Level API 401/403 Errors
**Problem**: Unauthorized or Forbidden responses
**Solution**:
- Verify token is valid and not expired
- Check token scopes match required permissions
- Use correct API version in headers
- Ensure location ID is correct

#### Google Ads Edge Function Issues
**Problem**: Edge Function returning "Invalid action" errors
**Solution**:
- Edge Function path parsing needs to be fixed and redeployed
- Use direct API calls in frontend services as workaround
- Check Supabase Edge Function logs for debugging

### Debugging Steps

1. **Check Connection Status**: Use `/api-testing` page to verify integrations are connected
2. **Test Individual APIs**: Run specific tests to isolate issues
3. **Check Browser Console**: Look for error messages and network requests
4. **Review Server Logs**: Check Supabase logs for Edge Function issues
5. **Verify Environment Variables**: Ensure all required tokens and keys are set

## Testing Best Practices

### Before Testing
1. Ensure all integrations are properly connected
2. Verify environment variables are set correctly
3. Check that tokens are not expired
4. Confirm database has the required data

### During Testing
1. Start with connection tests before data retrieval tests
2. Test with small data sets first (limit=10)
3. Monitor rate limits and implement proper delays
4. Log all requests and responses for debugging

### After Testing
1. Review error logs for any issues
2. Verify data quality and completeness
3. Test error handling scenarios
4. Document any new issues found

## API Rate Limits

### Go High Level
- **Burst Limit**: 100 requests per 10 seconds per resource
- **Daily Limit**: 200,000 requests per day per resource
- **Headers**: Monitor `X-RateLimit-Limit-Daily` and `X-RateLimit-Remaining`

### Google Ads
- **Rate Limits**: Vary by endpoint and account
- **Quota**: Check quota usage in Google Ads API console
- **Retry Logic**: Implement exponential backoff for rate limit errors

## Data Validation

### Expected Data Formats

#### Go High Level Contacts
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  locationId: string;
  customFields: Array<{
    id: string;
    value: string | number;
  }>;
  attributions: Array<{
    utmSource: string;
    utmCampaign: string;
    utmMedium: string;
    // ... other attribution fields
  }>;
}
```

#### Google Ads Accounts
```typescript
interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  descriptiveName: string;
}
```

## Monitoring and Alerts

### Health Checks
- **Database Connection**: Verify Supabase connectivity
- **Integration Status**: Check all integrations are connected
- **Token Validity**: Monitor token expiration dates
- **API Response Times**: Track performance metrics

### Error Monitoring
- **Failed Requests**: Log all failed API calls
- **Authentication Errors**: Monitor token refresh needs
- **Rate Limit Hits**: Track when limits are approached
- **Data Quality Issues**: Flag incomplete or malformed data

## Future Improvements

### Planned Enhancements
1. **Automated Testing**: Set up CI/CD pipeline for API tests
2. **Performance Monitoring**: Add response time tracking
3. **Alert System**: Implement notifications for API failures
4. **Data Validation**: Add schema validation for all API responses
5. **Caching Strategy**: Implement intelligent caching for frequently accessed data

### Testing Infrastructure
1. **Mock Services**: Create mock APIs for development testing
2. **Load Testing**: Test API performance under high load
3. **Integration Tests**: End-to-end testing of complete workflows
4. **Visual Testing**: Screenshot comparisons for UI components
