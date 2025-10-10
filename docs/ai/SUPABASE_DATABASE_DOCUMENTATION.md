# Supabase Database Structure Documentation

## Overview

The Supabase database serves as the central data store for the Marketing Analytics Dashboard, managing integrations, authentication tokens, client data, metrics, and OAuth credentials. This document provides a comprehensive overview of the database schema, relationships, and usage patterns.

## Database Architecture

### Database Provider
- **Platform**: Supabase (PostgreSQL)
- **Version**: PostgreSQL 15+
- **Features**: Row Level Security (RLS), Real-time subscriptions, Edge Functions
- **Authentication**: Supabase Auth with JWT tokens

### Connection Management
- **Client**: Supabase JavaScript client
- **Configuration**: Environment-based connection strings
- **Security**: RLS policies for data access control

## Core Tables

### 1. Integrations Table

**Purpose**: Centralized storage for all platform integrations and their configurations.

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

**Columns**:
- `id`: Unique identifier (UUID)
- `platform`: Platform type (enum)
- `connected`: Connection status
- `account_name`: Human-readable account name
- `account_id`: Platform-specific account identifier
- `last_sync`: Last synchronization timestamp
- `config`: JSON configuration object
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Platform-Specific Configurations**:

#### Facebook Ads Config
```json
{
  "accessToken": "long_lived_access_token",
  "settings": {
    "adAccounts": [
      {
        "id": "act_123456789",
        "name": "Account Name",
        "account_status": "ACTIVE",
        "currency": "USD",
        "timezone_name": "America/New_York"
      }
    ]
  }
}
```

#### Google Ads Config
```json
{
  "oauth": {
    "accessToken": "oauth_access_token",
    "refreshToken": "oauth_refresh_token",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "managerAccountId": "1234567890",
  "settings": {
    "customerAccounts": [
      {
        "id": "1234567890",
        "name": "Customer Account",
        "status": "ENABLED",
        "currency": "USD",
        "timezone": "UTC"
      }
    ]
  }
}
```

