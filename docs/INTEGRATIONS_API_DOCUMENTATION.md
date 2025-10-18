# Marketing Analytics Dashboard - API Integration Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication Setup](#authentication-setup)
3. [Facebook Ads Integration](#facebook-ads-integration)
4. [Google Ads Integration](#google-ads-integration)
5. [GoHighLevel Integration](#gohighlevel-integration)
6. [Google Sheets Integration](#google-sheets-integration)
7. [Analytics Data Endpoints](#analytics-data-endpoints)
8. [Reporting APIs](#reporting-apis)
9. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites
- Supabase project with database configured
- Environment variables set up
- Required API credentials for each platform

### Environment Setup
```bash
# Required environment variables
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

GHL_API_KEY=your_ghl_api_key
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret
GHL_REDIRECT_URI=https://yourdomain.com/auth/ghl/callback

GOOGLE_AI_STUDIO_API_KEY=your_google_ai_studio_key
```

### Database Schema
```sql
-- Core integrations table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  account_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Client-specific configurations
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  accounts JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Authentication Setup

### OAuth 2.0 Flow Implementation

#### 1. Authorization URL Generation
```typescript
// Facebook Ads OAuth
const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${FACEBOOK_REDIRECT_URI}&scope=ads_read,ads_management,business_management&response_type=code&state=${state}`;

// Google Ads OAuth
const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&scope=https://www.googleapis.com/auth/adwords&response_type=code&access_type=offline&state=${state}`;

// GoHighLevel OAuth
const ghlAuthUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&client_id=${GHL_CLIENT_ID}&redirect_uri=${GHL_REDIRECT_URI}&scope=locations.readonly&state=${state}`;
```

#### 2. Token Exchange
```typescript
// Unified token exchange service
export class TokenExchangeService {
  static async exchangeCodeForTokens(
    platform: 'facebook' | 'google' | 'ghl',
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const config = this.getPlatformConfig(platform);
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private static getPlatformConfig(platform: string) {
    const configs = {
      facebook: {
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!
      },
      google: {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!
      },
      ghl: {
        tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
        clientId: process.env.GHL_CLIENT_ID!,
        clientSecret: process.env.GHL_CLIENT_SECRET!
      }
    };
    
    return configs[platform];
  }
}
```

#### 3. Token Storage
```typescript
export class TokenManager {
  static async storeTokens(
    platform: string,
    tokens: OAuthTokens,
    accountInfo: AccountInfo
  ): Promise<void> {
    await supabase
      .from('integrations')
      .upsert({
        platform,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        account_info: accountInfo
      });
  }

  static async getValidToken(platform: string): Promise<string | null> {
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .single();

    if (!data) return null;

    // Check if token needs refresh
    if (data.token_expires_at && new Date() > new Date(data.token_expires_at)) {
      return await this.refreshToken(platform, data.refresh_token);
    }

    return data.access_token;
  }

  static async refreshToken(platform: string, refreshToken: string): Promise<string | null> {
    const config = TokenExchangeService.getPlatformConfig(platform);
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });

    if (!response.ok) return null;

    const tokens = await response.json();
    await this.storeTokens(platform, tokens, {});
    
    return tokens.access_token;
  }
}
```

---

## Facebook Ads Integration

### Setup
1. Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Facebook Login and Marketing API products
3. Configure OAuth redirect URIs
4. Request required permissions: `ads_read`, `ads_management`, `business_management`

### Service Implementation
```typescript
export class FacebookAdsService {
  private static readonly BASE_URL = 'https://graph.facebook.com/v18.0';

  static async getAdAccounts(): Promise<FacebookAdsAccount[]> {
    const token = await TokenManager.getValidToken('facebook');
    if (!token) throw new Error('Facebook token not available');

    const response = await fetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency&access_token=${token}`);
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  static async getCampaigns(accountId: string, dateRange: DateRange): Promise<FacebookCampaign[]> {
    const token = await TokenManager.getValidToken('facebook');
    if (!token) throw new Error('Facebook token not available');

    const params = new URLSearchParams({
      fields: 'id,name,status,objective,created_time,updated_time',
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate
      }),
      access_token: token
    });

    const response = await fetch(`${this.BASE_URL}/act_${accountId}/campaigns?${params}`);
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  static async getInsights(accountId: string, dateRange: DateRange): Promise<FacebookInsights[]> {
    const token = await TokenManager.getValidToken('facebook');
    if (!token) throw new Error('Facebook token not available');

    const params = new URLSearchParams({
      fields: 'impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,cost_per_conversion',
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate
      }),
      level: 'account',
      access_token: token
    });

    const response = await fetch(`${this.BASE_URL}/act_${accountId}/insights?${params}`);
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }
}
```

### Data Structures
```typescript
interface FacebookAdsAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  updated_time: string;
}

