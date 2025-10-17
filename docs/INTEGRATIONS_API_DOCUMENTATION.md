# Marketing Analytics Dashboard - Complete API & Analytics Guide

## Table of Contents
1. [Overview](#overview)
2. [Facebook Ads Integration](#facebook-ads-integration)
3. [Google Ads Integration](#google-ads-integration)
4. [GoHighLevel Integration](#gohighlevel-integration)
5. [Google Sheets Integration](#google-sheets-integration)
6. [Analytics Data Endpoints](#analytics-data-endpoints)
7. [CRM Data Integration](#crm-data-integration)
8. [Reporting & Dashboard APIs](#reporting--dashboard-apis)
9. [Common Problems & Solutions](#common-problems--solutions)
10. [Authentication Flows](#authentication-flows)
11. [Rate Limiting & Best Practices](#rate-limiting--best-practices)
12. [Complete Reporting Examples](#complete-reporting-examples)

---

## Overview

This comprehensive guide covers all aspects of the Marketing Analytics Dashboard, including:

- **API Integrations**: Facebook Ads, Google Ads, GoHighLevel, Google Sheets, Google AI Studio
- **Analytics Data**: Campaign metrics, conversion tracking, performance data
- **CRM Integration**: Lead management, contact tracking, opportunity data
- **Reporting APIs**: Dashboard data, custom reports, data export
- **Authentication**: OAuth flows, token management, security
- **Best Practices**: Rate limiting, error handling, performance optimization

### Key Features Covered
- **Multi-Platform Analytics**: Unified reporting across Facebook, Google, and CRM platforms
- **Real-Time Data**: Live campaign metrics and performance tracking
- **Lead Attribution**: Track leads from ad campaigns to CRM conversions
- **Custom Dashboards**: Build personalized analytics views
- **Data Export**: Export reports to Google Sheets and other formats

## Service Architecture Overview

### Authentication Patterns by Platform

| Platform | Agency Level | Client Level | Storage Location |
|----------|-------------|--------------|------------------|
| **Facebook Ads** | OAuth 2.0 | OAuth 2.0 (same token) | Database (`integrations` table) |
| **Google Ads** | OAuth 2.0 | OAuth 2.0 (same token) | Database (`integrations` table) |
| **Google Sheets** | OAuth 2.0 | Selection from agency's sheets | Database (`clients.accounts.googleSheetsConfig`) |
| **GoHighLevel** | API Key (env) | OAuth 2.0 per location | Database (`integrations` table) |
| **Google AI Studio** | API Key | API Key (same key) | Database (`integrations` table) |

### Service Layer Architecture

```typescript
// Unified Integration Service
export class UnifiedIntegrationService {
  static async getIntegration(platform: IntegrationPlatform): Promise<IntegrationRow | null>
  static async saveIntegration(platform: IntegrationPlatform, config: IntegrationConfig): Promise<IntegrationRow>
  static async saveOAuthTokens(platform: IntegrationPlatform, tokens: OAuthTokens, accountInfo: AccountInfo): Promise<IntegrationRow>
  static async saveApiKey(platform: IntegrationPlatform, apiKey: ApiKeyConfig, accountInfo: AccountInfo): Promise<IntegrationRow>
  static async isConnected(platform: IntegrationPlatform): Promise<boolean>
  static async getToken(platform: IntegrationPlatform): Promise<string | null>
}

// Token Management Service
export class TokenManager {
  static async getAccessToken(platform: IntegrationPlatform, skipRefresh = false): Promise<string | null>
  static async storeOAuthTokens(platform: IntegrationPlatform, tokens: OAuthTokens, accountInfo: AccountInfo): Promise<void>
  static async clearOAuthTokens(platform: IntegrationPlatform): Promise<void>
  static async refreshToken(platform: IntegrationPlatform): Promise<string | null>
}

// Platform-Specific Services
export class FacebookAdsService {
  static async getAdAccounts(): Promise<FacebookAdsAccount[]>
  static async getCampaigns(accountId: string): Promise<FacebookCampaign[]>
  static async getInsights(accountId: string, dateRange: DateRange): Promise<FacebookInsights[]>
}

export class GoogleAdsService {
  static async getCustomerAccounts(): Promise<GoogleAdsAccount[]>
  static async getConversionActions(customerId: string): Promise<GoogleConversionAction[]>
  static async getCampaigns(customerId: string): Promise<GoogleCampaign[]>
}

export class GoHighLevelService {
  // Agency operations (uses API key)
  static async testAgencyToken(token?: string): Promise<TestResult>
  static async getAgencyToken(): Promise<string>
  
  // Client operations (uses OAuth tokens)
  static async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<GHLTokenData>
  static async getLocationToken(locationId: string): string | null
  static async getContacts(locationId: string): Promise<GHLContact[]>
  static async getOpportunities(locationId: string): Promise<GHLOpportunity[]>
}

export class GoogleSheetsService {
  static async getAccessToken(): Promise<string | null>
  static async getSheetsAccounts(): Promise<GoogleSheetsAccount[]>
  static async getSheetNames(spreadsheetId: string): Promise<string[]>
  static async updateValues(spreadsheetId: string, range: string, values: any[][]): Promise<void>
}

export class GoogleAiService {
  static async generateInsights(dashboardData: any, systemPrompt: string, period: string): Promise<AIInsightsResponse>
  static async testConnection(): Promise<boolean>
}
```

### Database Schema

#### Integrations Table
```sql
CREATE TABLE integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  connected BOOLEAN DEFAULT false,
  account_id VARCHAR(255),
  account_name VARCHAR(255),
  last_sync TIMESTAMP WITH TIME ZONE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Clients Table
```sql
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  location VARCHAR(255) NOT NULL,
  logo_url TEXT,
  services JSONB NOT NULL DEFAULT '{}',
  accounts JSONB DEFAULT '{}',  -- Contains googleSheetsConfig
  conversion_actions JSONB DEFAULT '{}',
  shareable_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Authentication Flow Summary

1. **Agency Setup**: Admin connects integrations at agency level
2. **Client Configuration**: Clients select specific accounts/settings from agency's connected integrations
3. **Token Management**: Centralized token storage with automatic refresh
4. **Data Access**: Services use appropriate tokens based on operation type

---

## Facebook Ads Integration

### Base Configuration
- **API Version**: `v22.0`
- **Base URL**: `https://graph.facebook.com/v22.0`
- **Authentication**: OAuth 2.0 with User Access Token

### Authentication Flow

#### 1. OAuth Authorization URL
```
https://www.facebook.com/v22.0/dialog/oauth?
  client_id={APP_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=ads_read,ads_management,business_management&
  response_type=code&
  state={STATE}
```

#### 2. Exchange Code for Token
```http
POST https://graph.facebook.com/v22.0/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={APP_ID}&
client_secret={APP_SECRET}&
redirect_uri={REDIRECT_URI}&
code={AUTHORIZATION_CODE}
```

**Response:**
```json
{
  "access_token": "USER_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### Core API Endpoints

#### 1. Get User Ad Accounts
```http
GET https://graph.facebook.com/v22.0/me/adaccounts?
  fields=id,name,account_status,currency,timezone_name&
  limit=200&
  access_token={USER_ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "id": "act_123456789",
      "name": "My Ad Account",
      "account_status": 1,
      "currency": "USD",
      "timezone_name": "America/New_York"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MTIzNDU2Nzg5"
    },
    "next": "https://graph.facebook.com/v22.0/me/adaccounts?after=MTIzNDU2Nzg5&access_token=..."
  }
}
```

**Best Practice**: Always use `limit=200` to get maximum accounts per request. Facebook's default limit is 25, so using `limit=200` significantly reduces the number of API calls needed to fetch all accounts.

#### 2. Get Business Accounts
```http
GET https://graph.facebook.com/v22.0/me/businesses?
  fields=id,name&
  access_token={USER_ACCESS_TOKEN}
```

#### 3. Get Business Ad Accounts (Owned)
```http
GET https://graph.facebook.com/v22.0/{BUSINESS_ID}/owned_ad_accounts?
  fields=id,name,account_status,currency&
  limit=200&
  access_token={USER_ACCESS_TOKEN}
```

#### 4. Get Business Ad Accounts (Client)
```http
GET https://graph.facebook.com/v22.0/{BUSINESS_ID}/client_ad_accounts?
  fields=id,name,account_status,currency&
  limit=200&
  access_token={USER_ACCESS_TOKEN}
```

#### 5. Get System User Ad Accounts
```http
GET https://graph.facebook.com/v22.0/{SYSTEM_USER_ID}/adaccounts?
  fields=id,name,account_status,currency&
  limit=200&
  access_token={USER_ACCESS_TOKEN}
```

### Comprehensive Account Fetching Strategy

Our implementation fetches accounts from multiple sources to ensure complete coverage:

```typescript
// Parallel fetching from all sources
const [userAccounts, businessAccounts, systemUserAccounts] = await Promise.allSettled([
  // 1. Direct user accounts
  fetchPaginatedAccounts(`${BASE_URL}/me/adaccounts?fields=id,name,account_status,currency&limit=200&access_token=${userToken}`),
  
  // 2. Business-owned accounts
  fetchBusinessAccounts(userToken),
  
  // 3. System user accounts
  fetchSystemUserAccounts(userToken)
]);
```

### Pagination Handling

**Critical Implementation Detail:**
```typescript
private static async fetchPaginatedAccounts(url: string, _userToken?: string): Promise<any[]> {
  const allAccounts: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    try {
      // Don't add headers if URL already contains access_token
      const hasAccessToken = nextUrl.includes('access_token=');
      const options: RequestInit = hasAccessToken ? {} : { headers: await this.buildApiHeaders() };
      
      const response = await FacebookAdsService.rateLimitedFetch(nextUrl, options);
      const data = await response.json();
      const accounts = data.data || [];
      allAccounts.push(...accounts);

      // Check for next page
      nextUrl = data.paging?.next || null;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching paginated accounts', error);
      break;
    }
  }
  return allAccounts;
}
```

### Common Facebook Ads Problems & Solutions

#### Problem 1: Not All Accounts Showing
**Symptoms:** Only 20-25 accounts visible instead of expected 90+

**Root Cause:** Authentication conflict in pagination
- URLs with `access_token=` parameter were getting additional headers
- This caused authentication conflicts

**Solution:**
```typescript
// Conditional header addition
const hasAccessToken = nextUrl.includes('access_token=');
const options: RequestInit = hasAccessToken ? {} : { headers: await this.buildApiHeaders() };
```

#### Problem 2: Cached Data Issues
**Symptoms:** Stale account data, missing new accounts

**Solution:**
```typescript
// Force refresh bypasses cache
static async refreshAdAccounts(): Promise<any[]> {
  // Always fetch fresh data from API
  const accounts = await this.fetchAllAccountSources();
  await this.cacheAdAccounts(accounts); // Update cache
  return accounts;
}
```

#### Problem 3: Rate Limiting
**Symptoms:** API calls failing with rate limit errors

**Solution:**
```typescript
private static async rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        retryCount++;
        continue;
      }
      
      return response;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
}
```

---

## Google Ads Integration

### Base Configuration
- **API Version**: `v21`
- **Base URL**: `https://googleads.googleapis.com/v21`
- **Authentication**: OAuth 2.0 with Service Account

### Authentication Flow

#### 1. OAuth Authorization URL
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=https://www.googleapis.com/auth/adwords&
  response_type=code&
  access_type=offline&
  prompt=consent
```

#### 2. Exchange Code for Tokens
```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}&
code={AUTHORIZATION_CODE}&
grant_type=authorization_code&
redirect_uri={REDIRECT_URI}
```

**Response:**
```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 3599,
  "refresh_token": "REFRESH_TOKEN",
  "scope": "https://www.googleapis.com/auth/adwords",
  "token_type": "Bearer"
}
```

### Core API Endpoints

#### 1. Get Customer Accounts
```http
POST https://googleads.googleapis.com/v21/customers:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT customer.id, customer.descriptive_name FROM customer"
}
```

#### 2. Get Manager Accounts
```http
POST https://googleads.googleapis.com/v21/customers/{CUSTOMER_ID}/googleAds:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT customer_client.id, customer_client.descriptive_name FROM customer_client"
}
```

#### 3. Get Conversion Actions
```http
POST https://googleads.googleapis.com/v21/customers/{CUSTOMER_ID}/googleAds:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT conversion_action.id, conversion_action.name, conversion_action.type FROM conversion_action WHERE conversion_action.status = 'ENABLED'"
}
```

### Google Ads Data Structures

#### Customer Response
```json
{
  "results": [
    {
      "customer": {
        "id": "1234567890",
        "descriptiveName": "My Google Ads Account"
      }
    }
  ]
}
```

#### Conversion Action Response
```json
{
  "results": [
    {
      "conversionAction": {
        "id": "123456789",
        "name": "Purchase",
        "type": "PURCHASE"
      }
    }
  ]
}
```

### Common Google Ads Problems & Solutions

#### Problem 1: Conversion Actions Not Showing
**Symptoms:** Dropdown shows "None" instead of conversion types

**Solution:**
```typescript
// Fallback conversion actions
const fallbackActions = [
  { id: 'lead', name: 'Lead' },
  { id: 'purchase', name: 'Purchase' },
  { id: 'signup', name: 'Sign Up' },
  { id: 'download', name: 'Download' },
  { id: 'view_item', name: 'View Item' },
  { id: 'add_to_cart', name: 'Add to Cart' },
  { id: 'begin_checkout', name: 'Begin Checkout' }
];
```

#### Problem 2: Token Expiration
**Symptoms:** API calls failing with 401 Unauthorized

**Solution:**
```typescript
private async refreshAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  const data = await response.json();
  this.accessToken = data.access_token;
  return this.accessToken;
}
```

---

## GoHighLevel Integration

### Architecture Overview
**GoHighLevel uses a hybrid authentication model:**
- **Agency Level**: Developer API Key (stored in environment variables)
- **Client Level**: OAuth 2.0 per location (stored in database)

### Base Configuration
- **API Version**: `v1` (API 2.0)
- **Base URL**: `https://services.leadconnectorhq.com`
- **Authentication**: Hybrid (API Key + OAuth 2.0)

### Authentication Architecture

#### Agency-Level Configuration
```typescript
// Environment Variables
VITE_GHL_API_KEY=your_gohighlevel_api_key_here  // Developer API Key
VITE_GHL_CLIENT_ID=your_ghl_client_id         // OAuth Client ID  
VITE_GHL_CLIENT_SECRET=your_ghl_client_secret  // OAuth Client Secret
```

#### Client-Level OAuth Flow

##### 1. OAuth Authorization URL
```
https://marketplace.leadconnectorhq.com/oauth/chooselocation?
  response_type=code&
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=contacts.readonly opportunities.readonly&
  access_type=offline&
  prompt=consent&
  state={STATE}
```

##### 2. Exchange Code for Token
```http
POST https://services.leadconnectorhq.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}&
code={AUTHORIZATION_CODE}&
redirect_uri={REDIRECT_URI}&
user_type=Location
```

**Response:**
```json
{
  "access_token": "LOCATION_ACCESS_TOKEN",
  "refresh_token": "LOCATION_REFRESH_TOKEN", 
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "contacts.readonly opportunities.readonly",
  "locationId": "LOCATION_ID_123"
}
```

### Service Architecture

#### GoHighLevel Service Layer
```typescript
// Unified Service Interface
export class GoHighLevelService {
  // Agency-level operations (uses API key)
  static async testAgencyToken(token?: string): Promise<TestResult>
  static async getAgencyToken(): Promise<string>
  
  // Client-level operations (uses OAuth tokens)
  static async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<GHLTokenData>
  static async getLocationToken(locationId: string): string | null
  static async getAllLocationTokens(): Promise<Array<{ locationId: string; token: string }>>
  
  // API operations (uses appropriate token)
  static async getLocations(): Promise<GHLLocation[]>
  static async getContacts(locationId: string): Promise<GHLContact[]>
  static async getOpportunities(locationId: string): Promise<GHLOpportunity[]>
}
```

#### Authentication Service
```typescript
export class GoHighLevelAuthService {
  // OAuth Methods
  static getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): string
  static async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<GHLTokenData>
  
  // Token Management (DEPRECATED - Use client OAuth tokens instead)
  static setAgencyToken(token: string): void  // Deprecated
  static async getAgencyToken(): Promise<string>  // Returns first available location token
  
  // Location Token Management
  static setCredentials(accessToken: string, locationId: string): void
  static getLocationToken(locationId: string): string | null
  static async getAllLocationTokens(): Promise<Array<{ locationId: string; token: string }>>
  
  // Token Testing
  static async testAgencyToken(token: string): Promise<TestResult>
}
```

### Database Storage Pattern

#### Integrations Table Structure
```sql
-- GoHighLevel integration records (one per location)
INSERT INTO integrations (platform, connected, account_id, config) VALUES 
('goHighLevel', true, 'LOCATION_ID_123', '{
  "tokens": {
    "accessToken": "encrypted_location_token",
    "refreshToken": "encrypted_refresh_token", 
    "expiresAt": "2025-10-18T05:00:00.000Z",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "scope": "contacts.readonly opportunities.readonly"
  },
  "locationId": "LOCATION_ID_123",
  "userType": "Location",
  "accountInfo": {
    "id": "LOCATION_ID_123",
    "name": "Client Business Location"
  },
  "connectedAt": "2025-10-17T05:00:00.000Z"
}');
```

### Key Implementation Details

#### 1. Agency vs Client Token Usage
```typescript
// Agency operations (uses environment API key)
const agencyToken = process.env.VITE_GHL_API_KEY;

// Client operations (uses OAuth tokens from database)
const locationTokens = await GoHighLevelAuthService.getAllLocationTokens();
const locationToken = GoHighLevelAuthService.getLocationToken(locationId);
```

#### 2. Token Fallback Strategy
```typescript
static async getAgencyToken(): Promise<string> {
  // Get the first available location token instead of agency token
  const locationTokens = await this.getAllLocationTokens();
  if (locationTokens.length === 0) {
    throw new Error('No GoHighLevel location tokens available');
  }
  
  // Return the first available token
  const firstToken = locationTokens[0];
  debugLogger.info('GoHighLevelAuthService', 'Using location token as agency token', { 
    locationId: firstToken.locationId 
  });
  return firstToken.token;
}
```

#### 3. Location-Specific API Calls
```typescript
// All API calls require location-specific tokens
static async getContacts(locationId: string): Promise<GHLContact[]> {
  const accessToken = this.getLocationToken(locationId);
  if (!accessToken) {
    throw new Error(`No access token available for location ${locationId}`);
  }
  
  const response = await fetch(`${this.API_BASE_URL}/contacts/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Version': this.API_VERSION
    }
  });
  
  return response.json();
}
```

### Core API Endpoints

#### 1. Get Locations (Agency-level)
```http
GET https://services.leadconnectorhq.com/locations/
Authorization: Bearer {AGENCY_API_KEY}
Version: 2021-04-15
```

**Response:**
```json
{
  "locations": [
    {
      "id": "location_id_123",
      "name": "My Business Location",
      "address1": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "phone": "+1234567890",
      "website": "https://example.com",
      "timezone": "America/New_York"
    }
  ]
}
```

#### 2. Get Contacts (Location-specific)
```http
GET https://services.leadconnectorhq.com/contacts/
Authorization: Bearer {LOCATION_ACCESS_TOKEN}
Version: 2021-04-15
```

**Response:**
```json
{
  "contacts": [
    {
      "id": "contact_id_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "source": "Facebook Ads",
      "dateAdded": "2024-01-15T10:30:00Z",
      "customFields": {
        "utm_source": "facebook",
        "utm_campaign": "summer_sale",
        "utm_medium": "cpc"
      }
    }
  ]
}
```

#### 3. Get Opportunities (Location-specific)
```http
GET https://services.leadconnectorhq.com/opportunities/
Authorization: Bearer {LOCATION_ACCESS_TOKEN}
Version: 2021-04-15
```

**Response:**
```json
{
  "opportunities": [
    {
      "id": "opp_id_123",
      "contactId": "contact_id_123",
      "title": "Website Redesign",
      "value": 5000.00,
      "status": "won",
      "source": "Facebook Ads",
      "campaign": "summer_sale",
      "createdAt": "2024-01-15T10:30:00Z",
      "closedAt": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### GoHighLevel Data Structures

#### Location Response
```json
{
  "id": "string",
  "name": "string",
  "address1": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "phone": "string",
  "website": "string",
  "timezone": "string"
}
```

#### Contact Response
```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "source": "string",
  "dateAdded": "string",
  "customFields": {
    "utm_source": "string",
    "utm_campaign": "string",
    "utm_medium": "string",
    "utm_term": "string",
    "utm_content": "string",
    "gclid": "string",
    "fbclid": "string",
    "landing_page": "string"
  }
}
```

#### Opportunity Response
```json
{
  "id": "string",
  "contactId": "string",
  "title": "string",
  "value": "number",
  "status": "open|won|lost",
  "source": "string",
  "campaign": "string",
  "createdAt": "string",
  "closedAt": "string"
}
```

### Common GoHighLevel Problems & Solutions

#### Problem 1: OAuth Flow Issues
**Symptoms:** Redirect not working, token exchange failing

**Solution:**
```typescript
// Proper OAuth flow implementation
const handleGHLConnect = async () => {
  const authUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=contacts.readonly opportunities.readonly&access_type=offline&prompt=consent&state=${state}`;
  window.location.href = authUrl;
};
```

#### Problem 2: Location Access Issues
**Symptoms:** Cannot access location data after OAuth

**Solution:**
```typescript
// Ensure proper scope in OAuth request
const scope = 'contacts.readonly opportunities.readonly';
```

#### Problem 3: Token Management Issues
**Symptoms:** Tokens not persisting, location-specific calls failing

**Solution:**
```typescript
// Proper token storage and retrieval
static async storeLocationToken(locationId: string, tokenData: GHLTokenData): Promise<void> {
  await UnifiedIntegrationService.saveOAuthTokens('goHighLevel', {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    tokenType: 'Bearer',
    scope: tokenData.scope
  }, {
    id: locationId,
    name: `GHL Location ${locationId}`
  });
}
```

#### Problem 4: Agency vs Client Token Confusion
**Symptoms:** Using wrong token type for API calls

**Solution:**
```typescript
// Clear separation of agency vs client operations
class GoHighLevelService {
  // Agency operations (uses API key from environment)
  static async getAgencyLocations(): Promise<GHLLocation[]> {
    const apiKey = process.env.VITE_GHL_API_KEY;
    // Use API key for agency-level operations
  }
  
  // Client operations (uses OAuth tokens from database)
  static async getClientContacts(locationId: string): Promise<GHLContact[]> {
    const locationToken = this.getLocationToken(locationId);
    // Use OAuth token for client-specific operations
  }
}
```

---

---

## Google Sheets Integration ✅ PRODUCTION READY

### Base Configuration
- **API Version**: `v4`
- **Base URL**: `https://sheets.googleapis.com/v4/spreadsheets`
- **Authentication**: OAuth 2.0 (Agency Level)
- **Status**: ✅ **WORKING** - Successfully retrieving and processing data

### Data Flow Architecture

#### Client Configuration Storage
Google Sheets configuration uses a **hybrid structure**:

1. **Agency Level**: OAuth tokens stored in `integrations` table (steve@tulenagency.com has access to all client sheets)
2. **Client Level**: Sheet selection stored in `clients.accounts.googleSheetsConfig` AND extracted to top-level `clients.googleSheetsConfig`

#### Database Schema
```sql
-- clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  accounts JSONB DEFAULT '{}',  -- Contains googleSheetsConfig
  googleSheetsConfig JSONB,     -- Extracted to top-level for frontend
  -- ... other fields
);

-- accounts JSONB structure
{
  "googleSheetsConfig": {
    "spreadsheetId": "1ABC...",
    "sheetName": "Sheet1",
    "spreadsheetName": "My Report"
  }
}
```

#### Frontend Data Flow
**Critical**: Both HomePage and Admin Panel must receive the **complete client data structure**:

```typescript
// ✅ CORRECT - Full client data
const client = {
  id: "uuid",
  name: "Client Name",
  accounts: {
    googleSheetsConfig: { spreadsheetId: "...", sheetName: "..." }
  },
  googleSheetsConfig: { spreadsheetId: "...", sheetName: "..." } // Top-level copy
};

// ❌ WRONG - Missing googleSheetsConfig field
const client = {
  id: "uuid", 
  name: "Client Name",
  accounts: { /* missing googleSheetsConfig */ }
};
```

#### Component Display Logic
Both components use identical logic for Google Sheets connection status:

```typescript
// HomePage.tsx & ClientManagementTab.tsx
<div className={`flex items-center ${client.googleSheetsConfig ? 'opacity-100' : 'opacity-40'}`}>
  <LogoManager platform="googleSheets" />
</div>
```

#### Data Service Pattern
```typescript
// DatabaseService.getClients() extracts googleSheetsConfig to top-level
const processedClients = clients.map(client => {
  if (client.accounts?.googleSheetsConfig) {
    client.googleSheetsConfig = client.accounts.googleSheetsConfig;
  }
  return client;
});
```

### Authentication Flow

#### 1. OAuth Authorization URL
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=https://www.googleapis.com/auth/spreadsheets&
  response_type=code&
  access_type=offline&
  prompt=consent
```

### Core API Endpoints ✅ WORKING

#### 1. Get Spreadsheets (Google Drive API)
```http
GET https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'
Authorization: Bearer {ACCESS_TOKEN}
```

#### 2. Get Sheet Names
```http
GET https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}
Authorization: Bearer {ACCESS_TOKEN}
```

#### 3. Get Sheet Values ✅ **RECOMMENDED - Uses batchGet**
```http
GET https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values:batchGet?ranges={RANGE}
Authorization: Bearer {ACCESS_TOKEN}
```

**✅ Working Response Format:**
```json
{
  "valueRanges": [
    {
      "range": "Event Leads!A1:Z100",
      "values": [
        ["DATE SUBMITTED", "CONTACT ID", "SOURCE", "NAME", "EMAIL", "TYPE OF EVENT", "# GUESTS", "REPLIED", "CALL BOOKED", "TOUR BOOKED"],
        ["8/27/2025", "oj3M60mqWsCvYLFucEaS", "Facebook Ads", "Carby Carbajal", "priscilla.carbajal@yahoo.com", "Wedding", "150", "Yes", "Yes", "No"]
      ]
    }
  ]
}
```

**⚠️ Critical Note:** The `/values/{RANGE}` endpoint consistently returns 404 errors. **Always use `/values:batchGet`** for reliable data access.

#### 4. Update Sheet Values (Via Supabase Edge Function)
```http
POST https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/google-sheets-data
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json

{
  "spreadsheetId": "1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc",
  "range": "Event Leads!A1:Z100",
  "values": [["New", "Data", "Row"]],
  "operation": "update"
}
```

#### 3. Update Sheet Values
```http
PUT https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}?valueInputOption=USER_ENTERED
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "values": [
    ["Header 1", "Header 2", "Header 3"],
    ["Value 1", "Value 2", "Value 3"]
  ]
}
```

### Supabase Edge Function Implementation ✅ WORKING

#### Edge Function: `google-sheets-data`

**✅ Working Endpoint:** `https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/google-sheets-data`

**Request Format:**
```json
{
  "spreadsheetId": "1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc",
  "range": "Event Leads!A1:Z100",
  "operation": "read"
}
```

**✅ Working Response Format:**
```json
{
  "success": true,
  "data": {
    "values": [
      ["DATE SUBMITTED", "CONTACT ID", "SOURCE", "NAME", "EMAIL", "TYPE OF EVENT", "# GUESTS", "REPLIED", "CALL BOOKED", "TOUR BOOKED"],
      ["8/27/2025", "oj3M60mqWsCvYLFucEaS", "Facebook Ads", "Carby Carbajal", "priscilla.carbajal@yahoo.com", "Wedding", "150", "Yes", "Yes", "No"],
      ["8/28/2025", "abc123def456", "Google Ads", "John Smith", "john@example.com", "Corporate Event", "75", "No", "No", "Yes"]
    ]
  },
  "metadata": {
    "spreadsheetId": "1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc",
    "range": "Event Leads!A1:Z100",
    "rowCount": 3,
    "columnCount": 10,
    "timestamp": "2025-10-17T13:25:07.546Z"
  }
}
```

#### ✅ Key Implementation Details - PRODUCTION READY

**🔧 Working Solution:**
- ✅ Uses `/values:batchGet` endpoint (fixes 404 errors from `/values/{RANGE}`)
- ✅ Automatic token refresh with 5-minute expiry buffer
- ✅ OAuth credentials retrieved from `oauth_credentials` table
- ✅ CORS-free server-side proxy for all operations
- ✅ Handles private spreadsheets with agency-level access (steve@tulenagency.com)
- ✅ Smart header detection using 'type' and 'guest' keywords

**🔧 Technical Fixes Applied:**
1. **API Endpoint**: Changed from `/values/{RANGE}` to `/values:batchGet?ranges={RANGE}` ✅
2. **Token Management**: Explicit refresh logic with expiry detection ✅
3. **Credential Storage**: OAuth credentials from database, not environment variables ✅
4. **Error Handling**: Proper 404 handling and token expiration detection ✅
5. **Header Detection**: Case-insensitive 'type' and 'guest' keyword matching ✅

### Google Sheets Data Structures

#### Spreadsheet Response
```json
{
  "spreadsheetId": "string",
  "properties": {
    "title": "My Spreadsheet",
    "locale": "en_US",
    "timeZone": "America/New_York"
  },
  "sheets": [
    {
      "properties": {
        "sheetId": 0,
        "title": "Sheet1",
        "gridProperties": {
          "rowCount": 1000,
          "columnCount": 26
        }
      }
    }
  ]
}
```

#### Lead Data Format (Production Example)
```json
{
  "values": [
    ["Date", "Contact ID", "Source", "Name", "Email"],
    ["8/27/2025", "oj3M60mqWsCvYLFucEaS", "Facebook Ads", "Carby Carbajal", "priscilla.carbajal@yahoo.com"],
    ["9/1/2025", "tEpt6UB1tTU4RCuJVc04", "Facebook Ads", "Pragna Dave", "pragna.prahalad@gmail.com"]
  ]
}
```

### Troubleshooting Google Sheets Integration

#### Common Issues and Solutions

**❌ Problem: 404 Not Found Error**
```
Google Sheets API error: 404 Not Found
```

**✅ Solution:** Use `/values:batchGet` endpoint instead of `/values/{RANGE}`
```javascript
// ❌ WRONG - Returns 404
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

