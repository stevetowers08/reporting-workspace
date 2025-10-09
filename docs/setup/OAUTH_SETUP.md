# OAuth Setup Guide for Production

## Required URLs for OAuth Apps

When setting up OAuth applications with each platform, you'll need to configure these redirect URIs:

### Base URLs

- **Development**: `http://localhost:5173`
- **Production**: `https://tulenreporting.vercel.app`

### Redirect URIs

- **Facebook**: `http://localhost:5173/oauth/callback`
- **Google**: `http://localhost:5173/oauth/callback`
- **GoHighLevel**: `http://localhost:5173/oauth/callback`

## Platform-Specific Setup

### 1. Facebook Developer Portal

1. Go to [Facebook Developer Portal](https://developers.facebook.com)
2. Create a new app → **Business** type
3. Add **Facebook Login** product
4. In **Facebook Login** → **Settings**:
   - Add `http://localhost:5173/oauth/callback` to **Valid OAuth Redirect URIs**
   - Add `https://tulenreporting.vercel.app/oauth/callback` for production
5. Get your **App ID** and **App Secret**

### 2. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Ads API**, **Google Sheets API**, and **Google Drive API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://tulenreporting.vercel.app` (production)
   - Authorized redirect URIs:
     - `http://localhost:5173/oauth/callback` (development)
     - `https://tulenreporting.vercel.app/oauth/callback` (production)
6. Go to **APIs & Services** → **OAuth consent screen**:
   - Application type: **Web application**
   - Add these scopes:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
7. Get your **Client ID** and **Client Secret**

### 3. Google Ads API Setup

1. **Google Cloud Console Configuration**:
   - Enable **Google Ads API** in your Google Cloud project
   - Go to **APIs & Services** → **Library**
   - Search for "Google Ads API" and enable it
   - Note: This requires approval from Google (can take 1-2 weeks)

2. **OAuth Consent Screen** (same as Google Sheets):
   - Add these scopes:
     - `https://www.googleapis.com/auth/adwords`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

3. **Google Ads Developer Token**:
   - Go to [Google Ads API Center](https://ads.google.com/home/tools/api-center/)
   - Apply for a developer token (requires Google Ads account)
   - **Test Account**: Use test developer token for development
   - **Production**: Requires approval and live Google Ads account

4. **Google Ads Account Setup**:
   - Create or use existing Google Ads account
   - Note your Customer ID (10-digit number)
   - Ensure account has API access enabled

### 4. GoHighLevel Marketplace

1. Go to [GoHighLevel Marketplace](https://marketplace.gohighlevel.com)
2. Sign up for developer account
3. Create a new app
4. In **OAuth Settings**:
   - Redirect URI: `http://localhost:5173/oauth/callback`
   - Production URI: `https://tulenreporting.vercel.app/oauth/callback`
5. Get your **Client ID** and **Client Secret**

## Environment Variables

Create a `.env.local` file in your project root:

```bash
# Facebook OAuth
VITE_FACEBOOK_CLIENT_ID=your_facebook_app_id
VITE_FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Google OAuth (for Google Sheets and Google Ads)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Ads Developer Token (required for all Google Ads API calls)
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token

# Google Ads Test Account (for development)
VITE_GOOGLE_ADS_TEST_CUSTOMER_ID=1234567890

# GoHighLevel OAuth
VITE_GHL_CLIENT_ID=your_ghl_client_id
VITE_GHL_CLIENT_SECRET=your_ghl_client_secret
VITE_GHL_REDIRECT_URI=https://yourdomain.com/api/leadconnector/oath

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Token Encryption Key (IMPORTANT: Must match the key used when tokens were encrypted)
# For development, the default key is used if not set
# For production, set a secure 32-character key
VITE_ENCRYPTION_KEY=your-32-character-production-key-here

# Environment
NODE_ENV=development
```

## Testing OAuth Flow

### Development Testing

1. Start your development server: `npm run dev`
2. Go to `http://localhost:8080/admin/integrations`
3. Click "Connect with [Platform]"
4. You'll be redirected to the OAuth provider
5. After authorization, you'll be redirected back to `/oauth/callback`
6. The callback page will process the authorization code
7. You'll be redirected back to the integrations page

### Production Deployment

1. Update all OAuth app settings with production URLs
2. Set environment variables in your hosting platform
3. Deploy your application
4. Test OAuth flows in production

## Security Considerations

### HTTPS Required for Production

- All OAuth redirects must use HTTPS in production
- Update OAuth app settings with HTTPS URLs
- Ensure your hosting platform provides SSL certificates

### Token Storage

- OAuth tokens are stored in database (secure)
- For production, implement secure server-side token storage
- Consider using encrypted cookies or secure database storage

### State Parameter

- The OAuth service generates secure state parameters
- State is validated to prevent CSRF attacks
- State is automatically cleaned up after successful authentication

## Troubleshooting

### Common Issues

**1. "Invalid redirect URI"**

- Ensure the redirect URI in your OAuth app matches exactly
- Check for trailing slashes or protocol mismatches
- Verify the URI is added to authorized redirect URIs

**2. "Invalid client ID"**

- Verify the client ID is correct
- Ensure the OAuth app is in the correct environment (development/production)
- Check if the app is approved (some platforms require approval)

**3. "Access denied"**

- User may have denied permissions
- Check if the required scopes are configured
- Verify the app has the necessary permissions

**4. CORS Issues**

- Ensure your domain is added to authorized domains
- Check if the OAuth provider allows your domain
- Verify the redirect URI is properly configured

**5. Google Sheets Integration Issues**

- **"Insufficient Permissions" Error**: Ensure **Google Drive API** is enabled in Google Cloud Console
- **"404 Not Found" Error**: Check URL encoding in Supabase Edge Function - use `/values/{range}` format, not `?range={range}`
- **Token Refresh Issues**: Google Sheets tokens expire every 1 hour, implement refresh logic in Edge Function
- **CORS Issues**: Use Supabase Edge Function instead of direct API calls to avoid CORS restrictions
- Verify all required scopes are configured:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`

**7. Google Ads API Issues**

- **"Developer token not approved"**: Ensure developer token is approved for production use
- **"Customer ID not found"**: Verify Customer ID is correct (10-digit number)
- **"Insufficient permissions"**: Ensure Google Ads API is enabled and approved
- **"Rate limit exceeded"**: Implement proper rate limiting (5 requests/second max)
- **"Invalid scope"**: Verify `https://www.googleapis.com/auth/adwords` scope is configured
- **"getTokens is not a function"**: Use `TokenManager.getAccessToken()` instead of `getTokens()`
- **"404 on customer details"**: Skip individual customer details API calls, use customer IDs directly

**8. Google Ads OAuth Flow Issues**

- **PKCE Implementation**: Must use SHA-256 hashing for code challenge
- **Customer ID Management**: Handle multiple Google Ads accounts per user
- **Token Refresh**: Google Ads tokens expire every 1 hour, implement refresh logic
- **API Version**: Use Google Ads API v20 (current stable version)
- **Direct API Calls**: Use direct API calls instead of Edge Functions for better reliability

**9. Token Encryption Issues**

- **401 Authentication Errors**: Usually caused by token decryption failure
- **Missing Encryption Key**: Set `VITE_ENCRYPTION_KEY` environment variable
- **Key Mismatch**: Ensure encryption key matches the one used when tokens were encrypted
- **Token Format**: Encrypted tokens contain `:` separator, plain text tokens don't
- **Development vs Production**: Use consistent encryption keys across environments
- **Automatic Detection**: TokenManager now handles both encrypted and plain text tokens
- **Recovery**: If decryption fails, tokens can be manually decrypted and stored as plain text

### Debug Mode

Enable debug logging by opening browser console and looking for:

- OAuth URL generation logs
- State parameter validation
- Token exchange responses
- Error messages and stack traces

## Production Checklist

### Google Sheets
- [ ] Google Sheets API enabled
- [ ] Google Drive API enabled
- [ ] OAuth scopes configured correctly
- [ ] Redirect URIs configured for production domain

### Google Ads
- [ ] Google Ads API enabled and approved
- [ ] Developer token obtained and approved
- [ ] Test Customer ID configured for development
- [ ] Production Customer IDs configured
- [ ] Rate limiting implemented (5 requests/second max)
- [ ] PKCE implementation uses SHA-256 hashing
- [ ] Token refresh logic implemented

### General
- [ ] OAuth apps created for all platforms
- [ ] Redirect URIs configured for production domain
- [ ] Environment variables set in hosting platform
- [ ] HTTPS enabled for production domain
- [ ] OAuth apps approved (if required)
- [ ] Error handling and fallback pages implemented
- [ ] Token storage secured (server-side)
- [ ] Monitoring and logging configured
- [ ] User documentation updated
- [ ] Support team trained on OAuth flows

## Support

If you encounter issues with OAuth setup:

1. Check the browser console for error messages
2. Verify OAuth app configuration
3. Test with a different browser or incognito mode
4. Contact the OAuth provider's support if needed
5. Review the platform-specific documentation
