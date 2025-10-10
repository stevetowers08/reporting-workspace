# OAuth Implementation Guide

## Overview

This guide provides comprehensive documentation for the OAuth 2.0 implementation across all integrated platforms in the Marketing Analytics Dashboard. The system supports multiple OAuth flows including authorization code flow with PKCE for enhanced security.

## OAuth Architecture

### Core Components
- **OAuthService**: Main OAuth service (`src/services/auth/oauthService.ts`)
- **TokenManager**: Token storage and management (`src/services/auth/TokenManager.ts`)
- **OAuthCredentialsService**: Credentials management (`src/services/auth/oauthCredentialsService.ts`)
- **Platform-Specific Services**: Facebook, Google, GoHighLevel auth services

### Supported Platforms
- **Facebook Ads**: Long-lived access tokens
- **Google Ads**: OAuth 2.0 with PKCE
- **Google Sheets**: OAuth 2.0 with PKCE (shares Google OAuth)
- **GoHighLevel**: OAuth 2.0 with location-based authentication

## OAuth Flows

### 1. Authorization Code Flow with PKCE (Google)

#### Step 1: Generate Authorization URL
```typescript
const authUrl = await OAuthService.generateAuthUrl('googleAds', {
  access_type: 'offline',
  prompt: 'consent'
});
```

**Process**:
1. Generate PKCE code verifier (43-128 characters)
2. Create code challenge using SHA256
3. Store code verifier in localStorage
4. Build authorization URL with parameters

**URL Structure**:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=your_client_id&
  redirect_uri=your_redirect_uri&
  response_type=code&
  scope=https://www.googleapis.com/auth/adwords&
  state=base64_encoded_state&
  access_type=offline&
  prompt=consent&
  code_challenge=code_challenge&
  code_challenge_method=S256
```

#### Step 2: Handle Authorization Callback
```typescript
const result = await OAuthService.handleGoogleAdsCallback(code, state);
```

**Process**:
1. Validate state parameter
2. Retrieve code verifier from localStorage
3. Exchange code for tokens
4. Store tokens securely
5. Clean up temporary data

#### Step 3: Token Exchange
```typescript
const tokens = await OAuthService.exchangeCodeForTokens('googleAds', code, state);
```

**Request**:
```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=your_client_id&
client_secret=your_client_secret&
code=authorization_code&
grant_type=authorization_code&
redirect_uri=your_redirect_uri&
code_verifier=code_verifier
```

**Response**:
```json
{
  "access_token": "ya29.a0AfH6SMC...",
  "refresh_token": "1//04...",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/adwords"
}
```

### 2. Long-Lived Token Flow (Facebook)

#### Step 1: Get Short-Lived Token
```typescript
// User authorizes app and provides short-lived token
const shortLivedToken = "user_provided_token";
```

#### Step 2: Exchange for Long-Lived Token
```typescript
const longLivedToken = await FacebookAdsService.exchangeForLongLivedToken(shortLivedToken);
```

**Request**:
```http
GET https://graph.facebook.com/v18.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=your_app_id&
  client_secret=your_app_secret&
  fb_exchange_token=short_lived_token