// ✅ CORRECT - Works reliably
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${range}`;
```

**❌ Problem: Token Expired Error**
```
Google Sheets refresh token expired. Please re-authenticate.
```

**✅ Solution:** Implement automatic token refresh with expiry buffer
```javascript
const tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
const isTokenExpired = !accessToken || (expiresAt && (Date.now() >= (new Date(expiresAt).getTime() - tokenExpiryBuffer)));
```

**❌ Problem: CORS Errors in Browser**
```
Access to fetch at 'https://sheets.googleapis.com/v4/spreadsheets/...' from origin '...' has been blocked by CORS policy
```

**✅ Solution:** Use Supabase Edge Function as server-side proxy
```javascript
// Route all Google Sheets operations through Edge Function
const response = await fetch(`${API_BASE_URL}/google-sheets-data`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ spreadsheetId, range, operation: 'read' })
});
```

**❌ Problem: Private Spreadsheet Access**
```
Google Sheets API error: 404 Not Found (for private spreadsheets)
```

**✅ Solution:** Ensure agency OAuth account has access to client spreadsheets
- Agency account (`steve@tulenagency.com`) must have access to all client spreadsheets
- Client-level configuration only stores spreadsheet/sheet selection
- OAuth tokens are agency-level, not client-level

#### ✅ Current Production Status - WORKING