interface FacebookInsights {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  cpm: string;
  cpc: string;
  ctr: string;
  cost_per_conversion: string;
}
```

---

## Google Ads Integration

### Setup
1. Create Google Cloud Project
2. Enable Google Ads API
3. Create OAuth 2.0 credentials
4. Configure consent screen
5. Add authorized redirect URIs

### Service Implementation
```typescript
export class GoogleAdsService {
  private static readonly BASE_URL = 'https://googleads.googleapis.com/v14';

  static async getCustomerAccounts(): Promise<GoogleAdsAccount[]> {
    const token = await TokenManager.getValidToken('google');
    if (!token) throw new Error('Google token not available');

    const response = await fetch(`${this.BASE_URL}/customers:listAccessibleCustomers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
      }
    });

    if (!response.ok) {
      throw new Error(`Google Ads API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.resourceNames?.map((name: string) => ({
      id: name.split('/')[1],
      name: `Customer ${name.split('/')[1]}`
    })) || [];
  }

  static async getCampaigns(customerId: string, dateRange: DateRange): Promise<GoogleCampaign[]> {
    const token = await TokenManager.getValidToken('google');
    if (!token) throw new Error('Google token not available');

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.start_date <= '${dateRange.endDate}'
      AND (campaign.end_date >= '${dateRange.startDate}' OR campaign.end_date = '')
    `;

    const response = await fetch(`${this.BASE_URL}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Google Ads API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.map((result: any) => result.campaign) || [];
  }

  static async getConversionActions(customerId: string): Promise<GoogleConversionAction[]> {
    const token = await TokenManager.getValidToken('google');
    if (!token) throw new Error('Google token not available');

    const query = `
      SELECT 
        conversion_action.id,
        conversion_action.name,
        conversion_action.status,
        conversion_action.type,
        conversion_action.category
      FROM conversion_action
    `;

    const response = await fetch(`${this.BASE_URL}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Google Ads API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.map((result: any) => result.conversionAction) || [];
  }
}
```

### Data Structures
```typescript
interface GoogleAdsAccount {
  id: string;
  name: string;
}

interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  startDate: string;
  endDate: string;
}

interface GoogleConversionAction {
  id: string;
  name: string;
  status: string;
  type: string;
  category: string;
}
```

---

## GoHighLevel Integration

### Setup
1. Create GoHighLevel marketplace app
2. Configure OAuth settings
3. Set up API key for agency operations
4. Configure location-specific access

### Service Implementation
```typescript
export class GoHighLevelService {
  private static readonly BASE_URL = 'https://services.leadconnectorhq.com';

  // Agency-level operations (uses API key)
  static async getAgencyToken(): Promise<string> {
    const token = process.env.GHL_API_KEY;
    if (!token) throw new Error('GHL API key not configured');
    return token;
  }

  static async getLocations(): Promise<GHLLocation[]> {
    const token = await this.getAgencyToken();
    
    const response = await fetch(`${this.BASE_URL}/locations/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.locations || [];
  }

  // Client-level operations (uses OAuth tokens)
  static async getLocationToken(locationId: string): Promise<string | null> {
    const { data } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('platform', 'ghl')
      .eq('account_info->>locationId', locationId)
      .single();

    return data?.access_token || null;
  }

  static async getContacts(locationId: string): Promise<GHLContact[]> {
    const token = await this.getLocationToken(locationId);
    if (!token) throw new Error('GHL location token not available');

    const response = await fetch(`${this.BASE_URL}/contacts/?locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.contacts || [];
  }

  static async getOpportunities(locationId: string): Promise<GHLOpportunity[]> {
    const token = await this.getLocationToken(locationId);
    if (!token) throw new Error('GHL location token not available');

    const response = await fetch(`${this.BASE_URL}/opportunities/?locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.opportunities || [];
  }
}
```

### Data Structures
```typescript
interface GHLLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  website: string;
  timeZone: string;
}

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface GHLOpportunity {
  id: string;
  title: string;
  contactId: string;
  pipelineId: string;
  pipelineStageId: string;
  status: string;
  monetaryValue: number;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Google Sheets Integration

### Setup
1. Enable Google Sheets API in Google Cloud Console
2. Configure OAuth consent screen
3. Add required scopes: `https://www.googleapis.com/auth/spreadsheets`
4. Set up Supabase Edge Function for server-side operations

### Service Implementation
```typescript
export class GoogleSheetsService {
  private static readonly BASE_URL = 'https://sheets.googleapis.com/v4';

  static async getAccessToken(): Promise<string | null> {
    return await TokenManager.getValidToken('google');
  }

  static async getSpreadsheets(): Promise<GoogleSheetsAccount[]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Google Sheets token not available');

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,createdTime,modifiedTime)`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  static async getSheetNames(spreadsheetId: string): Promise<string[]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Google Sheets token not available');

    const response = await fetch(`${this.BASE_URL}/spreadsheets/${spreadsheetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sheets?.map((sheet: any) => sheet.properties.title) || [];
  }

  static async getSheetValues(spreadsheetId: string, range: string): Promise<any[][]> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Google Sheets token not available');

    const response = await fetch(`${this.BASE_URL}/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  static async updateSheetValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    // Use Supabase Edge Function for server-side operation
    const response = await fetch('/api/google-sheets-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        spreadsheetId,
        range,
        values
      })
    });