#### GoHighLevel Config
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
    "locations": [
      {
        "id": "location_123456",
        "name": "Client Location",
        "status": "active"
      }
    ]
  }
}
```

### 2. Clients Table

**Purpose**: Client management and account organization.

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

**Columns**:
- `id`: Unique client identifier
- `name`: Client name
- `type`: Client type (business, individual, etc.)
- `location`: Geographic location
- `status`: Client status
- `services`: JSON object of enabled services
- `accounts`: JSON object of connected accounts
- `shareable_link`: Public sharing link
- `logo_url`: Client logo URL
- `conversion_actions`: Platform-specific conversion actions
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Services Configuration**:
```json
{
  "facebookAds": {
    "enabled": true,
    "adAccountId": "act_123456789",
    "conversionActions": ["lead", "purchase"]
  },
  "googleAds": {
    "enabled": true,
    "customerId": "1234567890",
    "conversionActions": ["conversion_1", "conversion_2"]
  },
  "goHighLevel": {
    "enabled": true,
    "locationId": "location_123456",
    "conversionActions": ["contact", "appointment"]
  }
}
```

### 3. Metrics Table

**Purpose**: Historical metrics storage for analytics and reporting.

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

**Columns**:
- `id`: Unique metric identifier
- `client_id`: Foreign key to clients table
- `platform`: Platform type
- `date`: Metric date
- `metrics`: JSON object containing metric data
- `created_at`: Record creation timestamp

**Metrics Structure**:
```json
{
  "impressions": 10000,
  "clicks": 500,
  "spend": 250.00,
  "leads": 25,
  "conversions": 20,
  "ctr": 5.0,
  "cpc": 0.50,
  "cpm": 25.00,
  "roas": 4.0,
  "reach": 8000,
  "frequency": 1.25,
  "demographics": {
    "ageGroups": {
      "25-34": 40,
      "35-44": 35,
      "45-54": 20,
      "55+": 5
    },
    "gender": {
      "female": 60,
      "male": 40
    }
  },
  "platformBreakdown": {
    "facebookVsInstagram": {
      "facebook": 70,
      "instagram": 30
    },
    "adPlacements": {
      "feed": 80,
      "stories": 15,
      "reels": 5
    }
  }
}
```

## Authentication Tables

### 4. User Google Ads Auth Table

**Purpose**: Google Ads OAuth token storage and management.

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

**Columns**:
- `id`: Unique authentication record identifier
- `user_id`: Internal user identifier
- `google_user_id`: Google user identifier
- `access_token`: OAuth access token
- `refresh_token`: OAuth refresh token
- `token_expires_at`: Token expiration timestamp
- `scope`: OAuth scopes array
- `connected_at`: Connection timestamp
- `last_used_at`: Last usage timestamp
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

### 5. Google Ads Configs Table

**Purpose**: Google Ads API configuration storage.

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

**Columns**:
- `id`: Unique configuration identifier
- `developer_token`: Google Ads developer token
- `client_id`: OAuth client ID
- `client_secret`: OAuth client secret
- `is_active`: Configuration status
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

### 6. GHL App Credentials Table

**Purpose**: GoHighLevel application credentials storage.

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

**Columns**:
- `id`: Unique credentials identifier
- `app_name`: Application name
- `client_id`: OAuth client ID
- `client_secret`: OAuth client secret
- `shared_secret`: Webhook shared secret
- `redirect_uri`: OAuth redirect URI
- `environment`: Environment type
- `is_active`: Credentials status
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

### 7. OAuth Credentials Table

**Purpose**: Generic OAuth credentials storage for all platforms.

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

**Columns**:
- `id`: Unique credentials identifier
- `platform`: Platform name (unique)
- `client_id`: OAuth client ID
- `client_secret`: OAuth client secret
- `redirect_uri`: OAuth redirect URI
- `scopes`: OAuth scopes array
- `auth_url`: Authorization URL
- `token_url`: Token exchange URL
- `is_active`: Credentials status
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

## Database Relationships

### Primary Relationships
```
clients (1) ──→ (many) metrics
clients (1) ──→ (many) integrations (via account_id)
integrations (1) ──→ (1) oauth_credentials (via platform)
```

### Foreign Key Constraints
- `metrics.client_id` → `clients.id`
- `integrations.platform` → `oauth_credentials.platform` (logical)

## Row Level Security (RLS)

### RLS Policies
All tables have RLS enabled for data security:

```sql
-- Enable RLS on all tables
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_google_ads_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_app_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_credentials ENABLE ROW LEVEL SECURITY;
```

### Security Policies
- **Authenticated Users**: Can read/write their own data
- **Service Role**: Full access for backend operations
- **Anonymous**: Limited read access for public data

## Indexes and Performance

### Primary Indexes
```sql
-- Primary key indexes (automatic)
CREATE INDEX idx_integrations_platform ON integrations(platform);
CREATE INDEX idx_integrations_connected ON integrations(connected);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_metrics_client_date ON metrics(client_id, date);
CREATE INDEX idx_metrics_platform ON metrics(platform);
CREATE INDEX idx_user_google_ads_auth_user_id ON user_google_ads_auth(user_id);
CREATE INDEX idx_oauth_credentials_platform ON oauth_credentials(platform);
```

### Composite Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_integrations_platform_connected ON integrations(platform, connected);
CREATE INDEX idx_metrics_client_platform_date ON metrics(client_id, platform, date);
CREATE INDEX idx_user_google_ads_auth_expires ON user_google_ads_auth(token_expires_at);
```

## Data Access Patterns

### Common Queries

#### Get Integration by Platform
```sql
SELECT * FROM integrations 
WHERE platform = 'facebookAds' AND connected = true;
```

#### Get Client Metrics
```sql
SELECT * FROM metrics 
WHERE client_id = $1 AND platform = $2 
ORDER BY date DESC 
LIMIT 30;
```

#### Get OAuth Credentials
```sql
SELECT * FROM oauth_credentials 
WHERE platform = $1 AND is_active = true;
```

