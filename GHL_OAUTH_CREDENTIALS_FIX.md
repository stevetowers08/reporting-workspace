# GoHighLevel OAuth Credentials Fix

## Issue: "Invalid client credentials" Error

**Root Cause**: Missing `VITE_GHL_CLIENT_ID` and `VITE_GHL_CLIENT_SECRET` environment variables.

## Solution Steps

### 1. Set Environment Variables

Add these to your `.env.local` file (for development) or Vercel environment variables (for production):

```bash
# GoHighLevel OAuth Credentials
VITE_GHL_CLIENT_ID=68e135aa17f574067cfb7e39
VITE_GHL_CLIENT_SECRET=68e135aa17f574067cfb7e39-mgcefs9f
```

### 2. Verify GoHighLevel OAuth App Configuration

The OAuth app should be configured with:
- **Client ID**: `68e135aa17f574067cfb7e39`
- **Client Secret**: `68e135aa17f574067cfb7e39-mgcefs9f`
- **Redirect URI**: `https://tulenreporting.vercel.app/oauth/callback`

### 3. Current Token Status

✅ **Token exists in database** - Location ID: `V7bzEjKiigXzh8r6sQq0`
- Access token is valid until: `2025-10-11T22:21:39.852Z`
- Refresh token available
- Scopes: `contacts.readonly`, `opportunities.readonly`, `calendars.readonly`, `funnels/funnel.readonly`, `funnels/page.readonly`

### 4. Environment Files Updated

✅ **Updated**:
- `config/env.development.example` - Added GHL OAuth variables
- `config/env.production.example` - Added GHL OAuth variables

### 5. Code References

The following files use these environment variables:
- `src/services/auth/oauthService.ts` - OAuth flow
- `src/pages/GHLCallbackPage.tsx` - Callback handling
- `src/pages/OAuthCallback.tsx` - General OAuth callback
- `src/services/ghl/goHighLevelApiService.ts` - Token refresh

## Quick Fix

1. **For Development**: Create `.env.local` with the credentials above
2. **For Production**: Add the variables to Vercel environment settings
3. **Restart**: Restart the development server or redeploy

## Verification

After setting the credentials, the OAuth flow should work without "Invalid client credentials" errors.

---

**Status**: ✅ Environment configs updated, credentials need to be set in actual environment
