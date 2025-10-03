# Event Dashboard Design Documentation

## Overview

This document provides comprehensive documentation for the Event Dashboard redesign, covering design decisions, implementation details, and technical specifications.

## Key Features

### Facebook vs Google Ads Comparison

The Summary tab includes a comprehensive side-by-side comparison of Facebook and Google Ads performance:

- **Meta Ads Performance Card**: Shows leads, spend, cost per lead, CTR, and CPC
- **Google Ads Performance Card**: Shows leads, spend, cost per lead, CTR, and CPC  
- **Performance Summary**: Aggregated totals for total leads, total spend, and average cost per lead
- **Visual Design**: Clean card layout with platform-specific icons (blue 'f' for Meta, red 'G' for Google)

This comparison allows users to quickly assess which platform is performing better for lead generation without financial metrics.

## Design Philosophy

### Core Principles

- **Lead-Focused**: Dashboard prioritizes lead generation metrics over revenue/conversion metrics
- **Clean & Professional**: Minimal design with professional slate color scheme
- **Laptop-Optimized**: Compact layout designed for laptop screen sizes
- **Data-Driven**: Clear hierarchy with KPI cards and supporting charts

### Key Distinctions

- **Facebook & Google Ads**: "Conversions" = Leads (tracking lead generation)
- **Sales/CRM Data**: "Conversions" = Closed/Won Deals (from Go High Level)
- **No Financial Metrics**: Removed ROI, ROAS, revenue tracking (leads-focused approach)

## Color Scheme

### Professional Slate Palette

```css
/* Background Colors */
bg-slate-50     /* Main dashboard background */
bg-slate-100    /* Secondary backgrounds */
bg-slate-200    /* Tab container background */
bg-slate-700    /* Header background */

/* Border Colors */
border-slate-200  /* Card borders */
border-slate-300  /* Tab container border */

/* Text Colors */
text-slate-600   /* Secondary text */
text-slate-700   /* Medium emphasis text */
text-slate-900   /* Primary text */

/* Status Colors */
text-green-600   /* Positive changes */
text-red-600     /* Negative changes */
```

## Tab Design

### Segmented Control Style (Option 3)

- **Height**: `h-10` for TabsList, `py-2` for TabsTrigger
- **Padding**: `p-0.5` for container, `px-3` for triggers
- **Active State**: White background with subtle shadow
- **Hover Effects**: Smooth color transitions
- **Professional Appearance**: Clear contrast against slate background

```tsx
<TabsList className="w-full justify-start bg-slate-200 rounded-lg p-0.5 h-10 border border-slate-300">
  <TabsTrigger className="text-sm font-medium px-3 py-2 rounded-md flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=active]:font-semibold text-slate-600 hover:text-slate-800 transition-colors">
    Tab Name
  </TabsTrigger>
</TabsList>
```

## Layout Structure

### Summary Tab

- **Top KPI Cards**: 3 cards in single row
  - Total Leads
  - Total Spend
  - Cost Per Lead
- **Facebook vs Google Comparison**: Side-by-side performance cards
  - Meta Ads Performance (Leads, Spend, CPL, CTR, CPC)
  - Google Ads Performance (Leads, Spend, CPL, CTR, CPC)
  - Performance Summary (Total Leads, Total Spend, Avg CPL)
- **Charts Section**: 2 charts side-by-side
  - Event Types Distribution
  - Platform Performance

### Facebook Ads Tab

- **First Row**: 4 KPI cards
  - Leads
  - Cost Per Lead
  - Conversion Rate
  - Spent
- **Second Row**: 4 KPI cards
  - Impressions
  - Reach
  - Link Clicks
  - CTR
- **Charts Section**: Single time-based chart
  - Leads & Impressions Over Time

### Google Ads Tab

- **First Row**: 3 KPI cards
  - Impressions
  - Clicks
  - Leads
- **Second Row**: 4 KPI cards
  - Amount Spent
  - CPM
  - CPC
  - CTR
- **Charts Section**: 2 charts side-by-side
  - Impressions & CPM
  - Clicks & CPC

### Analytics Tab

- **Event Overview**: 4 KPI cards
- **Lead Performance**: Comprehensive analytics
- **Form & Conversion Analytics**: Detailed breakdowns

## Card Design Specifications

### KPI Cards

```tsx
<Card className="bg-white border border-slate-200 shadow-sm p-5">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-600 mb-2">Metric Name</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-900">Value</p>
        <div className="flex items-center gap-1">
          <span className="text-sm text-green-600 font-medium">↑ +X%</span>
        </div>
      </div>
    </div>
  </div>
</Card>
```

### Chart Cards

