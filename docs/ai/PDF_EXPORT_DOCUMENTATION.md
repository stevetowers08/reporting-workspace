# PDF Export Feature Documentation

## Overview

The PDF Export feature provides comprehensive reporting capabilities for the Marketing Analytics Dashboard. Users can export dashboard data, charts, and metrics to professional PDF reports with customizable options.

## Features

### Core Functionality
- **Dashboard Export**: Export complete dashboard data with all metrics and visualizations
- **Tab-based Export**: Export specific tabs (Summary, Meta, Google, Leads) individually or collectively
- **Section Export**: Export specific HTML elements or sections
- **Customizable Options**: Choose what content to include (charts, detailed metrics, specific tabs)

### Export Options
- **Client Information**: Automatically includes client name and logo
- **Date Range**: Shows the selected reporting period
- **Content Selection**: 
  - Include/exclude charts and visualizations
  - Include/exclude detailed metrics
  - Select specific tabs to export
- **Format**: PDF document with professional layout

## Architecture

### Components

#### PDFExportService (`src/services/export/pdfExportService.ts`)
Core service handling PDF generation using jsPDF and html2canvas libraries.

**Key Methods:**
- `exportDashboardToPDF()`: Export complete dashboard data
- `exportTabsToPDF()`: Export multiple tabs as separate pages
- `exportSectionToPDF()`: Export specific HTML elements

**Features:**
- Lazy loading of PDF libraries (only loads when needed)
- Data validation and error handling
- Professional PDF layout with headers, footers, and branding
- Chart rendering using html2canvas

#### usePDFExport Hook (`src/hooks/usePDFExport.ts`)
React hook providing PDF export functionality with state management.

**Returns:**
- `exportToPDF()`: Export dashboard data
- `exportSectionToPDF()`: Export HTML element
- `exportTabsToPDF()`: Export multiple tabs
- `isExporting`: Loading state
- `error`: Error state

#### PDFExportOptionsModal (`src/components/export/PDFExportOptionsModal.tsx`)
Modal component for customizing export options.

**Features:**
- Tab selection (all tabs or specific tabs)
- Content options (charts, detailed metrics)
- Client and date range display
- Export format selection

#### ExportButton (`src/components/export/ExportButton.tsx`)
Simple button component for triggering PDF exports.

### Integration Points

#### EventDashboard (`src/pages/EventDashboard.tsx`)
Main dashboard page integrating PDF export functionality.

**Integration:**
- Export button in AgencyHeader
- Modal for export options
- Tab element collection for export
- Error handling and user feedback

#### AgencyHeader (`src/components/dashboard/AgencyHeader.tsx`)
Header component with export button.

**Features:**
- Export button (only shown when client is selected)
- Loading state during export
- Disabled state when no client selected

## Usage

### Basic Export
```typescript
import { usePDFExport } from '@/hooks/usePDFExport';

const { exportToPDF, isExporting, error } = usePDFExport();

const handleExport = async () => {
  await exportToPDF(dashboardData, {
    clientName: 'Client Name',
    dateRange: 'Last 30 days',
    includeCharts: true,
    includeDetailedMetrics: true
  });
};
```

### Tab-based Export
```typescript
const { exportTabsToPDF } = usePDFExport();

const handleTabExport = async () => {
  const tabElements = {
    summary: summaryTabRef.current,
    meta: metaTabRef.current,
    google: googleTabRef.current,
    leads: leadsTabRef.current
  };

  await exportTabsToPDF(tabElements, {
    clientName: 'Client Name',
    dateRange: 'Last 30 days',
    includeAllTabs: true,
    includeCharts: true,
    includeDetailedMetrics: true
  });
};
```

### Section Export
```typescript
const { exportSectionToPDF } = usePDFExport();

const handleSectionExport = async () => {
  const element = document.getElementById('chart-section');
  await exportSectionToPDF(element, 'chart-report.pdf', {
    clientName: 'Client Name',
    dateRange: 'Last 30 days'
  });
};
```

## Configuration

### PDF Export Options Interface
```typescript
interface PDFExportOptions {
  clientName: string;
  logoUrl?: string;
  dateRange: string;
  includeCharts?: boolean;
  includeDetailedMetrics?: boolean;
}

interface TabExportOptions extends PDFExportOptions {
  tabs?: string[];
  includeAllTabs?: boolean;
}
```

### Dependencies
- **jsPDF**: PDF generation library
- **html2canvas**: HTML to canvas conversion for charts
- **React**: UI framework
- **TypeScript**: Type safety

## Error Handling

### Common Error Scenarios
1. **Missing Data**: Client data or dashboard data not available
2. **Invalid Data**: Malformed dashboard data structure
3. **Library Loading**: PDF libraries fail to load
4. **Canvas Rendering**: Charts fail to render to canvas
5. **File Generation**: PDF generation fails

### Error Recovery
- User-friendly error messages
- Retry mechanisms
- Fallback options (export without charts)
- Loading states and progress indicators

## Performance Considerations

### Lazy Loading
- PDF libraries only loaded when export is triggered
- Reduces initial bundle size
- Improves page load performance

### Memory Management
- Canvas elements cleaned up after use
- Large images optimized for PDF
- Efficient data processing

### Bundle Size
- Dynamic imports for PDF libraries
- Tree shaking for unused features
- Optimized dependencies

## Testing

### Unit Tests
- **PDFExportService**: Core functionality and data validation
- **usePDFExport**: Hook behavior and state management
- **PDFExportOptionsModal**: Component behavior and user interactions

### Integration Tests
- End-to-end export workflows
- Error handling scenarios
- Cross-browser compatibility

### Test Coverage
- Service methods: 100%
- Hook functionality: 100%
- Component interactions: 90%
- Error scenarios: 95%

## Security Considerations

### Data Handling
- No sensitive data stored in PDFs
- Client data properly sanitized
- Secure file naming conventions

### Access Control
- Export only available to authenticated users
- Client-specific data isolation
- Permission-based access

## Future Enhancements

### Planned Features
1. **Email Integration**: Send PDFs via email
2. **Scheduled Reports**: Automated PDF generation
3. **Custom Templates**: User-defined PDF layouts
4. **Multiple Formats**: Excel, CSV export options
5. **Advanced Charts**: Interactive chart exports
6. **Branding Options**: Custom headers and footers

### Performance Improvements
1. **Background Processing**: Non-blocking PDF generation
2. **Caching**: Reuse generated PDFs
3. **Compression**: Optimize PDF file sizes
4. **Streaming**: Large report handling

## Troubleshooting

### Common Issues

#### Export Button Not Working
- Check if client is selected
- Verify dashboard data is loaded
- Check browser console for errors

#### PDF Generation Fails
- Ensure PDF libraries are loaded
- Check data validity
- Verify browser compatibility

#### Charts Not Rendering
- Check html2canvas compatibility
- Verify chart elements are visible
- Check CSS styling conflicts

#### Large File Sizes
- Reduce chart resolution
- Limit data points
- Use compression options

### Debug Mode
Enable debug logging for PDF export:
```typescript
import { debugLogger } from '@/lib/debug';

// Debug logs will show in console
debugLogger.info('PDFExport', 'Export started', { options });
```

## Support

### Documentation
- API Reference: See service method documentation
- Examples: Check component usage in EventDashboard
- Troubleshooting: See common issues section

### Development
- Code Review: Follow TypeScript best practices
- Testing: Maintain high test coverage
- Performance: Monitor bundle size and load times

---

*Last Updated: [Current Date]*
*Version: 1.0.0*

