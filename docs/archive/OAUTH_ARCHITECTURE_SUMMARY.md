# OAuth & Google Ads Integration Architecture Summary

## 🔐 OAuth Flow Architecture

### 1. **OAuth Service (`src/services/auth/oauthService.ts`)**

**Purpose**: Centralized OAuth 2.0 service handling all platform integrations

**Key Features**:
- **PKCE Support**: Uses Proof Key for Code Exchange for Google platforms
- **Unified Flow**: Single OAuth flow for both Google Ads and Google Sheets
- **Token Management**: Integrates with TokenManager for secure storage
- **Scope Management**: Platform-specific scopes

**OAuth Scopes**:
```typescript
// Google Ads
[
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

// Google Sheets  
[
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]
```

**OAuth Flow Steps**:
1. **Generate Auth URL**: Creates authorization URL with PKCE parameters
2. **Store Code Verifier**: Saves PKCE code verifier in localStorage
3. **Redirect to Google**: User authorizes application
4. **Handle Callback**: Processes authorization code
5. **Exchange Tokens**: Exchanges code for access/refresh tokens
6. **Store Tokens**: Saves tokens securely via TokenManager

### 2. **Token Manager (`src/services/auth/TokenManager.ts`)**

**Purpose**: Secure token storage and automatic refresh

**Key Features**:
- **Database Storage**: Tokens stored in Supabase `integrations` table
- **Automatic Refresh**: Refreshes tokens 5 minutes before expiry
- **Multi-Device Sync**: Tokens accessible across devices
- **Audit Trail**: Tracks token usage and refresh history

**Token Storage Structure**:
```typescript
{
  platform: 'googleAds',
  connected: true,
  config: {
    tokens: {
      accessToken: 'ya29...',
      refreshToken: '1//...',
      expiresAt: '2024-01-01T12:00:00Z',
      tokenType: 'Bearer',
      scope: 'https://www.googleapis.com/auth/adwords...'
    },
    accountInfo: {
      id: '114022914626790301268',
      name: 'steve@tulenagency.com',
      email: 'steve@tulenagency.com'
    },
    metadata: {
      googleUserId: '114022914626790301268',
      googleUserEmail: 'steve@tulenagency.com',
      googleUserName: 'Steve Towers'
    }
  }
}
```

## 🏗️ Account Management Architecture

### 3. **Google Ads Service (`src/services/api/googleAdsService.ts`)**

**Purpose**: Interface between frontend and Google Ads API

**Key Methods**:
- `getAdAccounts()`: Retrieves accessible Google Ads accounts
- `getCampaigns()`: Gets campaigns for specific customer
- `getAccountMetrics()`: Fetches performance metrics

**Architecture Pattern**:
```
Frontend → GoogleAdsService → Supabase Edge Function → Google Ads API
```

### 4. **Supabase Edge Function (`supabase/functions/google-ads-api/index.ts`)**

**Purpose**: Server-side proxy for Google Ads API calls

**Key Features**:
- **Token Retrieval**: Gets OAuth tokens from database
- **API Proxying**: Makes authenticated calls to Google Ads API
- **Error Handling**: Centralized error management
- **Rate Limiting**: Built-in request throttling

**Supported Endpoints**:
- `/accounts`: Get accessible customer accounts
- `/campaigns?customerId=X`: Get campaigns for customer

**API Call Flow**:
1. **Retrieve Tokens**: Gets OAuth tokens from `integrations` table
2. **Validate Credentials**: Checks for access token and developer token
3. **Make API Call**: Calls Google Ads API with proper headers
4. **Transform Data**: Converts API response to standardized format
5. **Return Response**: Sends data back to frontend

## 🎨 Frontend Integration

### 5. **Connection Components**

**Google Ads Connection (`src/components/connection/GoogleAdsConnection.tsx`)**:
- **Initiate OAuth**: Calls `OAuthService.generateAuthUrl('googleAds')`
- **Check Status**: Verifies connection via `UnifiedIntegrationService`
- **Handle Errors**: Shows connection errors to user

**OAuth Callback (`src/pages/OAuthCallback.tsx`)**:
- **Process Callback**: Handles OAuth redirect from Google
- **Exchange Tokens**: Calls `OAuthService.handleGoogleAdsCallback()`
- **Save Integration**: Stores tokens via `UnifiedIntegrationService`