**🎯 Live Integration Status:**
- ✅ **Data Retrieval**: Successfully fetching real data from private spreadsheets
- ✅ **Header Detection**: Smart detection using 'type' and 'guest' keywords (case-insensitive)
- ✅ **Token Management**: Automatic refresh with 5-minute expiry buffer
- ✅ **Agency Access**: steve@tulenagency.com has access to all client sheets
- ✅ **Chart Display**: Event Types (top 6) and Guest Count charts working in Lead Info tab
- ✅ **Error Handling**: Comprehensive error handling and user feedback

**📊 Live Data Example:**
```json
{
  "headers": ["DATE SUBMITTED", "CONTACT ID", "SOURCE", "NAME", "EMAIL", "TYPE OF EVENT", "# GUESTS"],
  "detectedColumns": {
    "eventType": 5,  // "TYPE OF EVENT" 
    "guestCount": 6  // "# GUESTS"
  },
  "sampleData": [
    ["8/27/2025", "oj3M60mqWsCvYLFucEaS", "Facebook Ads", "Carby Carbajal", "priscilla.carbajal@yahoo.com", "Wedding", "150"],
    ["8/28/2025", "abc123def456", "Google Ads", "John Smith", "john@example.com", "Corporate Event", "75"]
  ]
}
```

**🔧 Technical Implementation:**
- **Edge Function**: `https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/google-sheets-data`
- **API Endpoint**: `/values:batchGet` (fixes 404 errors)
- **Token Storage**: `oauth_credentials` table in Supabase database
- **Header Mapping**: Dynamic detection using `h.includes('type')` and `h.includes('guest')`
- **Chart Components**: `EventTypesBreakdown` and `GuestCountDistribution` in Lead Info tab

