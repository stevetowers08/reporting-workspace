# Facebook Ads Reporting Page

## Overview
A comprehensive reporting page that displays Facebook Ads performance metrics for all venues in a single table format. This page is accessible via the admin header and provides a unified view of all Facebook Ads accounts.

## Features

### 📊 Comprehensive Metrics Table
- **Venue Information**: Name, logo, and status for each venue
- **8 Key Metrics**: Leads, Cost Per Lead, Conversion Rate, Spent, Impressions, Link Clicks, Cost Per Click, CTR
- **Trend Indicators**: Shows percentage changes with up/down arrows
- **Responsive Design**: Horizontal scroll on mobile devices

### 🎛️ Admin Controls
- **Period Selection**: 7d, 14d, 30d, 90d time periods
- **Summary Cards**: Total venues, active accounts, total spend, total leads
- **Quick Actions**: View individual venue dashboards, share links

### 🔗 Navigation
- **Admin Header**: Consistent with other admin pages
- **Direct Links**: Quick access to individual venue dashboards
- **Share Links**: Direct access to venue shareable links

## File Structure

```
src/
├── pages/
│   └── FacebookAdsReporting.tsx          # Main page component
├── components/
│   └── reporting/
│       ├── FacebookAdsReportingTable.tsx  # Main table component
│       └── MetricTableCell.tsx            # Reusable metric cell
├── services/
│   └── data/
│       └── facebookAdsReportingService.ts # Data fetching service
└── App.tsx                               # Route configuration
```

## Usage

### Accessing the Page
1. Navigate to the Admin Panel (`/admin`)
2. Click "Facebook Ads Reporting" button in the admin header
3. Or directly visit `/facebook-ads-reporting`

### Using the Table
- **Period Selection**: Use the dropdown to change time periods
- **View Venue**: Click "View" button to go to individual venue dashboard
- **Share Link**: Click external link icon to open shareable link
- **Status Indicators**: Green (active), Yellow (paused), Red (inactive)

## Technical Details

### Data Flow
1. Page loads → Fetch all clients with Facebook ads integration
2. For each client → Fetch Facebook ads metrics via EventMetricsService
3. Calculate derived metrics (cost per lead, conversion rate, etc.)
4. Display in table format with trend indicators

### Metrics Calculation
- **Cost Per Lead**: `spend / leads`
- **Conversion Rate**: `(leads / clicks) * 100`
- **Cost Per Click**: `spend / clicks`
- **CTR**: Provided by Facebook API

### Error Handling
- Graceful handling of clients with no Facebook data
- Loading states for better UX
- Error messages for failed data fetches
- Fallback to zero metrics on errors

## Styling
- **Consistent Design**: Matches existing admin panel styling
- **Responsive**: Mobile-friendly with horizontal scroll
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Optimized rendering with React.memo

## Future Enhancements
- CSV export functionality
- Advanced filtering and sorting
- Real-time data updates
- Custom date range selection
- Bulk actions for multiple venues

