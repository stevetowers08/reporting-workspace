# Current Setup Documentation

**Last Updated:** January 20, 2025  
**Version:** 1.0.0  
**Environment:** Production

## Overview

This document describes the current implementation of the Marketing Analytics Dashboard, including all active endpoints, configurations, and integrations.

---

## Current Architecture

### Frontend Stack
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7.1.9
- **Styling:** Tailwind CSS 3.4.18
- **State Management:** React Query 5.90.2 + Zustand
- **UI Components:** Radix UI + Custom components
- **Charts:** Chart.js 4.5.0 + React Chart.js 2

### Backend Stack
- **Database:** Supabase PostgreSQL
- **Backend Functions:** Supabase Edge Functions (Deno)
- **Authentication:** Supabase Auth + OAuth 2.0
- **Deployment:** Vercel (Frontend) + Supabase (Backend)

---

## Active Supabase Edge Functions

| Function Name | Method | Purpose | Status | Last Updated |
|---------------|--------|---------|--------|--------------|
| `integrations` | GET/POST/PUT/DELETE | Platform integration management | ✅ Active | 2025-01-20 |
| `oauth-tokens` | GET/POST/PUT/DELETE | OAuth token storage and refresh | ✅ Active | 2025-01-20 |
| `google-ads-api` | GET | Google Ads data retrieval | ✅ Active | 2025-01-20 |
| `google-ads-config` | GET/POST | Google Ads account configuration | ✅ Active | 2025-01-20 |
| `google-ads-oauth` | GET/POST | Google Ads OAuth flow handling | ✅ Active | 2025-01-20 |
| `google-sheets-data` | GET/POST | Google Sheets data processing | ✅ Active | 2025-01-20 |
| `refresh-google-sheets-token` | POST | Google Sheets token refresh | ✅ Active | 2025-01-20 |
| `token-refresh` | POST | General token refresh service | ✅ Active | 2025-01-20 |

---

## External API Integrations

### Facebook Ads API
- **Base URL:** `https://graph.facebook.com/v18.0`
- **Authentication:** OAuth 2.0
- **Rate Limits:** 200 calls/hour per app
- **Key Endpoints:**
  - `/me/adaccounts` - Get ad accounts
  - `/{ad-account-id}/insights` - Get campaign insights
  - `/{ad-account-id}/campaigns` - Get campaigns
- **Current Implementation:** `src/services/api/facebookAdsService.ts`

### Google Ads API
- **Base URL:** `https://googleads.googleapis.com/v14`
- **Authentication:** OAuth 2.0
- **Rate Limits:** 10,000 calls/day
- **Key Endpoints:**
  - `/customers/{customerId}/googleAds:search` - Search campaigns
  - `/customers/{customerId}/campaigns` - Campaign management
- **Current Implementation:** `src/services/googleAds/accountsService.ts`

### GoHighLevel API
- **Base URL:** `https://services.leadconnectorhq.com`
- **Authentication:** OAuth 2.0
- **Rate Limits:** 1000 calls/hour
- **Key Endpoints:**
  - `/contacts/search` - Contact management
  - `/opportunities/search` - Opportunity tracking
  - `/oauth/token` - Token refresh
- **Current Implementation:** `src/services/ghl/goHighLevelApiService.ts`

### Google Sheets API
- **Base URL:** `https://sheets.googleapis.com/v4`
- **Authentication:** OAuth 2.0
- **Rate Limits:** 100 requests/100 seconds
- **Key Endpoints:**
  - `/spreadsheets/{spreadsheetId}/values/{range}` - Get sheet data
  - `/spreadsheets/{spreadsheetId}` - Spreadsheet metadata
- **Current Implementation:** `src/services/auth/googleSheetsOAuthService.ts`

---

## Database Schema

### Core Tables
- `clients` - Client/venue information
- `integrations` - Platform connection status
- `oauth_tokens` - OAuth token storage
- `client_accounts` - Platform account mappings

### Key Relationships
- Clients → Multiple platform accounts
- Integrations → OAuth tokens
- Client accounts → Platform-specific data

---

## Current Features

### Dashboard Tabs
1. **Summary** - Overview metrics across all platforms
2. **Meta Ads** - Facebook Ads analytics and reporting
3. **Google Ads** - Google Ads campaigns and performance
4. **Lead Info** - Google Sheets data (Event Types + Guest Count)

### Key Components
- **Modern Loading System** - Shimmer effects and skeleton screens
- **Unified Reporting** - Cross-platform analytics
- **Real-time Updates** - Live data synchronization
- **Export Functionality** - PDF report generation

---

## Environment Configuration

### Production URLs
- **Frontend:** `https://tulenreporting.vercel.app`
- **Backend:** Supabase hosted functions
- **Database:** Supabase PostgreSQL

### Development URLs
- **Frontend:** `http://localhost:5173`
- **Backend:** Local Supabase functions
- **Database:** Local Supabase instance

---

## Recent Updates (Last 30 Days)

### January 20, 2025
- ✅ Implemented modern loading system with shimmer effects
- ✅ Removed unnecessary charts from Lead Info page
- ✅ Enhanced Facebook Ads CPC accuracy (cost_per_link_click)
- ✅ Added comparison data and trends to Google Ads reporting
- ✅ Implemented Cost Per Lead color coding
- ✅ Standardized table styling across all tabs

### December 2024
- ✅ Fixed GoHighLevel OAuth popup flow
- ✅ Implemented logo upload functionality
- ✅ Added Semgrep CI security scanning
- ✅ Fixed React Query cache invalidation
- ✅ Enhanced error handling and retry mechanisms

---

## Monitoring & Analytics

### Performance Metrics
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 500ms average
- **Error Rate:** < 1%
- **Uptime:** 99.9%

### Security Measures
- OAuth 2.0 authentication
- Row Level Security (RLS) policies
- Input validation and sanitization
- Rate limiting on all API calls
- CORS protection

---

## Support & Maintenance

### Regular Tasks
- **Daily:** Monitor API rate limits and errors
- **Weekly:** Review performance metrics
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Review and update API integrations

### Contact Information
- **Technical Lead:** Steve Towers
- **Email:** steve@tulenagency.com
- **Documentation:** This repository
