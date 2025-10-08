# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common problems you might encounter during development and how to resolve them using Cursor AI and other debugging techniques.

## Google Sheets Integration Issues

### Problem: "404 Not Found" from Google Sheets API
**Symptoms**: Supabase Edge Function returns 404 error when fetching Google Sheets data
**Root Cause**: Incorrect URL construction in Edge Function
**Solution**:
1. **Check URL Format**: Ensure using `/values/{range}` not `?range={range}`
2. **Verify Edge Function**: Check `supabase/functions/google-sheets-data/index.ts`
3. **Test Direct API**: Use curl to test Google Sheets API directly
4. **Check Logs**: Review Supabase Edge Function logs for detailed error messages

```typescript
// ❌ Wrong (causes 404)
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values?range=${encodeURIComponent(range)}`

// ✅ Correct (working)
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
```

### Problem: Lead Info Page Not Showing Data
**Symptoms**: Dashboard shows no lead metrics or empty charts
**Root Cause**: Client-specific configuration not being used
**Solution**:
1. **Check Client Config**: Verify `clientData.accounts.googleSheetsConfig` exists
2. **Update Components**: Ensure components pass client-specific parameters
3. **Test Edge Function**: Test Supabase Edge Function directly
4. **Check Database**: Verify integration data in Supabase

### Problem: CORS Errors with Google Sheets API
**Symptoms**: Browser blocks direct API calls to Google Sheets
**Root Cause**: CORS policy prevents direct frontend API calls
**Solution**:
1. **Use Supabase Edge Function**: Never call Google Sheets API directly from frontend
2. **Check Authorization**: Ensure proper Authorization header in Edge Function calls
3. **Verify Tokens**: Check access tokens are valid and not expired

## Build & OAuth Issues

### Problem: "Duplicate member loadLocationToken in class body" Build Error
**Symptoms**: Build fails with duplicate method error in GoHighLevelService
**Root Cause**: Two `loadLocationToken` methods exist - old implementation using `integrationId` and new using `account_id`
**Solution**:
1. **Remove duplicate method**: Keep the newer implementation that uses `account_id`
2. **Verify method signature**: Ensure only one `loadLocationToken` method exists
3. **Test build**: Run `npm run build` to confirm error is resolved

### Problem: "no unique or exclusion constraint matching ON CONFLICT specification"
**Symptoms**: OAuth callback fails with constraint error during token saving
**Root Cause**: OAuth callback uses `onConflict: 'platform,account_id'` but constraint doesn't exist
**Solution**:
1. **Add unique constraint**: 
   ```sql
   ALTER TABLE integrations ADD CONSTRAINT integrations_platform_account_id_unique UNIQUE (platform, account_id);
   ```
2. **Verify constraint exists**:
   ```sql
   SELECT constraint_name, constraint_type, column_name 
   FROM information_schema.table_constraints tc 
   JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
   WHERE tc.table_name = 'integrations' AND tc.constraint_type = 'UNIQUE';
   ```
3. **Update OAuth callback**: Use `onConflict: 'platform,account_id'` in upsert operations

## GoHighLevel Integration Issues

### Problem: "This route is not yet supported by the IAM Service" Error
**Symptoms**: Funnel analytics and page views not working, 401 errors from funnel endpoints
**Root Cause**: Using incorrect API v1 endpoints instead of GoHighLevel API 2.0 endpoints
**Solution**:
1. **Use correct API 2.0 endpoints**:
   - **Funnel List**: `GET /funnels/funnel/list?locationId={locationId}`
   - **Funnel Pages**: `GET /funnels/page?locationId={locationId}&funnelId={funnelId}&limit=20&offset=0`
2. **Update object property mapping**:
   - Use `_id` instead of `id` for funnel/page IDs
   - Use `dateAdded` instead of `createdAt` for dates
   - Use `type` instead of `status` for funnel status
3. **Test endpoints directly** to confirm they return data before implementing

### Problem: "Invalid JWT" or "Token refresh failed" from GoHighLevel API
**Symptoms**: GoHighLevel data not loading, 401 errors in console
**Root Cause**: GoHighLevel OAuth token has expired and refresh is failing
**Solution**:
1. **Check Token Expiration**: GoHighLevel tokens expire every 24 hours
2. **Re-authenticate**: Go to admin integrations and reconnect GoHighLevel
3. **Check Client Credentials**: Ensure GoHighLevel OAuth app credentials are correct
4. **Manual Refresh**: Use Supabase Edge Function `refresh-ghl-token` if available

### Problem: GoHighLevel Data Not Displaying
**Symptoms**: Dashboard shows no GoHighLevel metrics or contacts
**Root Cause**: Token expired or invalid client credentials
**Solution**:
1. **Check Integration Status**: Verify GoHighLevel is connected in admin panel
2. **Reconnect Integration**: Disconnect and reconnect GoHighLevel OAuth
3. **Check Location ID**: Ensure correct location ID is configured for client
4. **Automatic Reconnection**: The system will show a reconnect prompt when tokens expire

### Problem: GoHighLevel Token Refresh Failing
**Symptoms**: "Token refresh failed" errors, 401 Unauthorized responses
**Root Cause**: Refresh token expired or client credentials invalid
**Long-term Solution**:
1. **Automatic Re-authentication**: System detects expired tokens and prompts for reconnection
2. **Database-stored Credentials**: OAuth credentials stored securely in Supabase database
3. **Edge Function Proxy**: All GoHighLevel API calls go through Supabase Edge Function with automatic token refresh
4. **User-friendly Prompts**: Clear reconnection prompts guide users through the process

### Problem: GoHighLevel Disconnect Not Working
**Symptoms**: Cannot disconnect GoHighLevel from client, integration remains connected
**Root Cause**: Disconnect function only updates integration table, not client account references
**Solution**:
1. **Updated Disconnect Flow**: Now clears both integration and client account references
2. **Manual Fix**: Update client accounts to set `goHighLevel: null`
3. **Database Cleanup**: Remove disconnected integration records

### Problem: OAuth Callback UUID Syntax Error
**Symptoms**: "invalid input syntax for type uuid" error during GoHighLevel OAuth
**Root Cause**: OAuth callback trying to use custom string as UUID
**Solution**:
1. **Fixed OAuth Callback**: Now uses proper UUID generation
2. **Account ID Field**: Uses `account_id` field for location identification
3. **Proper Conflict Resolution**: Uses `platform,account_id` for upserts

## AI Insights Configuration Issues

### Problem: "406 Not Acceptable" Error from AI Insights Config
**Symptoms**: Application crashes with "We're sorry, but something unexpected happened" error
**Root Cause**: AI insights service using `.single()` method when no config exists
**Solution**:
1. **Fixed Service Method**: Changed `.single()` to `.maybeSingle()` in `getClientAIConfig`
2. **Graceful Handling**: Returns `null` when no config exists instead of throwing error
3. **Error Prevention**: Prevents application crashes from missing AI configs

## Development Environment Issues

### Node.js and npm Issues

#### Problem: "Module not found" errors
**Symptoms**: Import errors, missing dependencies
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix this module not found error"
2. **Clear cache**: `npm cache clean --force`
3. **Reinstall dependencies**: `rm -rf node_modules package-lock.json && npm install`
4. **Check TypeScript paths**: Verify `tsconfig.json` path mappings

#### Problem: Version conflicts
**Symptoms**: Different behavior between environments
**Solution**:
1. **Use Cursor AI**: `Ctrl + L` → "Check for version conflicts in package.json"
2. **Use exact versions**: Pin dependency versions in `package.json`
3. **Check Node version**: Ensure consistent Node.js version across environments

### Build and Compilation Issues

#### Problem: TypeScript compilation errors
**Symptoms**: Build failures, type errors
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` on the error line → "Fix this TypeScript error"
2. **Check strict mode**: Ensure `strict: true` in `tsconfig.json`
3. **Add type definitions**: Install missing `@types/*` packages
4. **Use type assertions**: `as Type` for complex type issues