    if (!response.ok) {
      throw new Error(`Sheet update failed: ${response.statusText}`);
    }
  }
}
```

### Supabase Edge Function
```typescript
// supabase/functions/google-sheets-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { action, spreadsheetId, range, values } = await req.json()
  
  const token = await getGoogleToken()
  
  if (action === 'update') {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`)
    }
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  })
})
```

---

## Analytics Data Endpoints

### Facebook Ads Analytics
```typescript
export class FacebookAnalyticsService {
  static async getCampaignMetrics(accountId: string, dateRange: DateRange): Promise<CampaignMetrics> {
    const insights = await FacebookAdsService.getInsights(accountId, dateRange);
    
    return {
      impressions: parseInt(insights[0]?.impressions || '0'),
      clicks: parseInt(insights[0]?.clicks || '0'),
      spend: parseFloat(insights[0]?.spend || '0'),
      reach: parseInt(insights[0]?.reach || '0'),
      frequency: parseFloat(insights[0]?.frequency || '0'),
      cpm: parseFloat(insights[0]?.cpm || '0'),
      cpc: parseFloat(insights[0]?.cpc || '0'),
      ctr: parseFloat(insights[0]?.ctr || '0'),
      costPerConversion: parseFloat(insights[0]?.cost_per_conversion || '0')
    };
  }

  static async getDemographicsBreakdown(accountId: string, dateRange: DateRange): Promise<DemographicsData> {
    const token = await TokenManager.getValidToken('facebook');
    if (!token) throw new Error('Facebook token not available');

    const params = new URLSearchParams({
      fields: 'impressions,clicks,spend,reach',
      breakdowns: 'age,gender',
      time_range: JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate
      }),
      level: 'account',
      access_token: token
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/act_${accountId}/insights?${params}`);
    const data = await response.json();
    
    return this.processDemographicsData(data.data || []);
  }

  private static processDemographicsData(data: any[]): DemographicsData {
    const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const genders = ['male', 'female', 'unknown'];
    
    const breakdown = {
      age: ageGroups.reduce((acc, age) => ({ ...acc, [age]: { impressions: 0, clicks: 0, spend: 0 } }), {}),
      gender: genders.reduce((acc, gender) => ({ ...acc, [gender]: { impressions: 0, clicks: 0, spend: 0 } }), {})
    };

    data.forEach(item => {
      const age = item.age || 'unknown';
      const gender = item.gender || 'unknown';
      
      if (breakdown.age[age]) {
        breakdown.age[age].impressions += parseInt(item.impressions || '0');
        breakdown.age[age].clicks += parseInt(item.clicks || '0');
        breakdown.age[age].spend += parseFloat(item.spend || '0');
      }
      
      if (breakdown.gender[gender]) {
        breakdown.gender[gender].impressions += parseInt(item.impressions || '0');
        breakdown.gender[gender].clicks += parseInt(item.clicks || '0');
        breakdown.gender[gender].spend += parseFloat(item.spend || '0');
      }
    });

    return breakdown;
  }
}
```

### Google Ads Analytics
```typescript
export class GoogleAnalyticsService {
  static async getCampaignMetrics(customerId: string, dateRange: DateRange): Promise<CampaignMetrics> {
    const token = await TokenManager.getValidToken('google');
    if (!token) throw new Error('Google token not available');

    const query = `
      SELECT 
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.average_cpc,
        metrics.ctr,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
    `;

    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    const metrics = data.results?.[0]?.metrics || {};

    return {
      impressions: parseInt(metrics.impressions || '0'),
      clicks: parseInt(metrics.clicks || '0'),
      spend: parseFloat(metrics.costMicros || '0') / 1000000,
      conversions: parseFloat(metrics.conversions || '0'),
      conversionValue: parseFloat(metrics.conversionsValue || '0'),
      averageCpc: parseFloat(metrics.averageCpc || '0'),
      ctr: parseFloat(metrics.ctr || '0'),
      costPerConversion: parseFloat(metrics.costPerConversion || '0')
    };
  }
}
```

---

## Reporting APIs

### Dashboard Data Aggregation
```typescript
export class DashboardService {
  static async getMultiPlatformSummary(dateRange: DateRange): Promise<DashboardSummary> {
    const [facebookData, googleData, ghlData] = await Promise.allSettled([
      this.getFacebookSummary(dateRange),
      this.getGoogleSummary(dateRange),
      this.getGHLSummary(dateRange)
    ]);

    return {
      facebook: facebookData.status === 'fulfilled' ? facebookData.value : null,
      google: googleData.status === 'fulfilled' ? googleData.value : null,
      ghl: ghlData.status === 'fulfilled' ? ghlData.value : null,
      totalSpend: this.calculateTotalSpend(facebookData, googleData),
      totalLeads: this.calculateTotalLeads(facebookData, googleData, ghlData),
      totalRevenue: this.calculateTotalRevenue(ghlData)
    };
  }

