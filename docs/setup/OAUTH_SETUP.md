# OAuth Setup Guide for Production

## Required URLs for OAuth Apps

When setting up OAuth applications with each platform, you'll need to configure these redirect URIs:

### Base URLs

- **Development**: `http://localhost:8080`
- **Production**: `https://yourdomain.com`

### Redirect URIs

- **Facebook**: `http://localhost:8080/oauth/callback`
- **Google**: `http://localhost:8080/oauth/callback`
- **GoHighLevel**: `http://localhost:8080/oauth/callback`

## Platform-Specific Setup

### 1. Facebook Developer Portal

1. Go to [Facebook Developer Portal](https://developers.facebook.com)
2. Create a new app → **Business** type
3. Add **Facebook Login** product
4. In **Facebook Login** → **Settings**:
   - Add `http://localhost:8080/oauth/callback` to **Valid OAuth Redirect URIs**
   - Add `https://yourdomain.com/oauth/callback` for production
5. Get your **App ID** and **App Secret**

### 2. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Ads API** and **Google Sheets API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8080/oauth/callback`
     - `https://yourdomain.com/oauth/callback`
6. Get your **Client ID** and **Client Secret**

### 3. GoHighLevel Marketplace

1. Go to [GoHighLevel Marketplace](https://marketplace.gohighlevel.com)
2. Sign up for developer account
3. Create a new app
4. In **OAuth Settings**:
   - Redirect URI: `http://localhost:8080/oauth/callback`
   - Production URI: `https://yourdomain.com/oauth/callback`
5. Get your **Client ID** and **Client Secret**

## Environment Variables

Create a `.env.local` file in your project root:

```bash
# Facebook OAuth
REACT_APP_FACEBOOK_CLIENT_ID=your_facebook_app_id
REACT_APP_FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret

# GoHighLevel OAuth
REACT_APP_GHL_CLIENT_ID=your_ghl_client_id
REACT_APP_GHL_CLIENT_SECRET=your_ghl_client_secret

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

### Debug Mode

Enable debug logging by opening browser console and looking for:

- OAuth URL generation logs
- State parameter validation
- Token exchange responses
- Error messages and stack traces

## Production Checklist

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
