# GoHighLevel Integration Configuration

This document explains how to configure and use the GoHighLevel integration with OAuth 2.0 authentication.

## Prerequisites

- Node.js 18+ installed
- GoHighLevel account with API access
- Valid GoHighLevel OAuth app credentials

## Getting Your GoHighLevel OAuth Credentials

1. **Log in to GoHighLevel**: Access your GoHighLevel dashboard
2. **Navigate to Marketplace**: Go to https://marketplace.leadconnectorhq.com/
3. **Create OAuth App**:
   - Click "Create New App"
   - Give it a name (e.g., "Marketing Analytics Integration")
   - Set redirect URI to: `https://your-domain.com/api/leadconnector/oath`
   - Select the scopes you need:
     - `contacts.readonly`
     - `opportunities.readonly`
     - `calendars.readonly`
     - `funnels/funnel.readonly`
     - `funnels/page.readonly`
     - `locations.readonly`
4. **Copy the Credentials**: Save the Client ID and Client Secret securely

## Configuration Options

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required OAuth Credentials
VITE_GHL_CLIENT_ID=your_client_id_here
VITE_GHL_CLIENT_SECRET=your_client_secret_here

# Optional
VITE_APP_URL=https://your-domain.com
NODE_ENV=development
```

### Database Configuration

The integration stores OAuth tokens in the Supabase database:

```sql
-- OAuth tokens are stored in the integrations table
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  account_id VARCHAR(255),
  connected BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage Examples

### 1. OAuth Authorization Flow

```typescript
// Generate OAuth authorization URL
const authUrl = GoHighLevelAuthService.getAuthorizationUrl(
  clientId,
  redirectUri,
  ['contacts.readonly', 'opportunities.readonly', 'calendars.readonly']
);

// Redirect user to authorization URL
window.location.href = authUrl;
```

### 2. Handle OAuth Callback

```typescript
// In your callback page component
const handleOAuthCallback = async (code: string, locationId: string) => {
  try {
    // Exchange authorization code for access token
    const tokenData = await GoHighLevelAuthService.exchangeCodeForToken(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Save token to database
    await GoHighLevelApiService.saveLocationToken(
      locationId,
      tokenData.access_token,
      tokenData.scope.split(' ')
    );

    console.log('GoHighLevel connected successfully');
  } catch (error) {
    console.error('OAuth callback failed:', error);
  }
};
```

### 3. Get Contacts from a Location

```typescript
const contacts = await GoHighLevelApiService.getContacts(
  locationId,
  50, // limit
  0   // offset
);
console.log(`Retrieved ${contacts.length} contacts`);
```

### 4. Get Funnels and Pages

```typescript
// Get all funnels for a location
const funnels = await GoHighLevelApiService.getFunnels(locationId);

// Get pages for a specific funnel
for (const funnel of funnels) {
  const pages = await GoHighLevelApiService.getFunnelPages(
    funnel._id,
    locationId
  );
  console.log(`Funnel ${funnel.name} has ${pages.length} pages`);
}
```

## Error Handling

The integration handles various error scenarios:

### OAuth Errors
- **Invalid Client Credentials**: Returns error if client ID/secret are missing or invalid
- **Expired Token**: Automatically refreshes tokens using refresh token
- **Invalid Redirect URI**: Ensures redirect URI matches exactly

### API Errors
- **Rate Limiting**: Automatically handles rate limit responses with exponential backoff
- **Network Timeouts**: Configurable timeout handling
- **Invalid Parameters**: Validates input parameters and location IDs

### Example Error Response
```typescript
try {
  const contacts = await GoHighLevelApiService.getContacts(locationId);
} catch (error) {
  if (error.message.includes('Token does not have access to this location')) {
    // Handle location access error
    console.error('Location access denied:', locationId);
  } else if (error.message.includes('Rate limit exceeded')) {
    // Handle rate limiting
    console.error('Rate limit exceeded, retrying...');
  }
}
```

## Security Considerations

1. **OAuth Credentials Storage**: Never commit client ID/secret to version control
2. **Environment Variables**: Use environment variables for sensitive data
3. **Token Security**: Store OAuth tokens securely in database with encryption
4. **HTTPS Only**: Ensure all OAuth redirects use HTTPS
5. **Scope Limitation**: Request only necessary OAuth scopes
6. **Token Expiration**: Implement automatic token refresh
7. **Location Access**: Validate location ID permissions before API calls

## Troubleshooting

### Common Issues

1. **"Invalid client credentials" Error**
   - Solution: Verify `VITE_GHL_CLIENT_ID` and `VITE_GHL_CLIENT_SECRET` in `.env.local`

2. **"Invalid redirect URI" Error**
   - Solution: Ensure redirect URI in GHL app settings matches exactly: `https://your-domain.com/api/leadconnector/oath`

3. **"Token does not have access to this location" Error**
   - Solution: Verify the location ID exists and the OAuth token has proper scopes

4. **"Rate limit exceeded" Error**
   - Solution: Implement exponential backoff or reduce request frequency

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=GoHighLevelService:*
```

### Logs

The integration logs important events:
- OAuth flow status
- API request/response details
- Error messages with context
- Performance metrics

## Performance Optimization

1. **Batch Requests**: Use appropriate `limit` parameters for pagination
2. **Caching**: Implement client-side caching for frequently accessed data
3. **Rate Limiting**: Built-in rate limiting prevents API abuse
4. **Token Management**: Automatic token refresh reduces authentication overhead
5. **Connection Pooling**: HTTP connections are reused for better performance

## Rate Limits

GoHighLevel API has rate limits:
- **Standard Plan**: 1000 requests per hour
- **Professional Plan**: 5000 requests per hour  
- **Enterprise Plan**: 10000 requests per hour

The integration includes automatic retry logic with exponential backoff for rate limit errors.
