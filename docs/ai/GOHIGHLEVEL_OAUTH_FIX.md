# GoHighLevel OAuth Authorization Code Fix

**Issue:** "Failed to connect to GoHighLevel: Authorization code not found in callback"

**Root Cause:** Redirect URI mismatch between GoHighLevel OAuth app configuration and application settings.

## Problem Analysis

The OAuth flow was failing because:

1. **Frontend OAuth Service** was using incorrect production URL
2. **Production URL** should be `https://reporting.tulenagency.com/oauth/callback`
3. **GoHighLevel OAuth App** needs to be configured with the correct redirect URI

## Solution Implemented

### 1. Updated Redirect URI Configuration

**Files Updated:**
- `src/services/auth/oauthService.ts`
- `src/hooks/useGHLIntegration.ts`
- `src/pages/GHLCallbackPage.tsx`
- `config/env.example`
- `config/env.development.example`
- `config/env.production.example`

**Changes:**
```typescript
// CORRECTED (now using correct production URL)
const redirectUri = window.location.hostname === 'localhost' 
    ? `${window.location.origin}/oauth/callback`
    : 'https://reporting.tulenagency.com/oauth/callback';
```

### 2. Environment Variable Configuration

**Updated all environment files:**
```bash
# Development
VITE_GHL_REDIRECT_URI=http://localhost:5173/oauth/callback

# Production  
VITE_GHL_REDIRECT_URI=https://reporting.tulenagency.com/oauth/callback
```

## OAuth Flow Architecture

### Current Flow (Corrected)
1. **User clicks "Connect GoHighLevel"**
2. **Frontend generates auth URL** with redirect URI: `/oauth/callback`
3. **User authorizes** on GoHighLevel marketplace
4. **GoHighLevel redirects** to `/oauth/callback?code=...`
5. **Frontend callback page** processes the authorization code
6. **Frontend exchanges code** for tokens via GoHighLevel API
7. **Tokens saved** to Supabase database
8. **Success message** displayed and popup closed

## Required GoHighLevel OAuth App Configuration

### Redirect URIs to Configure
- **Development:** `http://localhost:5173/oauth/callback`
- **Production:** `https://reporting.tulenagency.com/oauth/callback`

### Required Scopes
- `contacts.read`
- `contacts.write`
- `opportunities.read`
- `opportunities.write`
- `funnels/funnel.readonly`
- `funnels/page.readonly`
- `locations.readonly`

## Testing the Fix

### 1. Environment Setup
```bash
# Copy environment file
cp config/env.development.example .env.local

# Set your GoHighLevel OAuth credentials
VITE_GHL_CLIENT_ID=your_actual_client_id
VITE_GHL_CLIENT_SECRET=your_actual_client_secret
VITE_GHL_REDIRECT_URI=http://localhost:5173/oauth/callback
```

### 2. GoHighLevel OAuth App Configuration
1. Go to GoHighLevel Marketplace
2. Edit your OAuth app
3. Update redirect URI to: `https://reporting.tulenagency.com/oauth/callback`
4. Save changes

### 3. Test OAuth Flow
1. Start development server: `npm run dev`
2. Navigate to agency integrations page
3. Click "Connect GoHighLevel"
4. Complete OAuth authorization
5. Verify successful connection

## Debugging

### Check Authorization URL
The authorization URL should now include the correct redirect URI:
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation?
  response_type=code&
  client_id=your_client_id&
  redirect_uri=https%3A%2F%2Freporting.tulenagency.com%2Foauth%2Fcallback&
  scope=contacts.read%20contacts.write%20opportunities.read%20opportunities.write&
  access_type=offline&
  prompt=consent
```

### Check Frontend Logs
Monitor browser console for:
- OAuth URL generation
- Popup window handling
- Authorization code reception
- Token exchange success

## Common Issues and Solutions

### Issue: "Authorization code not found in callback"
**Cause:** Redirect URI mismatch
**Solution:** Ensure GoHighLevel OAuth app uses `https://reporting.tulenagency.com/oauth/callback`

### Issue: "Missing OAuth credentials"
**Cause:** Environment variables not set
**Solution:** Set `VITE_GHL_CLIENT_ID` and `VITE_GHL_CLIENT_SECRET`

### Issue: "Token exchange failed"
**Cause:** Invalid client secret or expired code
**Solution:** Verify credentials and ensure code is used within 10 minutes

### Issue: "No location ID received"
**Cause:** GoHighLevel API response missing locationId
**Solution:** Check GoHighLevel API status and user permissions

## Security Considerations

1. **State Parameter Validation:** Implement CSRF protection using state parameter
2. **Token Encryption:** Tokens are encrypted before database storage
3. **HTTPS Only:** All OAuth flows use HTTPS in production
4. **Token Expiration:** Automatic token refresh before expiration

## Monitoring

### Success Metrics
- OAuth completion rate
- Token exchange success rate
- Database save success rate
- User connection success rate

### Error Tracking
- Authorization code missing errors
- Token exchange failures
- Database save failures
- Redirect URI mismatch errors

## Future Improvements

1. **PKCE Support:** Implement PKCE for enhanced security
2. **State Validation:** Add proper state parameter validation
3. **Error Recovery:** Implement automatic retry for transient failures
4. **Analytics:** Add OAuth flow analytics and monitoring

---

**Status:** ✅ Fixed
**Last Updated:** January 20, 2025
**Production URL:** https://reporting.tulenagency.com/oauth/callback
**Tested:** Pending end-to-end testing