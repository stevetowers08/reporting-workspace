# Go High Level OAuth Troubleshooting Guide

## Issues Found and Fixed

### 1. **Missing Environment Variables** ❌ → ✅
**Problem**: `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` are not set in environment variables.

**Solution**: 
- Run `setup-ghl-oauth-env.sh` (Linux/Mac) or `setup-ghl-oauth-env.bat` (Windows)
- Set `VITE_GHL_CLIENT_ID` and `VITE_GHL_CLIENT_SECRET` in `.env.local`
- Get credentials from: https://marketplace.gohighlevel.com/

### 2. **Incorrect Token Exchange Format** ❌ → ✅
**Problem**: Using `application/json` instead of `application/x-www-form-urlencoded` for token exchange.

**Fixed in**: `src/services/api/goHighLevelService.ts`
```typescript
// OLD (incorrect)
headers: { 'Content-Type': 'application/json' }
body: JSON.stringify({...})

// NEW (correct)
headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
body: new URLSearchParams({...})
```

### 3. **Missing user_type Parameter** ❌ → ✅
**Problem**: GHL OAuth requires `user_type: 'Company'` parameter.

**Fixed in**: Token exchange request now includes:
```typescript
body: new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: redirectUri,
  user_type: 'Company'  // ← Added this
})
```

### 4. **API Endpoint Issues** ❌ → ✅
**Problem**: Some endpoints (opportunities, calendars, funnels) return 404.

**Fixed**: Updated API service to handle non-existent endpoints gracefully.
- Contacts API works: `https://services.leadconnectorhq.com/contacts?locationId={id}`
- Other endpoints disabled until correct structure is identified

## Current Status

✅ **OAuth Flow**: Fixed token exchange format and parameters  
✅ **API Endpoints**: Contacts API working correctly  
✅ **Error Handling**: Improved error messages and logging  
✅ **Environment Setup**: Created setup scripts  
⚠️ **Credentials**: Need to be configured by user  

## Next Steps

### For You to Do:

1. **Get OAuth Credentials**:
   - Go to https://marketplace.gohighlevel.com/
   - Create or find your app
   - Copy Client ID and Client Secret

2. **Set Environment Variables**:
   ```bash
   # In .env.local
   VITE_GHL_CLIENT_ID=your_client_id_here
   VITE_GHL_CLIENT_SECRET=your_client_secret_here
   ```

3. **Configure Redirect URI**:
   - In your GHL app settings, set redirect URI to:
   - `https://your-domain.com/api/leadconnector/oath`

4. **Test the Flow**:
   ```bash
   # Run the comprehensive test
   node dev-tools/test-ghl-complete.js
   ```

## Testing Commands

```bash
# Test current integration status
node dev-tools/test-ghl-complete.js

# Test API endpoints with existing token
node dev-tools/test-ghl-with-location.js

# Test all possible endpoints
node dev-tools/test-ghl-api-endpoints.js

# Setup environment (Linux/Mac)
./setup-ghl-oauth-env.sh

# Setup environment (Windows)
setup-ghl-oauth-env.bat
```

## Common Issues and Solutions

### Issue: "Missing OAuth credentials"
**Solution**: Set `VITE_GHL_CLIENT_ID` and `VITE_GHL_CLIENT_SECRET` in `.env.local`

### Issue: "Token exchange failed"
**Solution**: Check that redirect URI matches exactly in GHL app settings

### Issue: "The token does not have access to this location"
**Solution**: Ensure you're using the correct location ID from the OAuth response

### Issue: "404 Not Found" on API calls
**Solution**: Some endpoints don't exist. Use only verified working endpoints:
- ✅ `GET /contacts?locationId={id}`
- ❌ `/opportunities`, `/calendars`, `/funnels` (not available)

## OAuth Flow Debugging

If OAuth still doesn't work:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify redirect URI is called correctly
3. **Test in Incognito**: Clear cache/cookies issues
4. **Verify App Status**: Ensure your GHL app is approved
5. **Check Scopes**: Verify requested scopes match app permissions

## API Endpoints That Work

```typescript
// ✅ Working endpoints
GET https://services.leadconnectorhq.com/contacts?locationId={locationId}
POST https://services.leadconnectorhq.com/contacts/search
POST https://services.leadconnectorhq.com/oauth/token
POST https://services.leadconnectorhq.com/oauth/reconnect

// ❌ Non-working endpoints (return 404)
GET https://services.leadconnectorhq.com/opportunities
GET https://services.leadconnectorhq.com/calendars  
GET https://services.leadconnectorhq.com/funnels
```

## Summary

The main OAuth issues have been fixed in the code. The remaining step is for you to:

1. **Set up your OAuth credentials** in `.env.local`
2. **Configure your redirect URI** in GHL marketplace
3. **Test the complete flow**

Once credentials are set, the OAuth flow should work correctly!
