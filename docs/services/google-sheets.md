# Google Sheets Integration

**Last Updated:** January 20, 2025  
**Service Version:** v4  
**Implementation Status:** ✅ Active

## Official Documentation

- **Google Sheets API:** https://developers.google.com/sheets/api
- **API Reference:** https://developers.google.com/sheets/api/reference/rest
- **Authentication Guide:** https://developers.google.com/sheets/api/guides/authorizing
- **Rate Limits:** https://developers.google.com/sheets/api/limits

## Current Implementation

### Service Location
- **File:** `src/services/auth/googleSheetsOAuthService.ts`
- **Class:** `GoogleSheetsOAuthService`
- **Authentication:** OAuth 2.0 with access tokens

### Key Features
- ✅ Spreadsheet data retrieval
- ✅ Event type column detection
- ✅ Guest count analysis
- ✅ Lead data processing
- ✅ Smart data parsing
- ✅ Token refresh automation

## Authentication Flow

### 1. OAuth Setup
```typescript
// Required environment variables
VITE_GOOGLE_SHEETS_CLIENT_ID=your_google_sheets_client_id
VITE_GOOGLE_SHEETS_CLIENT_SECRET=your_google_sheets_client_secret
```

### 2. Token Management
- Access tokens stored in Supabase `oauth_tokens` table
- Automatic token refresh using refresh tokens
- Secure token handling with encryption

### 3. Required Scopes
- `https://www.googleapis.com/auth/spreadsheets.readonly` - Read spreadsheet data
- `https://www.googleapis.com/auth/drive.readonly` - Read drive metadata

## API Endpoints

### Base Configuration
- **Base URL:** `https://sheets.googleapis.com/v4`
- **Rate Limit:** 100 requests/100 seconds
- **Authentication:** Bearer token in Authorization header

### Available Endpoints

#### Get Spreadsheet Values
```http
GET /spreadsheets/{spreadsheetId}/values/{range}
```
**Purpose:** Retrieve data from a specific range in a spreadsheet  
**Parameters:**
- `spreadsheetId`: The ID of the spreadsheet
- `range`: The A1 notation range (e.g., "Sheet1!A1:Z1000")

**Response:**
```json
{
  "range": "Sheet1!A1:Z1000",
  "majorDimension": "ROWS",
  "values": [
    ["Name", "Email", "Event Type", "Guest Count", "Date"],
    ["John Doe", "john@example.com", "Wedding", "150", "2025-06-15"],
    ["Jane Smith", "jane@example.com", "Corporate Event", "75", "2025-07-20"]
  ]
}
```

#### Get Spreadsheet Metadata
```http
GET /spreadsheets/{spreadsheetId}
```
**Purpose:** Get spreadsheet information and sheet details  
**Response:**
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "properties": {
    "title": "Lead Data",
    "locale": "en_US",
    "timeZone": "America/New_York"
  },
  "sheets": [
    {
      "properties": {
        "sheetId": 0,
        "title": "Sheet1",
        "gridProperties": {
          "rowCount": 1000,
          "columnCount": 26
        }
      }
    }
  ]
}
```

## Data Processing

### Event Type Detection
```typescript
// Smart detection of event type column
const detectEventTypeColumn = (headers: string[]): number => {
  const eventTypeKeywords = [
    'event type', 'event_type', 'type', 'event', 
    'occasion', 'celebration', 'party type'
  ];
  
  return headers.findIndex(header => 
    eventTypeKeywords.some(keyword => 
      header.toLowerCase().includes(keyword)
    )
  );
};
```

### Guest Count Analysis
```typescript
// Calculate average guests per lead
const calculateGuestCountStats = (data: string[][]): GuestCountStats => {
  const guestCountColumn = detectGuestCountColumn(data[0]);
  const guestCounts = data.slice(1)
    .map(row => parseInt(row[guestCountColumn]) || 0)
    .filter(count => count > 0);
  
  const average = guestCounts.reduce((sum, count) => sum + count, 0) / guestCounts.length;
  
  return {
    average: Math.round(average),
    total: guestCounts.length,
    distribution: getGuestCountDistribution(guestCounts)
  };
};
```

## Data Models

### GoogleSheet
```typescript
interface GoogleSheet {
  id: string;                    // Spreadsheet ID
  name: string;                 // Spreadsheet name
  url: string;                  // Spreadsheet URL
  lastModified: string;         // Last modified date
  sheetCount: number;           // Number of sheets
  properties: {
    title: string;              // Spreadsheet title
    locale: string;             // Locale setting
    timeZone: string;           // Time zone
  };
  sheets: SheetInfo[];          // Sheet information
}
```

### SheetInfo
```typescript
interface SheetInfo {
  sheetId: number;              // Sheet ID
  title: string;                // Sheet title
  gridProperties: {
    rowCount: number;           // Number of rows
    columnCount: number;        // Number of columns
  };
}
```

### LeadData
```typescript
interface LeadData {
  name: string;                 // Lead name
  email: string;                // Email address
  eventType: string;            // Type of event
  guestCount: number;           // Number of guests
  date: string;                 // Event date
  source?: string;              // Lead source
  phone?: string;               // Phone number
  notes?: string;               // Additional notes
}
```

### EventTypeBreakdown
```typescript
interface EventTypeBreakdown {
  eventType: string;            // Event type name
  count: number;                // Number of leads
  percentage: number;           // Percentage of total
  averageGuests: number;        // Average guests for this type
  totalValue?: number;          // Estimated total value
}
```

### GuestCountStats
```typescript
interface GuestCountStats {
  average: number;              // Average guests per lead
  total: number;                // Total number of leads
  distribution: {
    range: string;               // Guest count range (e.g., "50-100")
    count: number;              // Number of leads in range
    percentage: number;         // Percentage of total
  }[];
}
```

## Smart Data Detection

### Column Detection
```typescript
// Detect common column types automatically
const detectColumns = (headers: string[]) => {
  const columns = {
    name: -1,
    email: -1,
    eventType: -1,
    guestCount: -1,
    date: -1,
    phone: -1
  };
  
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
      columns.name = index;
    } else if (lowerHeader.includes('email')) {
      columns.email = index;
    } else if (lowerHeader.includes('event') && lowerHeader.includes('type')) {
      columns.eventType = index;
    } else if (lowerHeader.includes('guest') && lowerHeader.includes('count')) {
      columns.guestCount = index;
    } else if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
      columns.date = index;
    } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) {
      columns.phone = index;
    }
  });
  
  return columns;
};
```

## Error Handling

### Common Error Codes
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (spreadsheet not found)
- `429` - Too Many Requests (rate limit exceeded)
- `400` - Bad Request (invalid range or parameters)

### Error Response Format
```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```

### Retry Logic
- Automatic retry for rate limit errors (429)
- Exponential backoff for temporary failures
- Circuit breaker pattern for persistent failures

## Rate Limiting

### Limits
- **Per User:** 100 requests/100 seconds
- **Per Project:** 300 requests/100 seconds
- **Burst Limit:** 10 requests/second

### Implementation
```typescript
// Rate limiting is handled automatically
const data = await GoogleSheetsOAuthService.getSpreadsheetValues(
  spreadsheetId,
  range
);
```

## Caching Strategy

### Cache Duration
- **Spreadsheet Data:** 2 minutes
- **Metadata:** 15 minutes
- **Processed Data:** 5 minutes

### Cache Keys
- Spreadsheet data: `gs_data_${spreadsheetId}_${range}`
- Metadata: `gs_meta_${spreadsheetId}`
- Processed data: `gs_processed_${spreadsheetId}_${hash}`

## Usage Examples

### Get Spreadsheet Data
```typescript
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';