---

## Analytics Data Endpoints

### Facebook Ads Analytics

#### 1. Campaign Performance Data
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,cpp&
  date_preset=last_30d&
  level=campaign&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "campaign_id": "123456789",
      "campaign_name": "Summer Sale Campaign",
      "impressions": "125000",
      "clicks": "2500",
      "spend": "1250.50",
      "reach": "98000",
      "frequency": "1.28",
      "cpm": "10.00",
      "cpc": "0.50",
      "ctr": "2.00",
      "cpp": "1.28"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MTIzNDU2Nzg5"
    }
  }
}
```

#### 2. Ad Set Performance Data
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=adset_id,adset_name,impressions,clicks,spend,conversions&
  date_preset=last_7d&
  level=adset&
  access_token={ACCESS_TOKEN}
```

#### 3. Conversion Tracking
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=campaign_id,campaign_name,conversions,conversion_values&
  action_breakdowns=action_type&
  date_preset=last_30d&
  level=campaign&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "campaign_id": "123456789",
      "campaign_name": "Lead Generation",
      "conversions": "150",
      "conversion_values": "7500.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "150"
        },
        {
          "action_type": "purchase",
          "value": "25"
        }
      ]
    }
  ]
}
```

#### 4. Demographics Breakdown (Age & Gender)
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=impressions,clicks,spend,actions&
  breakdowns=age,gender&
  date_preset=last_30d&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "age": "25-34",
      "gender": "female",
      "impressions": "50000",
      "clicks": "1000",
      "spend": "500.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "50"
        }
      ]
    },
    {
      "age": "35-44",
      "gender": "male",
      "impressions": "30000",
      "clicks": "600",
      "spend": "300.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "30"
        }
      ]
    }
  ]
}
```

#### 5. Platform Breakdown (Facebook vs Instagram)
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=impressions,clicks,spend,actions&
  breakdowns=publisher_platform&
  date_preset=last_30d&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "publisher_platform": "facebook",
      "impressions": "80000",
      "clicks": "1600",
      "spend": "800.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "80"
        }
      ]
    },
    {
      "publisher_platform": "instagram",
      "impressions": "45000",
      "clicks": "900",
      "spend": "450.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "45"
        }
      ]
    }
  ]
}
```

#### 6. Ad Placement Breakdown (Feed, Stories, Reels) - **WORKING SOLUTION**
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=spend,impressions,clicks,actions&
  breakdowns=platform_position&
  date_preset=last_30d&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "platform_position": "feed",
      "impressions": "60000",
      "clicks": "1200",
      "spend": "600.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "60"
        }
      ]
    },
    {
      "platform_position": "instagram_stories",
      "impressions": "30000",
      "clicks": "600",
      "spend": "300.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "30"
        }
      ]
    },
    {
      "platform_position": "instagram_reels",
      "impressions": "35000",
      "clicks": "700",
      "spend": "350.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "35"
        }
      ]
    }
  ]
}
```

**Key Implementation Details:**
- **Breakdown Parameter**: Use `platform_position` instead of deprecated `placement`
- **Percentage Calculation**: Calculate percentages based on spend (not leads) for more meaningful ad placement analysis
- **Platform Position Mapping**: Map Facebook API values to user-friendly categories:
  - `feed`, `facebook_feed`, `instagram_feed` → Feed
  - `instagram_stories`, `facebook_story` → Stories  
  - `instagram_reels`, `facebook_reels` → Reels
