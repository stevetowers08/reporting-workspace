# Marketing Analytics Dashboard Documentation

**Last Updated:** January 20, 2025  
**Version:** 1.0.0  
**Maintained by:** Tulen Agency

## Overview

The Marketing Analytics Dashboard is a unified platform for managing marketing analytics across multiple platforms including Facebook Ads, Google Ads, GoHighLevel CRM, and Google Sheets. Built with React, TypeScript, and Supabase.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **State Management:** React Query + Zustand
- **Authentication:** OAuth 2.0 + Supabase Auth
- **Deployment:** Vercel (Frontend) + Supabase (Backend)

---

## Service Documentation

### 📊 [Facebook Ads Integration](./docs/services/facebook-ads.md)
- Official API Documentation
- Current Implementation
- Authentication Flow
- Available Endpoints
- Data Models

### 🔍 [Google Ads Integration](./docs/services/google-ads.md)
- Official API Documentation
- Current Implementation
- Authentication Flow
- Available Endpoints
- Data Models

### 🏢 [GoHighLevel CRM Integration](./docs/services/gohighlevel.md)
- Official API Documentation
- Current Implementation
- Authentication Flow
- Available Endpoints
- Data Models

### 📈 [Google Sheets Integration](./docs/services/google-sheets.md)
- Official API Documentation
- Current Implementation
- Authentication Flow
- Available Endpoints
- Data Models

### 🔧 [Supabase Backend](./docs/services/supabase.md)
- Edge Functions
- Database Schema
- Authentication
- Real-time Features

---

## Documentation Structure

- **[Current Setup](./docs/setup/current-setup.md)** - Current implementation details and endpoints
- **[Development Guide](./docs/setup/development.md)** - How to set up and run the project

---

## Development Setup

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Environment Variables
```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Facebook Ads
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Ads
VITE_GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
VITE_GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret

# GoHighLevel
VITE_GHL_CLIENT_ID=your_ghl_client_id
VITE_GHL_CLIENT_SECRET=your_ghl_client_secret

# Google Sheets
VITE_GOOGLE_SHEETS_CLIENT_ID=your_google_sheets_client_id
VITE_GOOGLE_SHEETS_CLIENT_SECRET=your_google_sheets_client_secret
```

### Installation
```bash
npm install
npm run dev
```

---

## Contributing

1. Follow TypeScript strict mode
2. Use existing code patterns
3. Write tests for new features
4. Update documentation for API changes
5. Follow the established naming conventions

---

## Support

For technical support or questions:
- **Email:** steve@tulenagency.com
- **Documentation:** See individual service docs
- **Issues:** Create GitHub issues for bugs/features