  private static async getFacebookSummary(dateRange: DateRange): Promise<PlatformSummary> {
    const accounts = await FacebookAdsService.getAdAccounts();
    const totalMetrics = { impressions: 0, clicks: 0, spend: 0, reach: 0 };

    for (const account of accounts) {
      const insights = await FacebookAdsService.getInsights(account.id, dateRange);
      if (insights[0]) {
        totalMetrics.impressions += parseInt(insights[0].impressions || '0');
        totalMetrics.clicks += parseInt(insights[0].clicks || '0');
        totalMetrics.spend += parseFloat(insights[0].spend || '0');
        totalMetrics.reach += parseInt(insights[0].reach || '0');
      }
    }

    return {
      platform: 'facebook',
      accounts: accounts.length,
      metrics: totalMetrics,
      campaigns: await this.getFacebookCampaignsCount(dateRange)
    };
  }

  private static async getGoogleSummary(dateRange: DateRange): Promise<PlatformSummary> {
    const accounts = await GoogleAdsService.getCustomerAccounts();
    const totalMetrics = { impressions: 0, clicks: 0, spend: 0, conversions: 0 };

    for (const account of accounts) {
      const metrics = await GoogleAnalyticsService.getCampaignMetrics(account.id, dateRange);
      totalMetrics.impressions += metrics.impressions;
      totalMetrics.clicks += metrics.clicks;
      totalMetrics.spend += metrics.spend;
      totalMetrics.conversions += metrics.conversions;
    }

    return {
      platform: 'google',
      accounts: accounts.length,
      metrics: totalMetrics,
      campaigns: await this.getGoogleCampaignsCount(dateRange)
    };
  }