#### Problem: Vite build failures
**Symptoms**: Build process crashes, bundle errors
**Solution**:
1. **Use Cursor AI**: `Ctrl + L` → "Fix Vite build configuration"
2. **Check imports**: Ensure all imports are valid
3. **Optimize dependencies**: Check `vite.config.ts` optimization settings
4. **Clear dist folder**: `rm -rf dist && npm run build`

### Development Server Issues

#### Problem: Server won't start
**Symptoms**: Port conflicts, server crashes
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix development server startup issues"
2. **Change port**: Modify port in `vite.config.ts`
3. **Check processes**: Kill existing processes on the port
4. **Restart terminal**: Close and reopen terminal

#### Problem: Hot reload not working
**Symptoms**: Changes not reflected in browser
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix hot reload issues"
2. **Check file watchers**: Ensure file system supports file watching
3. **Restart server**: Stop and restart development server
4. **Clear browser cache**: Hard refresh browser

## React and Component Issues

### Component Rendering Issues

#### Problem: Component not rendering
**Symptoms**: Blank screen, missing components
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` on component → "Debug component rendering"
2. **Check imports**: Ensure component is properly imported
3. **Check JSX**: Verify JSX syntax is correct
4. **Check console**: Look for JavaScript errors

#### Problem: Props not updating
**Symptoms**: Component state not reflecting prop changes
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix props not updating in React component"
2. **Check prop types**: Ensure props are properly typed
3. **Use useEffect**: Add dependency array for prop changes
4. **Check parent component**: Verify parent is passing correct props

### State Management Issues

#### Problem: State not updating
**Symptoms**: UI not reflecting state changes
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix React state update issues"
2. **Check setState**: Ensure state updates are immutable
3. **Use functional updates**: `setState(prev => newState)`
4. **Check dependencies**: Verify useEffect dependencies

#### Problem: Infinite re-renders
**Symptoms**: Performance issues, browser freezing
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix infinite re-render loop"
2. **Check useEffect**: Ensure dependency arrays are correct
3. **Use useCallback**: Memoize functions passed as props
4. **Use useMemo**: Memoize expensive calculations

### React Query Issues

#### Problem: Data not loading
**Symptoms**: Loading states persist, no data displayed
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Debug React Query data loading"
2. **Check query key**: Ensure query keys are unique and stable
3. **Check API endpoint**: Verify API is returning data
4. **Check error handling**: Look for error states

#### Problem: Stale data
**Symptoms**: Outdated information displayed
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix React Query stale data"
2. **Configure staleTime**: Set appropriate stale time
3. **Use refetch**: Manually trigger data refetch
4. **Check cache**: Verify cache invalidation

## API Integration Issues

### Authentication Problems

#### Problem: OAuth flow not working
**Symptoms**: Login failures, token errors
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Debug OAuth authentication flow"
2. **Check redirect URI**: Ensure redirect URI matches configuration
3. **Check environment variables**: Verify API keys are set
4. **Check token storage**: Ensure tokens are stored securely

#### Problem: API rate limiting
**Symptoms**: 429 errors, request failures
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Implement API rate limiting"
2. **Add retry logic**: Implement exponential backoff
3. **Cache responses**: Use React Query caching
4. **Batch requests**: Combine multiple API calls

### Data Fetching Issues

#### Problem: API calls failing
**Symptoms**: Network errors, 404/500 responses
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Debug API call failures"
2. **Check endpoint**: Verify API endpoint is correct
3. **Check headers**: Ensure proper headers are sent
4. **Check CORS**: Verify CORS configuration

#### Problem: Data format issues
**Symptoms**: Parsing errors, incorrect data display
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix data parsing issues"
2. **Check response format**: Verify API response structure
3. **Add validation**: Implement data validation
4. **Check normalization**: Ensure data is properly normalized

## Database Issues

### Supabase Connection Problems

#### Problem: Database connection failed
**Symptoms**: Connection errors, data not saving
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix Supabase connection issues"
2. **Check environment variables**: Verify Supabase URL and key
3. **Check network**: Ensure internet connection is stable
4. **Check RLS policies**: Verify Row Level Security policies

#### Problem: Data not saving
**Symptoms**: Insert/update operations fail
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Debug Supabase data saving"
2. **Check permissions**: Ensure user has proper permissions
3. **Check schema**: Verify table structure matches data
4. **Check constraints**: Ensure data meets table constraints

### Query Performance Issues

#### Problem: Slow database queries
**Symptoms**: Long loading times, timeouts
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Optimize database queries"
2. **Add indexes**: Create appropriate database indexes
3. **Limit results**: Use pagination for large datasets
4. **Use caching**: Implement query result caching

## Testing Issues

### Unit Test Failures

#### Problem: Tests not running
**Symptoms**: Test runner crashes, no tests found
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix Jest test configuration"
2. **Check test files**: Ensure test files have proper naming
3. **Check Jest config**: Verify `jest.config.js` settings
4. **Check dependencies**: Ensure testing libraries are installed

#### Problem: Mocking issues
**Symptoms**: Tests fail due to external dependencies
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix Jest mocking issues"
2. **Use MSW**: Implement proper API mocking
3. **Mock modules**: Use `jest.mock()` for module mocking
4. **Check mock setup**: Ensure mocks are properly configured

### E2E Test Issues

#### Problem: Playwright tests failing
**Symptoms**: Browser automation errors, test timeouts
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix Playwright test failures"
2. **Check selectors**: Ensure element selectors are correct
3. **Add waits**: Use proper wait strategies
4. **Check browser setup**: Verify browser installation

#### Problem: Flaky tests
**Symptoms**: Tests pass/fail inconsistently
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix flaky E2E tests"
2. **Add retries**: Implement test retry logic
3. **Improve waits**: Use more reliable wait strategies
4. **Check timing**: Ensure proper timing for async operations

## Performance Issues

### Frontend Performance

#### Problem: Slow page loads
**Symptoms**: Long loading times, poor user experience
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Optimize React app performance"
2. **Code splitting**: Implement lazy loading
3. **Bundle analysis**: Analyze bundle size
4. **Image optimization**: Optimize images and assets

#### Problem: Memory leaks
**Symptoms**: Browser slowdown, crashes
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Fix React memory leaks"
2. **Check event listeners**: Ensure proper cleanup
3. **Check timers**: Clear intervals and timeouts
4. **Check subscriptions**: Unsubscribe from observables

### API Performance

#### Problem: Slow API responses
**Symptoms**: Long loading times, timeouts
**Solution**:
1. **Use Cursor AI**: `Ctrl + I` → "Optimize API performance"
2. **Implement caching**: Use React Query caching
3. **Optimize queries**: Reduce data transfer
4. **Add loading states**: Improve perceived performance

## Debugging with Cursor AI

### Using Composer (Ctrl + L)

#### For Complex Issues
- **"Debug this React component that's not rendering"**
- **"Fix this TypeScript error in the service layer"**
- **"Optimize this database query for better performance"**
- **"Implement error handling for this API integration"**

#### For Code Generation
- **"Generate a test for this component"**
- **"Create a service for LinkedIn Ads API"**
- **"Add error boundaries to this page"**
- **"Implement caching for this data fetching"**

### Using Inline Chat (Ctrl + I)

#### For Specific Issues
- **"Explain what this function does"**
- **"Fix this TypeScript error"**
- **"Optimize this component"**
- **"Add proper error handling"**

#### For Learning
- **"How does React Query work?"**
- **"What's the best way to handle async operations?"**
- **"How do I implement proper TypeScript types?"**

### Debugging Workflow

#### Step 1: Identify the Problem
1. **Check console errors**: Look for JavaScript errors
2. **Check network tab**: Look for failed requests
3. **Check React DevTools**: Inspect component state
4. **Use debug panel**: `Ctrl + Shift + D` for app debugging

#### Step 2: Use AI Assistance
1. **Copy error message**: Include full error context
2. **Use inline chat**: `Ctrl + I` on the problematic code
3. **Ask specific questions**: Be precise about the issue
4. **Follow AI suggestions**: Implement recommended solutions

#### Step 3: Test the Fix
1. **Run tests**: Ensure tests pass
2. **Check functionality**: Verify the fix works
3. **Check performance**: Ensure no performance regression
4. **Update documentation**: Document the solution

## Common Error Messages

### TypeScript Errors
```
Property 'X' does not exist on type 'Y'
```
**Solution**: Use Cursor AI to add proper type definitions

```
Cannot find module 'X'
```
**Solution**: Check imports and install missing dependencies

```
Type 'X' is not assignable to type 'Y'
```
**Solution**: Use type assertions or fix type definitions

### React Errors
```
Cannot read property 'X' of undefined
```
**Solution**: Add null checks and proper error boundaries

```
Maximum update depth exceeded
```
**Solution**: Check for infinite re-render loops

```
Warning: Can't perform a React state update on an unmounted component
```
**Solution**: Clean up subscriptions and timers

### API Errors
```
Failed to fetch
```
**Solution**: Check network connection and CORS settings

```
401 Unauthorized
```
**Solution**: Check authentication tokens and permissions

```
429 Too Many Requests
```
**Solution**: Implement rate limiting and retry logic

## Getting Help

### Using Cursor AI Effectively
1. **Be specific**: Include file names, line numbers, and context
2. **Provide examples**: Show expected vs actual behavior
3. **Include error messages**: Copy full error messages
4. **Ask follow-up questions**: Clarify AI responses

### Documentation Resources
- **APP_OVERVIEW.md**: Project goals and architecture
- **DEVELOPMENT_GUIDE.md**: Setup and workflows
- **TESTING.md**: Testing strategies and examples
- **INTEGRATIONS_GUIDE.md**: API integration details

### External Resources
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Vite Guide**: https://vitejs.dev/guide/
- **Supabase Docs**: https://supabase.com/docs

---

For development setup, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).  
For testing strategies, see [TESTING.md](./TESTING.md).  
For integration details, see [INTEGRATIONS_GUIDE.md](./INTEGRATIONS_GUIDE.md).