```

**Response**:
```json
{
  "access_token": "long_lived_token",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### 3. Location-Based OAuth (GoHighLevel)

#### Step 1: Generate Authorization URL
```typescript
const authUrl = GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, scopes);
```

**URL Structure**:
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation?
  response_type=code&
  client_id=your_client_id&
  redirect_uri=your_redirect_uri&
  scope=contacts.read%20campaigns.read
```

#### Step 2: Token Exchange
```typescript
const tokenData = await GoHighLevelAuthService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
```

**Request**:
```http
POST https://services.leadconnectorhq.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=authorization_code&
client_id=your_client_id&
client_secret=your_client_secret&
redirect_uri=your_redirect_uri&
user_type=Location
```

**Response**:
```json
{
  "access_token": "ghl_access_token",
  "refresh_token": "ghl_refresh_token",
  "expires_in": 3600,
  "token_type": "Bearer",
  "locationId": "location_123456"
}
```

## Token Management

### Token Storage

#### Simple Development Storage (Standard Approach)

**This is the standard approach for ALL OAuth services in development:**

- **Direct Storage**: OAuth tokens are stored directly in `integrations.config.tokens` as plain JSON
- **No Encryption Complexity**: Keeps implementation simple and working
- **Database Security**: Tokens protected by Supabase Row Level Security policies
- **Applies to All Services**: Google Ads, Google Sheets, Facebook Ads, GoHighLevel

#### Database Storage (Primary)
```typescript
// Store tokens in Supabase - simple approach
await TokenManager.storeOAuthTokens(platform, tokens, userInfo);
```

**Storage Tables**:
- `integrations`: Platform configurations and tokens (PRIMARY)
- `user_google_ads_auth`: Google-specific token storage (legacy)
- `oauth_credentials`: Platform OAuth configurations

#### Token Structure
```typescript
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  tokenType: string;
  scope?: string;
}
```

**Database Storage Format**:
```json
{
  "integrations": {
    "platform": "googleAds",
    "connected": true,
    "config": {
      "tokens": {
        "accessToken": "ya29.a0AfH6SMC...",
        "refreshToken": "1//04...",
        "expiresAt": "2024-01-01T12:00:00Z",
        "tokenType": "Bearer",
        "scope": "https://www.googleapis.com/auth/adwords"
      }
    }
  }
}
```

#### Security Considerations

- **Database Level**: Supabase Row Level Security policies
- **Network Level**: HTTPS in production
- **Access Control**: Database access controls
- **Future Enhancement**: Encryption can be added later via database triggers without code changes

### Token Refresh

#### Automatic Refresh
```typescript
const newTokens = await OAuthService.refreshAccessToken(platform);
```

**Process**:
1. Check if refresh token exists
2. Make refresh request to token endpoint
3. Update stored tokens
4. Return new access token

#### Refresh Request (Google)
```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=your_client_id&
client_secret=your_client_secret&
refresh_token=refresh_token&
grant_type=refresh_token
```

### Token Validation

#### Check Token Validity
```typescript
const isValid = await OAuthService.isTokenValid(platform);
```

**Process**:
1. Retrieve stored tokens
2. Check expiration timestamp
3. Validate token format
4. Test token with API call

#### Token Expiration Handling
```typescript
// Automatic token refresh on API calls
if (response.status === 401) {
  await OAuthService.refreshAccessToken(platform);
  // Retry original request
}
```

## Security Implementation

### PKCE (Proof Key for Code Exchange)

#### Code Verifier Generation
```typescript
private static generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
```

#### Code Challenge Generation
```typescript
private static async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = this.generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  });
}
```

### State Parameter

#### State Generation
```typescript
private static generateState(platform: string, integrationPlatform?: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  const state: OAuthState = { 
    platform, 
    timestamp, 
    nonce,
    integrationPlatform: integrationPlatform || platform
  };
  
  return btoa(JSON.stringify(state));
}
```

#### State Validation
```typescript
const storedState = localStorage.getItem(`oauth_state_${platform}`);
if (!storedState || storedState !== state) {
  throw new Error('Invalid OAuth state - possible CSRF attack');
}
```

### Token Security

#### Secure Storage
- **Database**: Encrypted storage in Supabase
- **LocalStorage**: Temporary storage for PKCE verifiers
- **HTTPS**: All communications encrypted
- **JWT**: Signed tokens for API authentication

#### Token Rotation
- **Refresh Tokens**: Automatic rotation on use
- **Access Tokens**: Short-lived (1 hour)
- **Revocation**: Proper token cleanup on logout

## Platform-Specific Implementation

### Google OAuth Configuration

#### Environment Variables
```bash
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
```

#### Scopes
```typescript
const googleAdsScopes = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const googleSheetsScopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];
```

#### Redirect URIs
- **Development**: `http://localhost:3000/oauth/callback`
- **Production**: `https://tulenreporting.vercel.app/oauth/callback`
- **Backend**: `${VITE_SUPABASE_URL}/functions/v1/google-ads-oauth`

### Facebook OAuth Configuration

#### App Configuration
```bash
VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_APP_SECRET=your_app_secret
```

#### Required Permissions
- `ads_read`: Read advertising data
- `ads_management`: Manage advertising campaigns
- `business_management`: Access business manager accounts