// Get data from a specific range
const data = await GoogleSheetsOAuthService.getSpreadsheetValues(
  '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  'Sheet1!A1:Z1000'
);
```

### Process Lead Data
```typescript
// Process and analyze lead data
const leadData = await GoogleSheetsOAuthService.processLeadData(
  spreadsheetId,
  'Sheet1!A1:Z1000'
);

// Get event type breakdown
const eventTypes = leadData.eventTypeBreakdown;
console.log('Event Types:', eventTypes);

// Get guest count statistics
const guestStats = leadData.guestCountStats;
console.log('Average Guests:', guestStats.average);
```

### Handle Errors
```typescript
try {
  const data = await GoogleSheetsOAuthService.getSpreadsheetValues(
    spreadsheetId,
    range
  );
} catch (error) {
  if (error.code === 403) {
    // Permission denied, check sharing settings
    console.error('Spreadsheet not accessible');
  } else if (error.code === 404) {
    // Spreadsheet not found
    console.error('Spreadsheet does not exist');
  }
}
```

## Testing

### Test Environment
- Use test spreadsheets with sample data
- Mock API responses for unit tests
- Test with various data formats

### Test Data
```typescript
// Mock spreadsheet data for testing
const mockSpreadsheetData = {
  range: "Sheet1!A1:E4",
  values: [
    ["Name", "Email", "Event Type", "Guest Count", "Date"],
    ["John Doe", "john@example.com", "Wedding", "150", "2025-06-15"],
    ["Jane Smith", "jane@example.com", "Corporate Event", "75", "2025-07-20"],
    ["Bob Johnson", "bob@example.com", "Birthday Party", "25", "2025-08-10"]
  ]
};
```

## Security Considerations

### Token Security
- Tokens encrypted in database
- HTTPS only for all API calls
- Regular token rotation

### Data Privacy
- No PII stored locally
- GDPR compliant data handling
- Secure data transmission
- Spreadsheet access control

## Monitoring

### Metrics Tracked
- API call success rate
- Response times
- Rate limit usage
- Error frequency
- Data processing time

### Alerts
- High error rates (>5%)
- Rate limit approaching (80% usage)
- Token expiration warnings
- Data processing failures

## Troubleshooting

### Common Issues

#### Permission Denied
- Verify spreadsheet is shared with the service account
- Check OAuth scopes include required permissions
- Ensure spreadsheet is not private

#### Invalid Range
- Verify A1 notation is correct
- Check sheet name exists
- Ensure range is within spreadsheet bounds

#### Token Expired
```typescript
// Check token expiration
const isExpired = await GoogleSheetsOAuthService.isTokenExpired();
if (isExpired) {
  await GoogleSheetsOAuthService.refreshToken();
}
```

## Future Enhancements

### Planned Features
- [ ] Real-time data synchronization
- [ ] Advanced data validation
- [ ] Custom field mapping
- [ ] Data export functionality

### API Updates
- Monitor Google Sheets API updates
- Plan migration to newer API versions
- Implement new features as they become available