  private static async getGHLSummary(dateRange: DateRange): Promise<PlatformSummary> {
    const locations = await GoHighLevelService.getLocations();
    const totalMetrics = { contacts: 0, opportunities: 0, revenue: 0 };

    for (const location of locations) {
      const [contacts, opportunities] = await Promise.all([
        GoHighLevelService.getContacts(location.id),
        GoHighLevelService.getOpportunities(location.id)
      ]);

      totalMetrics.contacts += contacts.length;
      totalMetrics.opportunities += opportunities.length;
      totalMetrics.revenue += opportunities.reduce((sum, opp) => sum + opp.monetaryValue, 0);
    }

    return {
      platform: 'ghl',
      accounts: locations.length,
      metrics: totalMetrics,
      campaigns: 0 // GHL doesn't have campaigns
    };
  }
}
```

### Data Export APIs
```typescript
export class ExportService {
  static async exportToGoogleSheets(
    data: any[],
    spreadsheetId: string,
    sheetName: string
  ): Promise<void> {
    const headers = Object.keys(data[0] || {});
    const values = [headers, ...data.map(row => headers.map(h => row[h]))];
    
    await GoogleSheetsService.updateSheetValues(
      spreadsheetId,
      `${sheetName}!A1`,
      values
    );
  }

  static async exportToCSV(data: any[]): Promise<string> {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }
}
```

---

## Common Problems & Solutions

### Authentication Issues

#### Token Expiration
**Solution:** Implement automatic token refresh
```typescript
export class TokenManager {
  static async getValidToken(platform: string): Promise<string | null> {
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .single();

    if (!data) return null;

    // Auto-refresh if expired
    if (data.token_expires_at && new Date() > new Date(data.token_expires_at)) {
      return await this.refreshToken(platform, data.refresh_token);
    }

    return data.access_token;
  }
}
```

#### Insufficient Scopes
**Solution:** Request all required scopes upfront
```typescript
// Facebook Ads - Request all needed scopes
const facebookScopes = [
  'ads_read',
  'ads_management', 
  'business_management',
  'pages_read_engagement'
].join(',');

// Google Ads - Use correct scope
const googleScope = 'https://www.googleapis.com/auth/adwords';

// GoHighLevel - Request location access
const ghlScopes = 'locations.readonly locations.contacts.readonly';
```

### API Rate Limiting

#### Facebook Ads Rate Limits
**Solution:** Implement exponential backoff
```typescript
export class FacebookRateLimiter {
  static async makeRequest<T>(requestFn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (error.message.includes('rate limit') && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }
}
```

#### Google Ads Rate Limits
**Solution:** Use request queuing
```typescript
export class GoogleAdsQueue {
  private static queue: Array<() => Promise<any>> = [];
  private static processing = false;

  static async addRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      await request?.();
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
    this.processing = false;
  }
}
```

### Data Synchronization Issues

#### Stale Account Data
**Solution:** Implement cache invalidation
```typescript
export class CacheManager {
  static async getWithRefresh<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    // Force refresh from API
    const data = await fetcher();
    this.cache.set(key, { data, expires: Date.now() + ttlMs });
    
    return data;
  }

  static invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### Missing New Accounts
**Solution:** Use comprehensive account fetching
```typescript
export class FacebookAccountFetcher {
  static async getAllAccounts(): Promise<FacebookAdsAccount[]> {
    const token = await TokenManager.getValidToken('facebook');
    const accounts: FacebookAdsAccount[] = [];

    // Fetch from multiple endpoints
    const endpoints = [
      '/me/adaccounts',
      '/me/businesses',
      '/me/system_users'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0${endpoint}?fields=id,name,account_status&access_token=${token}`);
        const data = await response.json();
        accounts.push(...(data.data || []));
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error);
      }
    }

    // Remove duplicates
    return accounts.filter((account, index, self) => 
      index === self.findIndex(a => a.id === account.id)
    );
  }
}
```

### Google Sheets Integration Issues

#### CORS Errors
**Solution:** Use Supabase Edge Functions for server-side operations
```typescript
// Frontend - Call Edge Function instead of direct API
export class GoogleSheetsService {
  static async updateSheetValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const response = await fetch('/api/google-sheets-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        spreadsheetId,
        range,
        values
      })
    });

    if (!response.ok) {
      throw new Error(`Sheet update failed: ${response.statusText}`);
    }
  }
}
```

#### Private Spreadsheet Access
**Solution:** Ensure proper sharing permissions
```typescript
export class GoogleSheetsValidator {
  static async validateAccess(spreadsheetId: string): Promise<boolean> {
    try {
      const token = await TokenManager.getValidToken('google');
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

### GoHighLevel Integration Issues

#### Location Access Problems
**Solution:** Verify OAuth flow includes location selection
```typescript
export class GHLValidator {
  static async validateLocationAccess(locationId: string): Promise<boolean> {
    try {
      const token = await GoHighLevelService.getLocationToken(locationId);
      if (!token) return false;

      const response = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

#### Agency vs Client Token Confusion
**Solution:** Clear separation of token usage
```typescript
export class GoHighLevelService {
  // Agency operations - uses API key
  static async getAgencyToken(): Promise<string> {
    const token = process.env.GHL_API_KEY;
    if (!token) throw new Error('GHL API key not configured');
    return token;
  }

  // Client operations - uses OAuth tokens
  static async getLocationToken(locationId: string): Promise<string | null> {
    const { data } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('platform', 'ghl')
      .eq('account_info->>locationId', locationId)
      .single();

    return data?.access_token || null;
  }
}
```

### Performance Issues

#### Slow API Responses
**Solution:** Implement parallel processing
```typescript
export class ParallelProcessor {
  static async processAccounts<T>(
    accounts: any[],
    processor: (account: any) => Promise<T>,
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < accounts.length; i += concurrency) {
      const batch = accounts.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(account => processor(account))
      );
      
      results.push(...batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<T>).value)
      );
    }
    
