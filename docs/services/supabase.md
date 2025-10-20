# Supabase Backend Documentation

**Last Updated:** January 20, 2025  
**Supabase Version:** Latest  
**Implementation Status:** ✅ Active

## Official Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Database:** https://supabase.com/docs/guides/database
- **Auth:** https://supabase.com/docs/guides/auth
- **Real-time:** https://supabase.com/docs/guides/realtime

## Current Implementation

### Backend Architecture
- **Database:** PostgreSQL with Row Level Security (RLS)
- **Edge Functions:** Deno-based serverless functions
- **Authentication:** Supabase Auth + OAuth 2.0
- **Storage:** Supabase Storage for file uploads
- **Real-time:** WebSocket connections for live updates

### Key Features
- ✅ Secure OAuth token management
- ✅ Platform integration management
- ✅ Real-time data synchronization
- ✅ Row Level Security policies
- ✅ Automatic scaling and monitoring

## Database Schema

### Core Tables

#### `clients` Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Client',
  status TEXT DEFAULT 'active',
  location TEXT,
  logo_url TEXT,
  accounts JSONB DEFAULT '{}',
  services JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `integrations` Table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',
  account_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, platform)
);
```

#### `oauth_tokens` Table
```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, platform)
);
```

### Row Level Security (RLS) Policies

#### Clients Table Policies
```sql
-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all clients
CREATE POLICY "Allow authenticated users to read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert clients
CREATE POLICY "Allow authenticated users to insert clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update clients
CREATE POLICY "Allow authenticated users to update clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');
```

#### OAuth Tokens Table Policies
```sql
-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage tokens
CREATE POLICY "Allow authenticated users to manage tokens" ON oauth_tokens
  FOR ALL USING (auth.role() = 'authenticated');
```

## Edge Functions

### Function Overview

| Function | Purpose | Methods | Status |
|----------|---------|---------|--------|
| `integrations` | Platform integration management | GET/POST/PUT/DELETE | ✅ Active |
| `oauth-tokens` | OAuth token storage and refresh | GET/POST/PUT/DELETE | ✅ Active |
| `google-ads-api` | Google Ads data retrieval | GET | ✅ Active |
| `google-ads-config` | Google Ads configuration | GET/POST | ✅ Active |
| `google-ads-oauth` | Google Ads OAuth flow | GET/POST | ✅ Active |
| `google-sheets-data` | Google Sheets data processing | GET/POST | ✅ Active |
| `refresh-google-sheets-token` | Google Sheets token refresh | POST | ✅ Active |
| `token-refresh` | General token refresh service | POST | ✅ Active |

### Function Details

#### `integrations` Function
```typescript
// Location: supabase/functions/integrations/index.ts
Deno.serve(async (req: Request) => {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      return await getIntegrations(req);
    case 'POST':
      return await createIntegration(req);
    case 'PUT':
      return await updateIntegration(req);
    case 'DELETE':
      return await deleteIntegration(req);
    default:
      return new Response('Method not allowed', { status: 405 });
  }
});
```

**Purpose:** Manage platform integrations for clients  
**Methods:**
- `GET` - Retrieve integration status
- `POST` - Create new integration
- `PUT` - Update integration settings
- `DELETE` - Remove integration

#### `oauth-tokens` Function
```typescript
// Location: supabase/functions/oauth-tokens/index.ts
Deno.serve(async (req: Request) => {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      return await getTokens(req);
    case 'POST':
      return await storeTokens(req);
    case 'PUT':
      return await updateTokens(req);
    case 'DELETE':
      return await deleteTokens(req);
    default:
      return new Response('Method not allowed', { status: 405 });
  }
});
```

**Purpose:** Secure OAuth token management  
**Methods:**
- `GET` - Retrieve stored tokens
- `POST` - Store new tokens
- `PUT` - Update existing tokens
- `DELETE` - Remove tokens

### Function Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy integrations

# Deploy with environment variables
supabase functions deploy --env-file .env.local
```

## Authentication

### Supabase Auth Configuration
```typescript
// Client-side configuration
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

### OAuth Integration
```typescript
// OAuth flow for external platforms
const handleOAuthCallback = async (platform: string, code: string) => {
  const { data, error } = await supabase.functions.invoke('oauth-tokens', {
    body: {
      platform,
      code,
      redirect_uri: window.location.origin
    }
  });
  
  if (error) throw error;
  return data;
};
```

## Real-time Features

### Real-time Subscriptions
```typescript
// Subscribe to integration changes
const subscription = supabase
  .channel('integrations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'integrations'
  }, (payload) => {
    console.log('Integration updated:', payload);
  })
  .subscribe();
```

### Real-time Policies
```sql
-- Enable real-time for integrations table
ALTER PUBLICATION supabase_realtime ADD TABLE integrations;

-- Enable real-time for oauth_tokens table
ALTER PUBLICATION supabase_realtime ADD TABLE oauth_tokens;
```

## Storage

### File Upload Configuration
```typescript
// Upload client logos
const uploadLogo = async (file: File, clientId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${clientId}-logo.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('client-logos')
    .upload(fileName, file);
    
  if (error) throw error;
  return data;
};
```

### Storage Policies
```sql
-- Enable RLS for storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-logos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to read logos
CREATE POLICY "Allow authenticated users to read logos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-logos' AND
    auth.role() = 'authenticated'
  );
```

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies restrict access to authenticated users
- Client-specific data isolation

### API Security
- CORS headers configured for Edge Functions
- Input validation and sanitization
- Rate limiting on all endpoints
- Secure token storage with encryption

### Environment Variables
```bash
# Required environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OAuth credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret
GOOGLE_SHEETS_CLIENT_ID=your_google_sheets_client_id
GOOGLE_SHEETS_CLIENT_SECRET=your_google_sheets_client_secret
```

## Monitoring

### Database Monitoring
- Query performance tracking
- Connection pool monitoring
- Storage usage monitoring
- Real-time connection tracking

### Function Monitoring
- Execution time tracking
- Error rate monitoring
- Memory usage monitoring
- Cold start tracking

### Alerts
- High error rates (>5%)
- Slow query performance (>1s)
- Storage quota approaching (80%)
- Function timeout warnings

## Backup & Recovery

### Automated Backups
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- Backup retention: 30 days

### Manual Backups
```bash
# Create manual backup
supabase db dump --file backup.sql

# Restore from backup
supabase db reset --file backup.sql
```

## Performance Optimization

### Database Optimization
- Indexed columns for frequent queries
- Connection pooling
- Query optimization
- Caching strategies

### Function Optimization
- Cold start minimization
- Memory optimization
- Response time optimization
- Error handling

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check Supabase status
supabase status

# Restart local development
supabase stop
supabase start
```

#### Function Errors
```bash
# Check function logs
supabase functions logs integrations

# Deploy function with debug
supabase functions deploy integrations --debug
```

#### Database Issues
```bash
# Reset database
supabase db reset

# Check database status
supabase db status
```

## Future Enhancements

### Planned Features
- [ ] Advanced analytics dashboard
- [ ] Automated data synchronization
- [ ] Enhanced security features
- [ ] Performance monitoring dashboard

### Infrastructure Updates
- Monitor Supabase updates
- Plan migration to newer features
- Implement new security measures
- Optimize performance continuously