#### Token Exchange
```typescript
// Exchange short-lived token for long-lived token
const longLivedToken = await fetch(
  `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
);
```

### GoHighLevel OAuth Configuration

#### App Credentials
```bash
VITE_GHL_CLIENT_ID=your_client_id
VITE_GHL_CLIENT_SECRET=your_client_secret
VITE_GHL_REDIRECT_URI=your_redirect_uri
```

#### Required Scopes
- `contacts.read`: Read contact data
- `contacts.write`: Write contact data
- `campaigns.read`: Read campaign data
- `opportunities.read`: Read opportunity data
- `calendars.read`: Read calendar data

#### Location Selection
```typescript
// GoHighLevel requires location selection during OAuth
const authUrl = GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, scopes);
// User selects location during OAuth flow
```

## Error Handling

### Common OAuth Errors

#### 400 Bad Request
```typescript
if (response.status === 400) {
  const errorData = await response.json();
  throw new Error(`OAuth error: ${JSON.stringify(errorData)}`);
}
```

#### 401 Unauthorized
```typescript
if (response.status === 401) {
  throw new Error('OAuth token exchange failed: Invalid credentials or token revoked');
}
```

#### 403 Forbidden
```typescript
if (response.status === 403) {
  throw new Error('OAuth access denied: Insufficient permissions');
}
```

### Error Recovery

#### Token Refresh Failure
```typescript
try {
  await OAuthService.refreshAccessToken(platform);
} catch (error) {
  // Redirect to re-authentication
  window.location.href = await OAuthService.generateAuthUrl(platform);
}
```

#### Network Errors
```typescript
try {
  const response = await fetch(tokenUrl, options);
} catch (error) {
  if (error.name === 'NetworkError') {
    // Retry with exponential backoff
    await retryWithBackoff(() => fetch(tokenUrl, options));
  }
}
```

## Testing and Debugging

### OAuth Flow Testing

#### Test Authorization URL Generation
```typescript
const authUrl = await OAuthService.generateAuthUrl('googleAds');
console.log('Generated auth URL:', authUrl);
```

#### Test Token Exchange
```typescript
const tokens = await OAuthService.exchangeCodeForTokens('googleAds', code, state);
console.log('Received tokens:', tokens);
```

#### Test Token Refresh
```typescript
const newTokens = await OAuthService.refreshAccessToken('googleAds');
console.log('Refreshed tokens:', newTokens);
```

### Debug Tools

#### Token Validation
```typescript
const isValid = await OAuthService.isTokenValid('googleAds');
console.log('Token valid:', isValid);
```

#### Stored Tokens Inspection
```typescript
const tokens = await OAuthService.getStoredTokens('googleAds');
console.log('Stored tokens:', tokens);
```

#### PKCE Verification
```typescript
const codeVerifier = localStorage.getItem('oauth_code_verifier_googleAds');
console.log('Code verifier:', codeVerifier);
```

## Best Practices

### Security Best Practices

#### PKCE Implementation
- Always use PKCE for public clients
- Generate cryptographically secure code verifiers
- Use SHA256 for code challenges
- Store code verifiers securely

#### State Parameter
- Always use state parameter for CSRF protection
- Generate cryptographically secure state values
- Validate state on callback
- Use short expiration times

#### Token Management
- Use short-lived access tokens
- Implement automatic refresh
- Store tokens securely
- Implement proper revocation

### Development Best Practices

#### Error Handling
- Handle all OAuth error codes
- Implement proper retry logic
- Provide meaningful error messages
- Log errors for debugging

#### Testing
- Test all OAuth flows
- Mock external OAuth providers
- Test error scenarios
- Validate token handling

#### Monitoring
- Monitor OAuth success rates
- Track token refresh frequency
- Monitor error rates
- Alert on authentication failures

## Troubleshooting

### Common Issues

#### PKCE Code Verifier Missing
```typescript
// Check localStorage for code verifier
const codeVerifier = localStorage.getItem(`oauth_code_verifier_${platform}`);
if (!codeVerifier) {
  throw new Error('PKCE code verifier not found - OAuth flow may have been interrupted');
}
```

#### Invalid State Parameter
```typescript
// Validate state parameter
const storedState = localStorage.getItem(`oauth_state_${platform}`);
if (!storedState || storedState !== state) {
  throw new Error('Invalid OAuth state - possible CSRF attack');
}
```

#### Token Expiration
```typescript
// Check token expiration
const tokens = await OAuthService.getStoredTokens(platform);
if (tokens?.expiresAt && new Date(tokens.expiresAt) < new Date()) {
  await OAuthService.refreshAccessToken(platform);
}
```

#### Scope Issues
```typescript
// Verify token scopes
const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});
```

### Debug Commands

#### Test OAuth Flow
```typescript
// Complete OAuth flow test
const authUrl = await OAuthService.generateAuthUrl('googleAds');
console.log('1. Visit:', authUrl);
// ... user completes OAuth ...
const tokens = await OAuthService.exchangeCodeForTokens('googleAds', code, state);
console.log('2. Tokens received:', tokens);
const isValid = await OAuthService.isTokenValid('googleAds');
console.log('3. Token valid:', isValid);
```

#### Token Debugging
```typescript
// Debug token information
const tokens = await OAuthService.getStoredTokens('googleAds');
if (tokens?.accessToken) {
  const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
  console.log('Token payload:', payload);
}
```

## Related Documentation

- [Facebook Ads API Documentation](./FACEBOOK_ADS_API_DOCUMENTATION.md)
- [Google Ads API Documentation](./GOOGLE_ADS_API_DOCUMENTATION.md)
- [GoHighLevel API Documentation](./GOHIGHLEVEL_API_DOCUMENTATION.md)
- [Supabase Database Documentation](./SUPABASE_DATABASE_DOCUMENTATION.md)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)