#### Get Expired Tokens
```sql
SELECT * FROM user_google_ads_auth 
WHERE token_expires_at < NOW();
```

### Data Aggregation
```sql
-- Monthly metrics aggregation
SELECT 
  client_id,
  platform,
  DATE_TRUNC('month', date) as month,
  SUM((metrics->>'impressions')::int) as total_impressions,
  SUM((metrics->>'clicks')::int) as total_clicks,
  SUM((metrics->>'spend')::float) as total_spend
FROM metrics 
WHERE date >= $1 AND date <= $2
GROUP BY client_id, platform, month
ORDER BY month DESC;
```

## Backup and Recovery

### Backup Strategy
- **Automated Backups**: Daily automated backups via Supabase
- **Point-in-Time Recovery**: Available for 7 days
- **Manual Backups**: On-demand backup creation
- **Data Export**: JSON/CSV export capabilities

### Recovery Procedures
1. **Point-in-Time Recovery**: Restore to specific timestamp
2. **Table-Level Recovery**: Restore individual tables
3. **Data Import**: Import from backup files
4. **Schema Migration**: Version-controlled schema changes

## Monitoring and Maintenance

### Performance Monitoring
- **Query Performance**: Monitor slow queries
- **Connection Pooling**: Track connection usage
- **Index Usage**: Monitor index effectiveness
- **Storage Usage**: Track database size

### Maintenance Tasks
- **Vacuum**: Regular VACUUM operations
- **Analyze**: Update table statistics
- **Index Maintenance**: Rebuild fragmented indexes
- **Log Rotation**: Manage log file sizes

## Security Considerations

### Data Encryption
- **At Rest**: AES-256 encryption
- **In Transit**: TLS 1.3 encryption
- **Application Level**: JWT token encryption
- **OAuth Tokens**: Simple storage approach (RLS protection, encryption can be added later)

### Access Control
- **Authentication**: Supabase Auth integration
- **Authorization**: RLS policies
- **API Keys**: Secure key management
- **Audit Logging**: Track data access

### Compliance
- **GDPR**: Data protection compliance
- **CCPA**: California privacy compliance
- **SOC 2**: Security compliance
- **HIPAA**: Healthcare data compliance (if applicable)

## Environment Configuration

### Development Environment
```bash
# Supabase Development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Production Environment
```bash
# Supabase Production
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
```

## Migration Management

### Schema Migrations
- **Version Control**: Git-based migration tracking
- **Rollback Support**: Reversible migrations
- **Environment Sync**: Consistent schema across environments
- **Data Migrations**: Safe data transformation

### Migration Examples
```sql
-- Add new column
ALTER TABLE integrations ADD COLUMN last_error TEXT;

-- Create new table
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index
CREATE INDEX idx_webhook_events_platform ON webhook_events(platform);
```

## Best Practices

### Data Modeling
- Use appropriate data types
- Implement proper constraints
- Design for scalability
- Consider query patterns

### Performance Optimization
- Create necessary indexes
- Use efficient queries
- Implement connection pooling
- Monitor query performance

### Security
- Enable RLS on all tables
- Use parameterized queries
- Implement proper authentication
- Regular security audits

### Maintenance
- Regular backup verification
- Monitor database performance
- Update statistics regularly
- Plan for capacity growth

## Troubleshooting

### Common Issues

#### Connection Issues
- Check environment variables
- Verify Supabase project status
- Test network connectivity
- Review authentication tokens

#### Performance Issues
- Analyze slow queries
- Check index usage
- Monitor connection pool
- Review query patterns

#### Data Issues
- Verify RLS policies
- Check data constraints
- Review migration history
- Validate data integrity

### Debug Commands
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check active connections
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active';
```

## Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Facebook Ads API Documentation](./FACEBOOK_ADS_API_DOCUMENTATION.md)
- [Google Ads API Documentation](./GOOGLE_ADS_API_DOCUMENTATION.md)
- [GoHighLevel API Documentation](./GOHIGHLEVEL_API_DOCUMENTATION.md)
- [OAuth Implementation Guide](./OAUTH_IMPLEMENTATION_GUIDE.md)