- **Fallback Mapping**: Map other placements to closest equivalent (e.g., `marketplace` → Feed, `video_feeds` → Reels)

#### 7. Creative Breakdown (Image, Video, Carousel)
```http
GET https://graph.facebook.com/v22.0/{AD_ACCOUNT_ID}/insights?
  fields=impressions,clicks,spend,actions&
  breakdowns=ad_format_asset&
  date_preset=last_30d&
  access_token={ACCESS_TOKEN}
```

**Response:**
```json
{
  "data": [
    {
      "media_format": "image",
      "impressions": "70000",
      "clicks": "1400",
      "spend": "700.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "70"
        }
      ]
    },
    {
      "media_format": "video",
      "impressions": "55000",
      "clicks": "1100",
      "spend": "550.00",
      "actions": [
        {
          "action_type": "lead",
          "value": "55"
        }
      ]
    }
  ]
}
```

### Google Ads Analytics

#### 1. Campaign Performance Data
```http
POST https://googleads.googleapis.com/v21/customers/{CUSTOMER_ID}/googleAds:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date BETWEEN '2024-01-01' AND '2024-01-31'"
}
```

**Response:**
```json
{
  "results": [
    {
      "campaign": {
        "id": "123456789",
        "name": "Brand Awareness Campaign"
      },
      "metrics": {
        "impressions": "500000",
        "clicks": "10000",
        "costMicros": "50000000",
        "ctr": "2.0",
        "averageCpc": "5000000"
      },
      "segments": {
        "date": "2024-01-15"
      }
    }
  ]
}
```

#### 2. Conversion Tracking
```http
POST https://googleads.googleapis.com/v21/customers/{CUSTOMER_ID}/googleAds:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT campaign.id, campaign.name, metrics.conversions, metrics.conversions_value, metrics.cost_per_conversion FROM campaign WHERE segments.date BETWEEN '2024-01-01' AND '2024-01-31'"
}
```

#### 3. Keyword Performance
```http
POST https://googleads.googleapis.com/v21/customers/{CUSTOMER_ID}/googleAds:searchStream
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "query": "SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.impressions, metrics.clicks, metrics.cost_micros FROM keyword_view WHERE segments.date BETWEEN '2024-01-01' AND '2024-01-31'"
}
```

### GoHighLevel CRM Analytics

#### 1. Lead Analytics
```http
GET https://services.leadconnectorhq.com/contacts/analytics?
  startDate=2024-01-01&
  endDate=2024-01-31&
  groupBy=source&
  Authorization: Bearer {ACCESS_TOKEN}
```

**Response:**
```json
{
  "analytics": {
    "totalContacts": 1250,
    "newContacts": 450,
    "convertedContacts": 125,
    "conversionRate": "10.0",
    "sources": [
      {
        "source": "Facebook Ads",
        "contacts": 300,
        "conversions": 35,
        "conversionRate": "11.7"
      },
      {
        "source": "Google Ads",
        "contacts": 250,
        "conversions": 28,
        "conversionRate": "11.2"
      }
    ]
  }
}
```

#### 2. Opportunity Analytics
```http
GET https://services.leadconnectorhq.com/opportunities/analytics?
  startDate=2024-01-01&
  endDate=2024-01-31&
  status=won&
  Authorization: Bearer {ACCESS_TOKEN}
```

#### 3. Revenue Analytics
```http
GET https://services.leadconnectorhq.com/opportunities/revenue?
  startDate=2024-01-01&
  endDate=2024-01-31&
  groupBy=month&
  Authorization: Bearer {ACCESS_TOKEN}
```

---

## CRM Data Integration

### Lead Attribution Tracking

#### 1. UTM Parameter Tracking
```typescript
interface LeadAttribution {
  utm_source: string;      // facebook, google, organic
  utm_medium: string;      // cpc, social, email
  utm_campaign: string;    // campaign_name
  utm_term: string;        // keyword (for search)
  utm_content: string;     // ad_content
  gclid?: string;         // Google Click ID
  fbclid?: string;        // Facebook Click ID
  landing_page: string;    // URL where lead was captured
  timestamp: string;       // ISO 8601 timestamp
}

// Example lead capture with attribution
const captureLead = async (leadData: LeadData, attribution: LeadAttribution) => {
  const enrichedLead = {
    ...leadData,
    attribution: {
      source: attribution.utm_source,
      medium: attribution.utm_medium,
      campaign: attribution.utm_campaign,
      keyword: attribution.utm_term,
      content: attribution.utm_content,
      landingPage: attribution.landing_page,
      capturedAt: attribution.timestamp
    }
  };

  // Store in CRM
  await goHighLevelService.createContact(enrichedLead);
  
  // Track conversion in ad platforms
  await trackConversion(attribution);
};
```

#### 2. Cross-Platform Conversion Tracking
```typescript
class ConversionTracker {
  async trackFacebookConversion(attribution: LeadAttribution, conversionValue: number) {
    if (attribution.fbclid) {
      await fetch(`https://graph.facebook.com/v22.0/${FACEBOOK_PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {
              client_ip_address: attribution.client_ip,
              client_user_agent: attribution.user_agent
            },
            custom_data: {
              value: conversionValue,
              currency: 'USD'
            },
            event_source_url: attribution.landing_page,
            action_source: 'website'
          }],
          access_token: FACEBOOK_ACCESS_TOKEN
        })
      });
    }
  }

  async trackGoogleConversion(attribution: LeadAttribution, conversionValue: number) {
    if (attribution.gclid) {
      await fetch(`https://googleads.googleapis.com/v21/customers/${CUSTOMER_ID}/conversionUploads:uploadClickConversions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOOGLE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversions: [{
            gclid: attribution.gclid,
            conversionAction: `customers/${CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
            conversionDateTime: attribution.timestamp,
            conversionValue: conversionValue,
            currencyCode: 'USD'
          }]
        })
      });
    }
  }
}
```

### CRM Data Synchronization

#### 1. Contact Sync from CRM to Analytics
```typescript
class CRMSyncService {
  async syncContactsToAnalytics() {
    // Get contacts from GoHighLevel
    const contacts = await goHighLevelService.getContacts({
      startDate: this.getLastSyncDate(),
      limit: 1000
    });

    // Process each contact
    for (const contact of contacts) {
      // Extract attribution data
      const attribution = this.extractAttribution(contact);
      
      // Update analytics platforms
      await this.updateAnalyticsData(contact, attribution);
      
      // Update internal tracking
      await this.updateInternalTracking(contact, attribution);
    }

    // Update last sync timestamp
    await this.updateLastSyncDate();
  }

  private extractAttribution(contact: any): LeadAttribution {
    return {
      utm_source: contact.customFields?.utm_source || 'unknown',
      utm_medium: contact.customFields?.utm_medium || 'unknown',
      utm_campaign: contact.customFields?.utm_campaign || 'unknown',
      utm_term: contact.customFields?.utm_term || '',
      utm_content: contact.customFields?.utm_content || '',
      gclid: contact.customFields?.gclid,
      fbclid: contact.customFields?.fbclid,
      landing_page: contact.customFields?.landing_page || '',
      timestamp: contact.dateAdded
    };
  }
}
```

#### 2. Opportunity Revenue Tracking
```typescript
interface OpportunityData {
  id: string;
  contactId: string;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  source: string;
  campaign: string;
  createdAt: string;
  closedAt?: string;
}

class RevenueTracker {
  async trackOpportunityRevenue(opportunity: OpportunityData) {
    if (opportunity.status === 'won') {
      // Get contact attribution
      const contact = await goHighLevelService.getContact(opportunity.contactId);
      const attribution = this.extractAttribution(contact);

      // Track revenue in ad platforms
      await this.trackFacebookRevenue(attribution, opportunity.value);
      await this.trackGoogleRevenue(attribution, opportunity.value);

      // Update internal revenue tracking
      await this.updateRevenueAnalytics(opportunity, attribution);
    }
  }