```tsx
<Card className="bg-white border border-slate-200 shadow-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-lg font-semibold text-slate-900">Chart Title</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="h-64">
      <ChartComponent />
    </div>
  </CardContent>
</Card>
```

## Typography Scale

### Font Sizes

- **KPI Values**: `text-3xl` (30px) - Primary metrics
- **Chart Titles**: `text-lg` (18px) - Chart headers
- **Labels**: `text-sm` (14px) - Metric labels
- **Secondary Text**: `text-xs` (12px) - Supporting information

### Font Weights

- **Primary Values**: `font-bold` - KPI numbers
- **Labels**: `font-medium` - Metric names
- **Active Tabs**: `font-semibold` - Selected tab emphasis

## Spacing & Layout

### Grid Systems

- **KPI Cards**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Charts**: `grid-cols-1 lg:grid-cols-2`
- **Facebook Ads**: First row `md:grid-cols-3`, Second row `lg:grid-cols-4`

### Spacing

- **Card Padding**: `p-5` for KPI cards, `p-4` for chart cards
- **Grid Gaps**: `gap-4` for main grids, `gap-3` for compact layouts
- **Section Margins**: `mb-6` between major sections

## Component Variants

### Card Variants

```typescript
// Added to card.tsx
const variants = {
  default: "rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6",
  compact: "rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4",
  spacious: "rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-8"
};
```

## Data Structure

### Facebook Ads Metrics

```typescript
interface FacebookAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;           // Conversions = Leads
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  // Removed: roas (financial metric)
}
```

### Google Ads Metrics

```typescript
interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  leads: number;           // Conversions = Leads
  conversions: number;     // Same as leads for ads
  ctr: number;
  cpc: number;
  conversionRate: number;  // Lead conversion rate
  // Removed: costPerConversion (financial metric)
}
```

### CRM Metrics (Go High Level)

```typescript
interface CRMMetrics {
  totalContacts: number;
  newContacts: number;
  totalOpportunities: number;
  wonOpportunities: number;    // Closed deals
  lostOpportunities: number;
  conversionRate: number;      // Deal conversion rate
  // Removed: pipelineValue, avgDealSize (financial metrics)
}
```

## Implementation Details

### Tab State Management

```tsx
const [activeTab, setActiveTab] = useState("summary");

// Tab options
const tabs = [
  { value: "summary", label: "Summary" },
  { value: "facebook", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "analytics", label: "Analytics" }
];
```

### Responsive Design

- **Mobile**: Single column layouts
- **Tablet**: 2-column grids for cards
- **Desktop**: 3-4 column grids for optimal space usage
- **Laptop**: Optimized for 13-15" screens

### Performance Considerations

- **Chart Height**: `h-64` (256px) for optimal visibility
- **Compact Layouts**: Reduced padding and spacing for laptop screens
- **Efficient Rendering**: Conditional rendering based on active tab

## Removed Features

### Financial Metrics Removed

- ROI (Return on Investment)
- ROAS (Return on Ad Spend)
- Revenue tracking
- Cost per conversion (financial)
- Pipeline value
- Average deal size

### Conversion Context Clarification

- **Ads Platforms**: Conversions = Leads generated
- **CRM Platform**: Conversions = Deals closed/won
- **No Revenue Tracking**: Focus on lead generation and deal closure

## Future Considerations

### Potential Enhancements

- **Custom Date Ranges**: User-selectable time periods
- **Export Functionality**: PDF/Excel export capabilities
- **Real-time Updates**: Live data refresh
- **Custom Dashboards**: User-configurable layouts

### Technical Debt

- **Chart Components**: Consider specialized chart libraries
- **Data Caching**: Implement caching for better performance
- **Error Handling**: Enhanced error states and loading indicators

## File Structure

```
src/
├── pages/
│   └── EventDashboard.tsx          # Main dashboard component
├── components/
│   └── ui/
│       ├── card.tsx                # Card component with variants
│       └── tabs.tsx                # Tab components
├── services/
│   ├── facebookAdsService.ts       # Facebook Ads API integration
│   ├── googleAdsService.ts         # Google Ads API integration
│   └── eventMetricsService.ts     # Main metrics service
└── styles/
    └── index.css                   # Custom typography classes
```

## Conclusion

This dashboard redesign focuses on lead generation metrics with a clean, professional design optimized for laptop screens. The segmented control tabs provide clear navigation, while the 2-row + 2-chart layout for Facebook Ads offers optimal data visualization without clutter.

The removal of financial metrics (ROI, ROAS) aligns with the lead-focused approach, while maintaining conversion tracking for both ad platforms (leads) and CRM (closed deals).