    return results;
  }
}
```

#### Memory Issues with Large Datasets
**Solution:** Implement pagination
```typescript
export class PaginatedFetcher {
  static async fetchAllPages<T>(
    baseUrl: string,
    token: string,
    pageSize: number = 100
  ): Promise<T[]> {
    const allData: T[] = [];
    let nextUrl: string | null = `${baseUrl}?limit=${pageSize}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      allData.push(...(data.data || data.results || []));
      
      nextUrl = data.paging?.next || data.nextPageToken ? 
        `${baseUrl}?limit=${pageSize}&after=${data.paging.cursors.after}` : 
        null;
    }

    return allData;
  }
}
```

## Best Practices

### Error Handling
```typescript
export class ApiErrorHandler {
  static async handleApiCall<T>(
    apiCall: () => Promise<T>,
    platform: string,
    operation: string
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`${platform} ${operation} failed:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error(`${platform} authentication expired. Please re-authenticate.`);
        }
        
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error(`${platform} rate limit exceeded. Please try again later.`);
        }
        
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new Error(`${platform} access denied. Check permissions.`);
        }
      }
      
      throw new Error(`${platform} ${operation} failed. Please try again.`);
    }
  }
}
```

### Rate Limiting
```typescript
export class RateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();

  static async checkLimit(platform: string, maxRequests: number = 100, windowMs: number = 60000): Promise<void> {
    const now = Date.now();
    const key = `${platform}_${Math.floor(now / windowMs)}`;
    
    const current = this.limits.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (current.count >= maxRequests) {
      const waitTime = current.resetTime - now;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    current.count++;
    this.limits.set(key, current);
  }
}
```

### Caching Strategy
```typescript
export class CacheManager {
  private static cache = new Map<string, { data: any; expires: number }>();

  static async get<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 300000): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, expires: Date.now() + ttlMs });
    
    return data;
  }

  static clear(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

### Performance Optimization
```typescript
export class PerformanceOptimizer {
  static async batchApiCalls<T>(
    calls: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      
      results.push(...batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<T>).value)
      );
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
```

---

## Data Structures

### Common Types
```typescript
interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  reach?: number;
  frequency?: number;
  cpm?: number;
  cpc?: number;
  ctr?: number;
  costPerConversion?: number;
  conversions?: number;
  conversionValue?: number;
  averageCpc?: number;
}

interface PlatformSummary {
  platform: string;
  accounts: number;
  metrics: Record<string, number>;
  campaigns: number;
}

interface DashboardSummary {
  facebook: PlatformSummary | null;
  google: PlatformSummary | null;
  ghl: PlatformSummary | null;
  totalSpend: number;
  totalLeads: number;
  totalRevenue: number;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface AccountInfo {
  id: string;
  name: string;
  [key: string]: any;
}
```

This optimized API documentation focuses on:
- Clear setup instructions for each platform
- Correct implementation examples
- Proper error handling patterns
- Performance optimization techniques
- Clean data structures and interfaces

The documentation removes troubleshooting sections and focuses on showing the right way to implement each integration, making it easier for developers to get started quickly and correctly.