  private async trackFacebookRevenue(attribution: LeadAttribution, value: number) {
    if (attribution.fbclid) {
      await fetch(`https://graph.facebook.com/v22.0/${FACEBOOK_PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            custom_data: {
              value: value,
              currency: 'USD'
            },
            event_source_url: attribution.landing_page
          }],
          access_token: FACEBOOK_ACCESS_TOKEN
        })
      });
    }
  }
}
```

---

## Reporting & Dashboard APIs

### Dashboard Data Aggregation

#### 1. Multi-Platform Campaign Summary
```typescript
interface CampaignSummary {
  platform: 'facebook' | 'google' | 'combined';
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  averageCpc: number;
  averageCpm: number;
  conversionRate: number;
  roas: number; // Return on Ad Spend
  campaigns: CampaignData[];
}

class DashboardService {
  async getCampaignSummary(dateRange: DateRange): Promise<CampaignSummary> {
    const [facebookData, googleData, crmData] = await Promise.all([
      this.getFacebookCampaignData(dateRange),
      this.getGoogleCampaignData(dateRange),
      this.getCRMRevenueData(dateRange)
    ]);

    return {
      platform: 'combined',
      totalSpend: facebookData.spend + googleData.spend,
      totalImpressions: facebookData.impressions + googleData.impressions,
      totalClicks: facebookData.clicks + googleData.clicks,
      totalConversions: facebookData.conversions + googleData.conversions,
      totalRevenue: crmData.revenue,
      averageCpc: this.calculateAverageCpc(facebookData, googleData),
      averageCpm: this.calculateAverageCpm(facebookData, googleData),
      conversionRate: this.calculateConversionRate(facebookData, googleData),
      roas: crmData.revenue / (facebookData.spend + googleData.spend),
      campaigns: [...facebookData.campaigns, ...googleData.campaigns]
    };
  }
}
```

#### 2. Lead Attribution Report
```typescript
interface AttributionReport {
  source: string;
  medium: string;
  campaign: string;
  leads: number;
  conversions: number;
  revenue: number;
  cost: number;
  roas: number;
  conversionRate: number;
}

class AttributionService {
  async getAttributionReport(dateRange: DateRange): Promise<AttributionReport[]> {
    // Get leads from CRM
    const leads = await goHighLevelService.getContacts({
      startDate: dateRange.start,
      endDate: dateRange.end
    });

    // Get ad spend data
    const adSpend = await this.getAdSpendBySource(dateRange);

    // Group by attribution
    const attributionGroups = this.groupByAttribution(leads);

    // Calculate metrics
    return attributionGroups.map(group => ({
      source: group.source,
      medium: group.medium,
      campaign: group.campaign,
      leads: group.leads.length,
      conversions: group.conversions,
      revenue: group.revenue,
      cost: adSpend[group.source] || 0,
      roas: group.revenue / (adSpend[group.source] || 1),
      conversionRate: group.conversions / group.leads.length
    }));
  }
}
```

#### 3. Real-Time Performance Monitoring
```typescript
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  async updateMetrics(campaignId: string, platform: string) {
    const metrics = await this.fetchCampaignMetrics(campaignId, platform);
    this.metrics.set(`${platform}_${campaignId}`, metrics);

    // Check for performance alerts
    await this.checkPerformanceAlerts(metrics);
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics) {
    const alerts = [];

    // High CPC alert
    if (metrics.cpc > metrics.budgetCpc * 1.5) {
      alerts.push({
        type: 'high_cpc',
        message: `CPC is ${metrics.cpc} (${((metrics.cpc / metrics.budgetCpc - 1) * 100).toFixed(1)}% above budget)`,
        severity: 'warning'
      });
    }

    // Low conversion rate alert
    if (metrics.conversionRate < metrics.targetConversionRate * 0.5) {
      alerts.push({
        type: 'low_conversion',
        message: `Conversion rate is ${metrics.conversionRate}% (${((metrics.conversionRate / metrics.targetConversionRate - 1) * 100).toFixed(1)}% below target)`,
        severity: 'critical'
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }
}
```

### Data Export APIs

#### 1. Google Sheets Export
```typescript
class SheetsExportService {
  async exportCampaignData(campaignData: CampaignData[], spreadsheetId: string) {
    const values = [
      ['Campaign', 'Platform', 'Spend', 'Impressions', 'Clicks', 'Conversions', 'Revenue', 'ROAS'],
      ...campaignData.map(campaign => [
        campaign.name,
        campaign.platform,
        campaign.spend,
        campaign.impressions,
        campaign.clicks,
        campaign.conversions,
        campaign.revenue,
        campaign.roas
      ])
    ];

    await sheetsService.updateValues(spreadsheetId, 'A1:H1000', values);
  }

  async exportAttributionReport(attributionData: AttributionReport[], spreadsheetId: string) {
    const values = [
      ['Source', 'Medium', 'Campaign', 'Leads', 'Conversions', 'Revenue', 'Cost', 'ROAS', 'Conversion Rate'],
      ...attributionData.map(item => [
        item.source,
        item.medium,
        item.campaign,
        item.leads,
        item.conversions,
        item.revenue,
        item.cost,
        item.roas,
        item.conversionRate
      ])
    ];

    await sheetsService.updateValues(spreadsheetId, 'A1:I1000', values);
  }
}
```

#### 2. CSV Export
```typescript
class CSVExportService {
  exportCampaignData(campaignData: CampaignData[]): string {
    const headers = ['Campaign', 'Platform', 'Spend', 'Impressions', 'Clicks', 'Conversions', 'Revenue', 'ROAS'];
    const rows = campaignData.map(campaign => [
      campaign.name,
      campaign.platform,
      campaign.spend,
      campaign.impressions,
      campaign.clicks,
      campaign.conversions,
      campaign.revenue,
      campaign.roas
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  private arrayToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}
```

---

## Common Problems & Solutions

### Authentication Issues

#### Problem: Token Expiration
**Symptoms:** API calls returning 401 Unauthorized

**Solutions:**
1. **Automatic Token Refresh:**
```typescript
private async ensureValidToken(): Promise<string> {
  if (this.isTokenExpired()) {
    return await this.refreshAccessToken();
  }
  return this.accessToken;
}
```

2. **Token Storage:**
```typescript
// Store tokens securely
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', refreshToken);
localStorage.setItem('token_expires_at', expiresAt.toString());
```

#### Problem: Scope Insufficient
**Symptoms:** API calls returning 403 Forbidden

**Solution:**
```typescript
// Ensure all required scopes
const requiredScopes = [
  'ads_read',
  'ads_management', 
  'business_management',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/spreadsheets'
];
```

### Google Sheets Data Flow Issues

#### Problem: Google Sheets Connection Status Not Displaying
**Symptoms:** 
- Google Sheets icon shows as disconnected (faded) on HomePage
- Google Sheets icon shows as connected on Admin Panel
- Same client data displays differently across components

**Root Cause:** Inconsistent data structure between components

**Solution:**
1. **Ensure Complete Data Structure in HomePageWrapper:**
```typescript
// ✅ CORRECT - Include ALL client fields
const transformedClients: Client[] = (clientsData || []).map(client => ({
  id: client.id,
  name: client.name,
  type: client.type,
  status: client.status,
  location: client.location,
  logo_url: client.logo_url,
  services: client.services,
  accounts: {
    facebookAds: client.accounts?.facebookAds,
    googleAds: client.accounts?.googleAds,
    goHighLevel: client.accounts?.goHighLevel,
    googleSheets: client.accounts?.googleSheets,
    googleSheetsConfig: client.accounts?.googleSheetsConfig
  },
  conversion_actions: client.conversion_actions,
  googleSheetsConfig: client.googleSheetsConfig, // Critical: Top-level field
  shareable_link: client.shareable_link,
  created_at: client.created_at,
  updated_at: client.updated_at
}));
```

2. **Verify DatabaseService.getClients() Extraction:**
```typescript
// Ensure googleSheetsConfig is extracted to top-level
const processedClients = clients.map(client => {
  if (client.accounts?.googleSheetsConfig) {
    client.googleSheetsConfig = client.accounts.googleSheetsConfig;
  }
  return client;
});
```

3. **Use Consistent Display Logic:**
```typescript
// Both HomePage and Admin Panel should use identical logic
<div className={`flex items-center ${client.googleSheetsConfig ? 'opacity-100' : 'opacity-40'}`}>
  <LogoManager platform="googleSheets" />
</div>
```

**Debug Steps:**
1. Check browser console for client data structure
2. Verify `client.googleSheetsConfig` exists (not just `client.accounts.googleSheetsConfig`)
3. Compare data structure between HomePage and Admin Panel components

### Rate Limiting Issues

#### Problem: API Rate Limits Exceeded
**Symptoms:** 429 Too Many Requests errors

**Solution:**
```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 100, timeWindow: number = 3600000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

### Data Synchronization Issues

#### Problem: Stale Cached Data
**Symptoms:** Missing new accounts, outdated information

**Solution:**
```typescript
// Cache invalidation strategy
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly ttl: number = 300000; // 5 minutes

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Error Handling Best Practices

#### Comprehensive Error Handling
```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public endpoint: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          // Token expired, refresh and retry
          await refreshToken();
          return await apiCall();
        case 429:
          // Rate limited, wait and retry
          await new Promise(resolve => setTimeout(resolve, 60000));
          return await apiCall();
        case 403:
          // Insufficient permissions
          throw new Error('Insufficient permissions for this operation');
        default:
          throw error;
      }
    }
    throw error;
  }
}
```

---

## Authentication Flows

### OAuth 2.0 Implementation

#### Authorization Code Flow
```typescript
class OAuth2Client {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

### Token Management

#### Secure Token Storage
```typescript
class TokenManager {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static readonly EXPIRES_KEY = 'token_expires_at';

  static saveTokens(tokens: TokenResponse): void {
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    
    localStorage.setItem(this.TOKEN_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh_token);
    localStorage.setItem(this.EXPIRES_KEY, expiresAt.toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  static isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (!expiresAt) return true;
    
    return Date.now() >= parseInt(expiresAt);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.EXPIRES_KEY);
  }
}
```

---

## Rate Limiting & Best Practices

### API Rate Limits

| Service | Limit | Window | Strategy |
|---------|-------|--------|----------|
| Facebook Graph API | 200 calls/hour | Per user | Exponential backoff |
| Google Ads API | 10,000 calls/day | Per developer | Request queuing |
| GoHighLevel API | 1000 calls/hour | Per app | Token bucket |
| Google Sheets API | 100 calls/100s | Per user | Rate limiting |

### Implementation Strategies

#### 1. Exponential Backoff
```typescript
async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && retryCount < maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      throw error;
    }
  }
}
```

#### 2. Request Queuing
```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, this.maxConcurrent);
    
    await Promise.all(batch.map(operation => operation()));
    
    this.processing = false;
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }
}
```

### Best Practices

#### 1. Caching Strategy
```typescript
// Multi-level caching
class CacheStrategy {
  private memoryCache = new Map();
  private localStorageCache = new Map();
  
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<T> {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() - memoryItem.timestamp < ttl) {
      return memoryItem.data;
    }
    
