# Architecture

## File Structure

```
reporting-workspace/
├── docs/ai/                    # AI-generated documentation
│   ├── APP_OVERVIEW.md
│   ├── PROJECT_STATUS.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── DESIGN_SYSTEM.md
│   ├── INTEGRATIONS_GUIDE.md
│   └── TROUBLESHOOTING_GUIDE.md
├── src/                        # Source code
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components (Radix UI)
│   │   ├── AllVenuesFacebookAdsTable.tsx
│   │   ├── AllVenuesGoogleAdsTable.tsx
│   │   ├── DebugPanel.tsx
│   │   ├── InsightsCard.tsx
│   │   ├── LeadQualityMetrics.tsx
│   │   ├── LeadQualityTable.tsx
│   │   └── PlatformPerformanceCharts.tsx
│   ├── pages/                 # Page components (routes)
│   │   ├── AdAccountsOverview.tsx
│   │   ├── AddClientModal.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── EventDashboard.tsx
│   │   ├── FacebookAdsPage.tsx
│   │   ├── Fallback.tsx
│   │   ├── GoogleAdsPage.tsx
│   │   ├── IntegrationSetup.tsx
│   │   └── OAuthCallback.tsx
│   ├── services/              # Business logic and API calls
│   │   ├── clientService.ts
│   │   ├── databaseService.ts
│   │   ├── eventMetricsService.ts
│   │   ├── facebookAdsService.ts
│   │   ├── fileUploadService.ts
│   │   ├── goHighLevelService.ts
│   │   ├── googleAdsService.ts
│   │   ├── googleSheetsService.ts
│   │   ├── leadQualityService.ts
│   │   ├── oauthService.ts
│   │   └── pdfExportService.ts
│   ├── lib/                   # Utility libraries
│   │   ├── debug.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── dashboard.ts
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── mcp-servers/              # Model Context Protocol servers
│   └── supabase-server.js
├── scripts/                  # Build and setup scripts
│   └── setup-mcp.sh
├── dist/                     # Built application (production)
├── node_modules/             # Dependencies
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── .cursorrules              # Cursor AI rules
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `EventDashboard.tsx`)
- **Services**: camelCase with `Service` suffix (e.g., `facebookAdsService.ts`)
- **Types**: camelCase with `.ts` extension (e.g., `dashboard.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`)
- **Pages**: PascalCase (e.g., `FacebookAdsPage.tsx`)
- **Directories**: lowercase with hyphens (e.g., `mcp-servers`)

### Code Conventions
- **Variables**: camelCase (e.g., `userData`, `campaignMetrics`)
- **Functions**: camelCase (e.g., `fetchCampaignData`, `calculateROI`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces**: PascalCase (e.g., `CampaignData`, `UserProfile`)
- **Enums**: PascalCase (e.g., `CampaignStatus`, `PlatformType`)

### React Components
- **Component Names**: PascalCase (e.g., `EventDashboard`, `LeadQualityTable`)
- **Props**: camelCase (e.g., `isLoading`, `onDataUpdate`)
- **Event Handlers**: `on` prefix + PascalCase (e.g., `onClick`, `onDataChange`)
- **Boolean Props**: `is`/`has`/`can` prefix (e.g., `isVisible`, `hasData`, `canEdit`)

## Database Schema

### Core Tables

#### `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  company VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `ad_accounts`
```sql
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'google'
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, platform, account_id)
);
```

#### `campaigns`
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform_campaign_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  objective VARCHAR(100),
  budget DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_account_id, platform_campaign_id)
);
```

#### `campaign_metrics`
```sql
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(15,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);
```

#### `leads`
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  platform VARCHAR(50) NOT NULL,
  platform_lead_id VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  name VARCHAR(255),
  company VARCHAR(255),
  lead_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_campaigns_ad_account_id ON campaigns(ad_account_id);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);
```

## API Architecture

### Service Layer Pattern
Each external service has its own service file in `src/services/`:

#### `facebookAdsService.ts`
```typescript
interface FacebookAdsService {
  authenticate(): Promise<AuthResult>;
  getCampaigns(accountId: string): Promise<Campaign[]>;
  getCampaignMetrics(campaignId: string, dateRange: DateRange): Promise<Metrics[]>;
  getLeads(campaignId: string): Promise<Lead[]>;
}
```

#### `googleAdsService.ts`
```typescript
interface GoogleAdsService {
  authenticate(): Promise<AuthResult>;
  getCampaigns(customerId: string): Promise<Campaign[]>;
  getCampaignMetrics(campaignId: string, dateRange: DateRange): Promise<Metrics[]>;
  getConversions(campaignId: string): Promise<Conversion[]>;
}
```

### Data Flow Architecture
```
External APIs → Service Layer → Database Service → React Query → Components
     ↓              ↓              ↓              ↓           ↓
  Raw Data → Normalized Data → Stored Data → Cached Data → UI Display
```

### Error Handling Strategy
- **Service Level**: Try-catch blocks with specific error types
- **Component Level**: Error boundaries for UI error handling
- **Global Level**: Centralized error logging and user notification

## Component Architecture

### Component Hierarchy
```
App
├── ErrorBoundary
├── BrowserRouter
│   ├── Routes
│   │   ├── EventDashboard
│   │   │   ├── PlatformPerformanceCharts
│   │   │   ├── LeadQualityMetrics
│   │   │   └── InsightsCard
│   │   ├── FacebookAdsPage
│   │   │   └── AllVenuesFacebookAdsTable
│   │   ├── GoogleAdsPage
│   │   │   └── AllVenuesGoogleAdsTable
│   │   └── AdminPanel
│   │       ├── AddClientModal
│   │       └── IntegrationSetup
│   └── DebugPanel
```

### State Management
- **Local State**: React `useState` for component-specific state
- **Server State**: React Query for API data and caching
- **Global State**: Context API for user authentication and app-wide settings
- **Form State**: Controlled components with validation

### Data Fetching Strategy
- **React Query**: Handles caching, background updates, and error states
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Pagination**: Infinite scroll for large datasets
- **Real-time Updates**: WebSocket connections for live data

## Security Architecture

### Authentication Flow
1. **OAuth 2.0**: External platform authentication
2. **JWT Tokens**: Secure session management
3. **Role-based Access**: Client-specific data isolation
4. **Token Refresh**: Automatic token renewal

### Data Protection
- **Encryption**: Sensitive data encrypted at rest
- **HTTPS**: All communications encrypted in transit
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries only

### API Security
- **Rate Limiting**: Prevents API abuse
- **CORS**: Configured for specific origins
- **API Keys**: Rotated regularly
- **Audit Logging**: All actions logged for compliance

## Performance Architecture

### Frontend Optimization
- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: React Query caching and HTTP caching
- **Image Optimization**: Lazy loading and compression

### Backend Optimization
- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for frequently accessed data
- **CDN**: Static asset delivery

### Monitoring
- **Error Tracking**: Real-time error monitoring
- **Performance Metrics**: Core Web Vitals tracking
- **User Analytics**: Usage patterns and optimization opportunities

---

For development setup, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).  
For testing strategies, see [TESTING.md](./TESTING.md).  
For integration details, see [INTEGRATIONS_GUIDE.md](./INTEGRATIONS_GUIDE.md).