### 6. **Account Selection & Display**

**Client Form (`src/components/admin/ClientForm.tsx`)**:
- **Load Accounts**: Calls `GoogleAdsService.getAdAccounts()`
- **Account Selection**: Allows users to map accounts to clients
- **Save Mapping**: Stores account-client relationships

**Google Ads Page (`src/pages/GoogleAdsPage.tsx`)**:
- **Display Accounts**: Shows all client-account mappings
- **Load Metrics**: Fetches performance data for each account
- **Real-time Updates**: Refreshes data based on selected period

## 📊 Data Flow Architecture

### 7. **Complete Data Flow**

```
1. OAuth Authorization
   User → GoogleAdsConnection → OAuthService.generateAuthUrl()
   → Google OAuth → OAuthCallback → OAuthService.handleGoogleAdsCallback()
   → TokenManager.storeOAuthTokens() → Supabase integrations table

2. Account Retrieval
   Frontend → GoogleAdsService.getAdAccounts()
   → Supabase Edge Function → Google Ads API
   → List Accessible Customers → Get Customer Details
   → Return Account List → Frontend Display

3. Client Mapping
   Admin → ClientForm → GoogleAdsService.getAdAccounts()
   → Account Selection → Save to clients table
   → Account-Client Relationship Established

4. Reporting Data
   Frontend → EventMetricsService.getComprehensiveMetrics()
   → GoogleAdsService.getAccountMetrics()
   → Supabase Edge Function → Google Ads API
   → Campaign Performance Data → Frontend Display
```

### 8. **Database Schema**

**Integrations Table**:
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  connected BOOLEAN DEFAULT FALSE,
  account_name TEXT,
  account_id TEXT,
  last_sync TIMESTAMP,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Clients Table**:
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  status TEXT DEFAULT 'active',
  accounts JSONB, -- { googleAds: "account_id", facebookAds: "account_id" }
  shareable_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Token Refresh Mechanism

### 9. **Automatic Token Refresh**

**TokenManager Logic**:
1. **Check Expiry**: Compares token expiry with current time
2. **Refresh Threshold**: Refreshes 5 minutes before expiry
3. **API Call**: Calls Google OAuth token endpoint
4. **Update Database**: Stores new tokens with updated expiry
5. **Return Token**: Provides fresh access token

**Refresh Flow**:
```
TokenManager.getAccessToken() 
→ Check if token expires within 5 minutes
→ If yes: Call Google OAuth refresh endpoint
→ Update database with new tokens
→ Return fresh access token
```

## 🛡️ Security Features

### 10. **Security Measures**

- **PKCE**: Prevents authorization code interception
- **State Validation**: CSRF protection via state parameter
- **Token Encryption**: Tokens stored securely in database
- **Automatic Cleanup**: Code verifiers removed after use
- **Error Handling**: Graceful failure without exposing sensitive data
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Edge functions handle cross-origin requests

## 📈 Performance Optimizations

### 11. **Performance Features**

- **Edge Functions**: Server-side API calls reduce client-side complexity
- **Token Caching**: Tokens cached in database for quick access
- **Batch Requests**: Multiple API calls combined where possible
- **Error Recovery**: Automatic retry with exponential backoff
- **Lazy Loading**: Accounts loaded only when needed
- **Connection Pooling**: Efficient database connections

## 🔧 Configuration

### 12. **Environment Variables**

**Required**:
- `VITE_GOOGLE_CLIENT_ID`: OAuth client ID
- `VITE_GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GOOGLE_ADS_DEVELOPER_TOKEN`: Google Ads API developer token

**Optional**:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

## 🎯 Key Benefits

1. **Unified OAuth**: Single service handles all platform authentications
2. **Secure Storage**: Tokens stored securely with automatic refresh
3. **Scalable Architecture**: Edge functions handle API complexity
4. **Real-time Data**: Live performance metrics and account data
5. **Error Resilience**: Comprehensive error handling and recovery
6. **Multi-tenant**: Supports multiple clients with different account mappings
7. **Audit Trail**: Complete logging and debugging capabilities