    // Check localStorage cache
    const localItem = localStorage.getItem(key);
    if (localItem) {
      const parsed = JSON.parse(localItem);
      if (Date.now() - parsed.timestamp < ttl) {
        this.memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
    
    // Fetch fresh data
    const data = await fetcher();
    const item = { data, timestamp: Date.now() };
    
    this.memoryCache.set(key, item);
    localStorage.setItem(key, JSON.stringify(item));
    
    return data;
  }
}
```

#### 2. Error Monitoring
```typescript
class ErrorMonitor {
  private errors: Array<{ timestamp: number; error: Error; context: any }> = [];
  
  logError(error: Error, context: any = {}): void {
    this.errors.push({
      timestamp: Date.now(),
      error,
      context
    });
    
    // Send to monitoring service
    this.sendToMonitoring(error, context);
  }
  
  private async sendToMonitoring(error: Error, context: any): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          timestamp: Date.now()
        })
      });
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring:', monitoringError);
    }
  }
}
```

---

## Conclusion

This documentation provides comprehensive coverage of all integration APIs, common problems, and their solutions. The key takeaways are:

1. **Authentication**: Proper OAuth 2.0 implementation with token refresh
2. **Rate Limiting**: Implement exponential backoff and request queuing
3. **Error Handling**: Comprehensive error handling with retry logic
4. **Caching**: Multi-level caching strategy for performance
5. **Monitoring**: Error tracking and API usage monitoring

For the Facebook Ads integration specifically, the critical fix was preventing authentication conflicts in pagination by conditionally adding headers only when URLs don't already contain access tokens.

This ensures reliable, scalable integration with all marketing platforms while maintaining optimal performance and user experience.

---

## Complete Reporting Examples

### 1. Multi-Platform Campaign Performance Report

#### API Endpoint
```http
GET /api/reports/campaign-performance?
  startDate=2024-01-01&
  endDate=2024-01-31&
  platforms=facebook,google&
  groupBy=campaign&
  includeAttribution=true
```

#### Implementation
```typescript
class CampaignPerformanceReport {
  async generateReport(params: ReportParams): Promise<CampaignPerformanceData> {
    const { startDate, endDate, platforms, groupBy, includeAttribution } = params;
    
    // Fetch data from all platforms in parallel
    const [facebookData, googleData, crmData] = await Promise.all([
      this.fetchFacebookCampaignData(startDate, endDate),
      this.fetchGoogleCampaignData(startDate, endDate),
      includeAttribution ? this.fetchCRMAttributionData(startDate, endDate) : null
    ]);

    // Combine and normalize data
    const combinedData = this.combinePlatformData(facebookData, googleData);
    
    // Add attribution data if requested
    if (includeAttribution && crmData) {
      combinedData.forEach(campaign => {
        const attribution = crmData.find(a => a.campaignId === campaign.id);
        if (attribution) {
          campaign.leads = attribution.leads;
          campaign.conversions = attribution.conversions;
          campaign.revenue = attribution.revenue;
          campaign.roas = attribution.revenue / campaign.spend;
        }
      });
    }

    // Group by specified field
    const groupedData = this.groupByField(combinedData, groupBy);
    
    return {
      summary: this.calculateSummary(groupedData),
      campaigns: groupedData,
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      platforms: platforms
    };
  }

  private combinePlatformData(facebook: any[], google: any[]): CampaignData[] {
    const combined = [...facebook, ...google];
    
    // Normalize field names and data types
    return combined.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      spend: parseFloat(campaign.spend),
      impressions: parseInt(campaign.impressions),
      clicks: parseInt(campaign.clicks),
      conversions: parseInt(campaign.conversions || 0),
      ctr: parseFloat(campaign.ctr),
      cpc: parseFloat(campaign.cpc),
      cpm: parseFloat(campaign.cpm),
      conversionRate: parseFloat(campaign.conversionRate || 0)
    }));
  }
}
```

#### Sample Response
```json
{
  "summary": {
    "totalSpend": 15750.50,
    "totalImpressions": 1250000,
    "totalClicks": 25000,
    "totalConversions": 1250,
    "totalRevenue": 62500.00,
    "averageCpc": 0.63,
    "averageCpm": 12.60,
    "overallConversionRate": 5.0,
    "overallRoas": 3.97
  },
  "campaigns": [
    {
      "id": "fb_123456789",
      "name": "Summer Sale Campaign",
      "platform": "facebook",
      "spend": 5250.50,
      "impressions": 500000,
      "clicks": 10000,
      "conversions": 500,
      "revenue": 25000.00,
      "ctr": 2.0,
      "cpc": 0.53,
      "cpm": 10.50,
      "conversionRate": 5.0,
      "roas": 4.76
    },
    {
      "id": "gg_987654321",
      "name": "Brand Awareness Campaign",
      "platform": "google",
      "spend": 10500.00,
      "impressions": 750000,
      "clicks": 15000,
      "conversions": 750,
      "revenue": 37500.00,
      "ctr": 2.0,
      "cpc": 0.70,
      "cpm": 14.00,
      "conversionRate": 5.0,
      "roas": 3.57
    }
  ],
  "generatedAt": "2024-01-31T23:59:59Z",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "platforms": ["facebook", "google"]
}
```

### 2. Lead Attribution Analysis Report

#### API Endpoint
```http
GET /api/reports/lead-attribution?
  startDate=2024-01-01&
  endDate=2024-01-31&
  groupBy=source,medium,campaign&
  includeRevenue=true&
  includeCost=true
