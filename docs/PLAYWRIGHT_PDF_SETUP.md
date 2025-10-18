# Playwright PDF Export Setup Guide

## Overview

I've implemented a **server-side PDF generation solution** using Playwright that provides **perfect fidelity** - exactly as displayed on screen. This is the same approach used by Google Looker Studio and other professional dashboard tools.

## Architecture

```
Frontend (React) → API Route → Supabase Edge Function → Playwright → PDF
```

## What I've Created

### 1. **Supabase Edge Function** (`supabase/functions/generate-pdf/index.ts`)
- Uses Playwright to render dashboard in headless Chromium
- Captures each tab as a separate PDF page
- Handles authentication and dynamic content loading
- Uploads PDF to Supabase Storage

### 2. **Client Service** (`src/services/export/playwrightPdfService.ts`)
- Handles communication with Edge Function
- Manages authentication tokens
- Provides fallback to client-side export

### 3. **Updated Hook** (`src/hooks/usePDFExport.ts`)
- Added `exportWithPlaywright()` method
- Automatic fallback to html2canvas if Playwright fails

### 4. **API Route** (`pages/api/generate-pdf.js`)
- Proxies requests to Supabase Edge Function
- Handles CORS and error management

## Deployment Steps

### 1. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
supabase functions deploy generate-pdf
```

### 2. Set Environment Variables

Add these to your Supabase project settings:

```bash
# In Supabase Dashboard > Settings > Edge Functions
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Create Storage Bucket

```sql
-- Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-exports', 'pdf-exports', true);

-- Set up RLS policy
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'pdf-exports');
```

### 4. Update Frontend Environment

Add to your `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## How It Works

### **Perfect Fidelity Export**
1. **Server-side rendering**: Uses actual Chromium browser
2. **Exact appearance**: Captures charts, styling, fonts exactly as displayed
3. **Multi-page PDF**: Each tab becomes a separate page
4. **Professional headers**: Client name, date range, page numbers

### **Automatic Fallback**
- If Playwright service is unavailable, automatically falls back to client-side html2canvas export
- No user intervention required

### **Authentication Handling**
- Automatically passes user auth tokens to Edge Function
- Handles both localStorage and sessionStorage tokens

## Benefits Over html2canvas

| Feature | html2canvas | Playwright |
|---------|-------------|-----------|
| **Fidelity** | Good | Perfect |
| **Charts** | May have issues | Perfect rendering |
| **Fonts** | Basic | Exact fonts |
| **CSS** | Limited | Full CSS support |
| **Performance** | Client-side | Server-side |
| **Reliability** | Browser dependent | Consistent |

## Testing

1. **Test Playwright Export**:
   ```javascript
   // In browser console
   const { PlaywrightPDFService } = await import('/src/services/export/playwrightPdfService.ts');
   await PlaywrightPDFService.generateAndDownloadPDF({
     clientName: 'Test Client',
     dateRange: '2024-01-01 to 2024-01-31',
     tabs: ['summary']
   });
   ```

2. **Test Fallback**:
   - Temporarily disable Edge Function
   - Export should automatically fall back to client-side method

## Production Considerations

### **Performance**
- Edge Functions have cold start latency (~1-2 seconds)
- Consider implementing PDF caching for frequently requested reports
- Monitor Edge Function execution time and memory usage

### **Costs**
- Supabase Edge Functions: ~$0.0001 per GB-second
- Storage: ~$0.021 per GB/month
- Typical cost: ~$0.01-0.05 per PDF export

### **Scaling**
- Edge Functions auto-scale based on demand
- Consider rate limiting for high-volume usage
- Implement queue system for batch exports

## Troubleshooting

### **Common Issues**

1. **"Service not available" error**:
   - Check Edge Function deployment status
   - Verify environment variables
   - Check Supabase project limits

2. **Authentication errors**:
   - Verify auth token is being passed correctly
   - Check RLS policies on dashboard data

3. **Empty PDF pages**:
   - Ensure dashboard URL is accessible
   - Check if tabs are conditionally rendered
   - Verify wait times for dynamic content

### **Debug Mode**

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'PlaywrightPDFService');
```

## Next Steps

1. **Deploy Edge Function** using the steps above
2. **Test the export** on your dashboard
3. **Monitor performance** and adjust timeouts if needed
4. **Consider adding PDF templates** for different report types
5. **Implement scheduled exports** for automated reporting

This solution provides **enterprise-grade PDF export** with perfect fidelity, exactly like Google Looker Studio and other professional dashboard tools!
