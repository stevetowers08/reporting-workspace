# Database Schema Reference for AI

## Quick Reference

**Database**: Supabase (PostgreSQL)  
**Primary Tables**: integrations, clients, metrics, oauth_credentials  
**Key Relationships**: clients → metrics, integrations → oauth_credentials

## Core Tables

### integrations
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai')),
  connected BOOLEAN DEFAULT false,
  account_name VARCHAR,
  account_id VARCHAR,
  last_sync TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Platforms**: facebookAds, googleAds, goHighLevel, googleSheets, google-ai  
**Config Structure**: Platform-specific JSON with tokens, settings, account details

### clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR,
  type VARCHAR,
  location VARCHAR,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  services JSONB DEFAULT '{}',
  accounts JSONB DEFAULT '{}',
  shareable_link TEXT,
  logo_url TEXT,
  conversion_actions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Status Values**: active, paused, inactive  
**Services**: JSON object with platform configurations  
**Accounts**: JSON object with connected account details

### metrics
```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  platform VARCHAR CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets')),
  date DATE,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Key**: client_id → clients.id  
**Metrics Structure**: JSON with impressions, clicks, spend, conversions, etc.

### oauth_credentials
```sql
CREATE TABLE oauth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR UNIQUE,
  client_id VARCHAR,
  client_secret VARCHAR,
  redirect_uri VARCHAR,
  scopes TEXT[],
  auth_url VARCHAR,
  token_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Agency-level OAuth app credentials  
**Unique**: One record per platform  
**Scopes**: Array of OAuth scopes

## Authentication Tables

### user_google_ads_auth
```sql
CREATE TABLE user_google_ads_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  google_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT[],
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### google_ads_configs
```sql
CREATE TABLE google_ads_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### ghl_app_credentials
```sql
CREATE TABLE ghl_app_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name VARCHAR DEFAULT 'Marketing Analytics Dashboard',
  client_id VARCHAR,
  client_secret VARCHAR,
  shared_secret VARCHAR,
  redirect_uri VARCHAR,
  environment VARCHAR DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## TypeScript Interfaces

```typescript
interface Integration {
  id: string;
  platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets' | 'google-ai';
  connected: boolean;
  account_name?: string;
  account_id?: string;
  last_sync?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name?: string;
  type?: string;
  location?: string;
  status: 'active' | 'paused' | 'inactive';
  services: Record<string, any>;
  accounts: Record<string, any>;
  shareable_link?: string;
  logo_url?: string;
  conversion_actions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Metric {
  id: string;
  client_id: string;
  platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
  date: string;
  metrics: {
    impressions?: number;
    clicks?: number;
    spend?: number;
    leads?: number;
    conversions?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    roas?: number;
    reach?: number;
    frequency?: number;
    demographics?: Record<string, any>;
    platformBreakdown?: Record<string, any>;
  };
  created_at: string;
}

interface OAuthCredentials {
  id: string;
  platform: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scopes?: string[];
  auth_url?: string;
  token_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## Common Query Patterns

### Get Active Integrations
```sql
SELECT * FROM integrations 
WHERE connected = true AND platform = $1;
```

### Get Client Metrics
```sql
SELECT * FROM metrics 
WHERE client_id = $1 AND platform = $2 
ORDER BY date DESC LIMIT 30;
```

### Get OAuth Credentials
```sql
SELECT * FROM oauth_credentials 
WHERE platform = $1 AND is_active = true;
```

### Check Token Expiration
```sql
SELECT * FROM user_google_ads_auth 
WHERE token_expires_at < NOW();
```

## JSON Config Examples

### Facebook Ads Config
```json
{
  "accessToken": "long_lived_access_token",
  "settings": {
    "adAccounts": [{
      "id": "act_123456789",
      "name": "Account Name",
      "account_status": "ACTIVE",
      "currency": "USD",
      "timezone_name": "America/New_York"
    }]
  }
}
```

### Google Ads Config
```json
{
  "oauth": {
    "accessToken": "oauth_access_token",
    "refreshToken": "oauth_refresh_token",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "managerAccountId": "1234567890",
  "settings": {
    "customerAccounts": [{
      "id": "1234567890",
      "name": "Customer Account",
      "status": "ENABLED",
      "currency": "USD",
      "timezone": "UTC"
    }]
  }
}
```

### GoHighLevel Config
```json
{
  "apiKey": {
    "apiKey": "pit-your-agency-token"
  },
  "oauth": {
    "accessToken": "oauth_access_token",
    "refreshToken": "oauth_refresh_token",
    "expiresAt": "2024-12-31T23:59:59Z",
    "locationId": "location_123456"
  },
  "settings": {
    "locations": [{
      "id": "location_123456",
      "name": "Client Location",
      "status": "active"
    }]
  }
}
```

## Security Notes

- **RLS Enabled**: All tables have Row Level Security
- **UUID Primary Keys**: All tables use UUID for primary keys
- **JSONB Fields**: Use JSONB for flexible configuration storage
- **Timestamps**: All tables have created_at/updated_at timestamps
- **Constraints**: Platform fields have CHECK constraints for valid values

## Indexes

```sql
-- Key indexes for performance
CREATE INDEX idx_integrations_platform ON integrations(platform);
CREATE INDEX idx_integrations_connected ON integrations(connected);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_metrics_client_date ON metrics(client_id, date);
CREATE INDEX idx_metrics_platform ON metrics(platform);
CREATE INDEX idx_user_google_ads_auth_user_id ON user_google_ads_auth(user_id);
CREATE INDEX idx_oauth_credentials_platform ON oauth_credentials(platform);
```

## Environment Variables

```bash
# Supabase Connection
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