```

#### Implementation
```typescript
class LeadAttributionReport {
  async generateReport(params: AttributionReportParams): Promise<AttributionReportData> {
    const { startDate, endDate, groupBy, includeRevenue, includeCost } = params;
    
    // Fetch leads from CRM with attribution data
    const leads = await goHighLevelService.getContacts({
      startDate,
      endDate,
      includeCustomFields: true
    });

    // Fetch ad spend data if requested
    const adSpend = includeCost ? await this.fetchAdSpendByAttribution(startDate, endDate) : null;
    
    // Fetch revenue data if requested
    const revenue = includeRevenue ? await this.fetchRevenueByAttribution(startDate, endDate) : null;

    // Group leads by attribution
    const attributionGroups = this.groupLeadsByAttribution(leads, groupBy);
    
    // Calculate metrics for each group
    const attributionData = attributionGroups.map(group => {
      const groupRevenue = revenue ? revenue[group.key] || 0 : 0;
      const groupCost = adSpend ? adSpend[group.key] || 0 : 0;
      
      return {
        source: group.source,
        medium: group.medium,
        campaign: group.campaign,
        leads: group.leads.length,
        conversions: group.conversions,
        revenue: groupRevenue,
        cost: groupCost,
        conversionRate: group.conversions / group.leads.length,
        roas: groupCost > 0 ? groupRevenue / groupCost : 0,
        costPerLead: groupCost / group.leads.length,
        revenuePerLead: groupRevenue / group.leads.length
      };
    });

    return {
      summary: this.calculateAttributionSummary(attributionData),
      attribution: attributionData,
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate }
    };
  }

  private groupLeadsByAttribution(leads: any[], groupBy: string[]): AttributionGroup[] {
    const groups = new Map<string, AttributionGroup>();
    
    leads.forEach(lead => {
      const key = this.generateAttributionKey(lead, groupBy);
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          source: lead.customFields?.utm_source || 'unknown',
          medium: lead.customFields?.utm_medium || 'unknown',
          campaign: lead.customFields?.utm_campaign || 'unknown',
          leads: [],
          conversions: 0
        });
      }
      
      const group = groups.get(key)!;
      group.leads.push(lead);
      
      // Count conversions (leads with opportunities)
      if (lead.opportunities && lead.opportunities.length > 0) {
        group.conversions += lead.opportunities.filter((opp: any) => opp.status === 'won').length;
      }
    });
    
    return Array.from(groups.values());
  }
}
```

#### Sample Response
```json
{
  "summary": {
    "totalLeads": 1250,
    "totalConversions": 125,
    "totalRevenue": 62500.00,
    "totalCost": 15750.50,
    "overallConversionRate": 10.0,
    "overallRoas": 3.97,
    "topSource": "facebook",
    "topMedium": "cpc",
    "topCampaign": "Summer Sale Campaign"
  },
  "attribution": [
    {
      "source": "facebook",
      "medium": "cpc",
      "campaign": "Summer Sale Campaign",
      "leads": 500,
      "conversions": 50,
      "revenue": 25000.00,
      "cost": 5250.50,
      "conversionRate": 10.0,
      "roas": 4.76,
      "costPerLead": 10.50,
      "revenuePerLead": 50.00
    },
    {
      "source": "google",
      "medium": "cpc",
      "campaign": "Brand Awareness Campaign",
      "leads": 400,
      "conversions": 40,
      "revenue": 20000.00,
      "cost": 7000.00,
      "conversionRate": 10.0,
      "roas": 2.86,
      "costPerLead": 17.50,
      "revenuePerLead": 50.00
    },
    {
      "source": "organic",
      "medium": "search",
      "campaign": "SEO Traffic",
      "leads": 350,
      "conversions": 35,
      "revenue": 17500.00,
      "cost": 0,
      "conversionRate": 10.0,
      "roas": 0,
      "costPerLead": 0,
      "revenuePerLead": 50.00
    }
  ],
  "generatedAt": "2024-01-31T23:59:59Z",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### 3. Real-Time Performance Dashboard

#### API Endpoint
```http
GET /api/dashboard/performance?
  timeRange=last_24h&
  platforms=facebook,google&
  includeAlerts=true
```

#### Implementation
```typescript
class PerformanceDashboard {
  async getDashboardData(params: DashboardParams): Promise<DashboardData> {
    const { timeRange, platforms, includeAlerts } = params;
    
    // Fetch real-time data from all platforms
    const platformData = await Promise.all(
      platforms.map(platform => this.fetchPlatformData(platform, timeRange))
    );

    // Combine platform data
    const combinedData = this.combinePlatformData(platformData);
    
    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(combinedData);
    
    // Generate alerts if requested
    const alerts = includeAlerts ? await this.generatePerformanceAlerts(metrics) : [];
    
    // Get trending data
    const trends = await this.getTrendingData(timeRange);
    
    return {
      metrics,
      alerts,
      trends,
      lastUpdated: new Date().toISOString(),
      timeRange
    };
  }

  private async generatePerformanceAlerts(metrics: PerformanceMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Check for performance issues
    if (metrics.cpc > metrics.budgetCpc * 1.5) {
      alerts.push({
        type: 'high_cpc',
        severity: 'warning',
        message: `CPC is ${metrics.cpc.toFixed(2)} (${((metrics.cpc / metrics.budgetCpc - 1) * 100).toFixed(1)}% above budget)`,
        campaign: metrics.campaignName,
        platform: metrics.platform,
        timestamp: new Date().toISOString()
      });
    }
    
    if (metrics.conversionRate < metrics.targetConversionRate * 0.5) {
      alerts.push({
        type: 'low_conversion',
        severity: 'critical',
        message: `Conversion rate is ${metrics.conversionRate.toFixed(1)}% (${((metrics.conversionRate / metrics.targetConversionRate - 1) * 100).toFixed(1)}% below target)`,
        campaign: metrics.campaignName,
        platform: metrics.platform,
        timestamp: new Date().toISOString()
      });
    }
    
    if (metrics.roas < metrics.targetRoas * 0.7) {
      alerts.push({
        type: 'low_roas',
        severity: 'warning',
        message: `ROAS is ${metrics.roas.toFixed(2)} (${((metrics.roas / metrics.targetRoas - 1) * 100).toFixed(1)}% below target)`,
        campaign: metrics.campaignName,
        platform: metrics.platform,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }
}
```

#### Sample Response
```json
{
  "metrics": {
    "totalSpend": 1250.50,
    "totalImpressions": 125000,
    "totalClicks": 2500,
    "totalConversions": 125,
    "totalRevenue": 6250.00,
    "averageCpc": 0.50,
    "averageCpm": 10.00,
    "conversionRate": 5.0,
    "roas": 5.0,
    "budgetCpc": 0.75,
    "targetConversionRate": 8.0,
    "targetRoas": 4.0
  },
  "alerts": [
    {
      "type": "low_conversion",
      "severity": "warning",
      "message": "Conversion rate is 5.0% (37.5% below target)",
      "campaign": "Summer Sale Campaign",
      "platform": "facebook",
      "timestamp": "2024-01-31T23:59:59Z"
    }
  ],
  "trends": {
    "spend": {
      "current": 1250.50,
      "previous": 1100.25,
      "change": 13.6,
      "direction": "up"
    },
    "conversions": {
      "current": 125,
      "previous": 98,
      "change": 27.6,
      "direction": "up"
    },
    "roas": {
      "current": 5.0,
      "previous": 4.2,
      "change": 19.0,
      "direction": "up"
    }
  },
  "lastUpdated": "2024-01-31T23:59:59Z",
  "timeRange": "last_24h"
}
```

### 4. Custom Report Builder

#### API Endpoint
```http
POST /api/reports/custom
Content-Type: application/json

{
  "name": "Monthly Performance Report",
  "description": "Comprehensive monthly performance analysis",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "platforms": ["facebook", "google"],
  "metrics": ["spend", "impressions", "clicks", "conversions", "revenue", "roas"],
  "groupBy": ["campaign", "platform"],
  "filters": {
    "minSpend": 100,
    "minConversions": 10
  },
  "format": "json",
  "schedule": {
    "frequency": "monthly",
    "dayOfMonth": 1,
    "time": "09:00"
  }
}
```

#### Implementation
```typescript
class CustomReportBuilder {
  async createCustomReport(config: CustomReportConfig): Promise<CustomReport> {
    // Validate configuration
    this.validateReportConfig(config);
    
    // Generate report data
    const reportData = await this.generateReportData(config);
    
    // Apply filters
    const filteredData = this.applyFilters(reportData, config.filters);
    
    // Format data based on requested format
    const formattedData = this.formatReportData(filteredData, config.format);
    
    // Save report configuration for scheduled reports
    if (config.schedule) {
      await this.saveScheduledReport(config);
    }
    
    return {
      id: this.generateReportId(),
      name: config.name,
      description: config.description,
      data: formattedData,
      generatedAt: new Date().toISOString(),
      config: config
    };
  }

  private async generateReportData(config: CustomReportConfig): Promise<any[]> {
    const { platforms, metrics, groupBy, dateRange } = config;
    
    // Fetch data from all specified platforms
    const platformData = await Promise.all(
      platforms.map(platform => this.fetchPlatformMetrics(platform, metrics, dateRange))
    );
    
    // Combine and normalize data
    const combinedData = this.combinePlatformData(platformData);
    
    // Group data by specified fields
    const groupedData = this.groupDataByFields(combinedData, groupBy);
    
    // Calculate derived metrics
    return this.calculateDerivedMetrics(groupedData, metrics);
  }

  private applyFilters(data: any[], filters: ReportFilters): any[] {
    return data.filter(item => {
      // Apply minimum spend filter
      if (filters.minSpend && item.spend < filters.minSpend) {
        return false;
      }
      
      // Apply minimum conversions filter
      if (filters.minConversions && item.conversions < filters.minConversions) {
        return false;
      }
      
      // Apply platform filter
      if (filters.platforms && !filters.platforms.includes(item.platform)) {
        return false;
      }
      
      // Apply campaign name filter
      if (filters.campaignName && !item.name.toLowerCase().includes(filters.campaignName.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }
}
```

### 5. Data Export and Integration Examples

#### Google Sheets Integration
```typescript
class SheetsIntegration {
  async exportReportToSheets(reportData: any, spreadsheetId: string, sheetName: string): Promise<void> {
    // Prepare data for Google Sheets
    const values = this.prepareDataForSheets(reportData);
    
    // Update Google Sheets
    await sheetsService.updateValues(spreadsheetId, `${sheetName}!A1:Z1000`, values);
    
    // Add formatting
    await this.applySheetFormatting(spreadsheetId, sheetName, values.length);
  }

  private prepareDataForSheets(data: any[]): any[][] {
    if (data.length === 0) return [];
    
    // Get headers from first item
    const headers = Object.keys(data[0]);
    
    // Convert data to 2D array
    const rows = data.map(item => headers.map(header => item[header]));
    
    return [headers, ...rows];
  }

  private async applySheetFormatting(spreadsheetId: string, sheetName: string, rowCount: number): Promise<void> {
    // Format headers
    await sheetsService.formatRange(spreadsheetId, `${sheetName}!A1:Z1`, {
      backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
    });
    
    // Format currency columns
    await sheetsService.formatRange(spreadsheetId, `${sheetName}!C2:C${rowCount}`, {
      numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' }
    });
    
    // Format percentage columns
    await sheetsService.formatRange(spreadsheetId, `${sheetName}!H2:H${rowCount}`, {
      numberFormat: { type: 'PERCENT', pattern: '0.00%' }
    });
  }
}
```

#### Email Report Delivery
```typescript
class EmailReportService {
  async sendScheduledReport(reportId: string, recipients: string[]): Promise<void> {
    // Get report data
    const report = await this.getReport(reportId);
    
    // Generate email content
    const emailContent = this.generateEmailContent(report);
    
    // Send email to all recipients
    await Promise.all(
      recipients.map(recipient => this.sendEmail(recipient, emailContent))
    );
  }

  private generateEmailContent(report: CustomReport): EmailContent {
    return {
      subject: `Marketing Report: ${report.name}`,
      html: this.generateHTMLReport(report),
      attachments: [
        {
          filename: `${report.name}.csv`,
          content: this.generateCSVReport(report.data),
          contentType: 'text/csv'
        }
      ]
    };
  }
}
```

This comprehensive guide provides everything needed to implement and maintain a complete marketing analytics and CRM reporting system with multi-platform integration, real-time monitoring, and automated reporting capabilities.
