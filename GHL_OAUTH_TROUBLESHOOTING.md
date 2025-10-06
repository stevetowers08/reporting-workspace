# GoHighLevel OAuth Troubleshooting Guide

## Issue: 500 INTERNAL_SERVER_ERROR - FUNCTION_INVOCATION_FAILED

### Root Causes Identified:

1. **Environment Variable Access Issue**: Vercel serverless functions cannot access `VITE_` prefixed variables
2. **Module System Mismatch**: CommonJS vs ES modules compatibility issue
3. **Missing OAuth Credentials**: GoHighLevel OAuth credentials not configured

### Fixes Applied:

#### 1. Fixed Environment Variable Access
- **Problem**: OAuth function used `process.env.VITE_*` variables which are only available in browser
- **Solution**: Added fallback to non-prefixed variables for serverless functions
- **Code Change**: 
  ```javascript
  // Before
  process.env.VITE_SUPABASE_URL
  
  // After  
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  ```

#### 2. Fixed Module System
- **Problem**: Function used CommonJS (`require`, `module.exports`) but package.json has `"type": "module"`
- **Solution**: Converted to ES modules (`import`, `export default`)
- **File Change**: Renamed `oath.js` to `oath.mjs` and updated `vercel.json`

#### 3. Enhanced Error Handling
- **Added**: Detailed logging of available environment variables
- **Added**: Better error messages for debugging
- **Added**: Fallback environment variable names

### Required Environment Variables

Add these to your Vercel project:

```bash
# Supabase (both formats for compatibility)
SUPABASE_URL=https://bdmcdyxjdkgitphieklb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://bdmcdyxjdkgitphieklb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# GoHighLevel OAuth (REQUIRED - Replace with actual values)
GHL_CLIENT_ID=your_actual_client_id
GHL_CLIENT_SECRET=your_actual_client_secret
VITE_GHL_CLIENT_ID=your_actual_client_id
VITE_GHL_CLIENT_SECRET=your_actual_client_secret

# App Configuration
APP_URL=https://tulenreporting.vercel.app
VITE_APP_URL=https://tulenreporting.vercel.app
```

### Setup Instructions

1. **Get GoHighLevel OAuth Credentials**:
   - Log into GoHighLevel account
   - Go to Settings > Integrations > Private Integrations
   - Create new integration or use existing
   - Copy Client ID and Client Secret

2. **Set Environment Variables**:
   - Run `setup-ghl-oauth-env.bat` (Windows) or `setup-ghl-oauth-env.sh` (Linux/Mac)
   - Or manually add variables in Vercel dashboard

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Testing the Fix

1. **Test OAuth URL**: `https://tulenreporting.vercel.app/api/leadconnector/oath?code=test`
2. **Check Logs**: Use Vercel dashboard to view function logs
3. **Verify Environment**: Function now logs available environment variables

### Common Issues & Solutions

#### Issue: "Missing Supabase environment variables"
- **Cause**: Environment variables not set in Vercel
- **Solution**: Add both `SUPABASE_URL` and `VITE_SUPABASE_URL` variables

#### Issue: "Missing GoHighLevel OAuth credentials"  
- **Cause**: GHL credentials not configured
- **Solution**: Add `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` variables

#### Issue: "No authorization code received"
- **Cause**: OAuth callback URL not properly configured
- **Solution**: Ensure redirect URI matches: `https://tulenreporting.vercel.app/api/leadconnector/oath`

#### Issue: "Token exchange failed"
- **Cause**: Invalid OAuth credentials or expired code
- **Solution**: Verify GHL credentials and ensure code is fresh

### Debugging Steps

1. **Check Function Logs**:
   ```bash
   vercel logs https://tulenreporting.vercel.app/api/leadconnector/oath
   ```

2. **Test Environment Variables**:
   - Function now logs available env vars
   - Look for missing variables in logs

3. **Verify OAuth Flow**:
   - Check GoHighLevel integration settings
   - Ensure redirect URI is correct
   - Test with fresh authorization code

### File Changes Made

1. **api/leadconnector/oath.js** → **api/leadconnector/oath.mjs**
   - Converted to ES modules
   - Fixed environment variable access
   - Enhanced error handling

2. **vercel.json**
   - Updated function path to `.mjs`

3. **vercel-env-vars.txt**
   - Added all required environment variables
   - Added both prefixed and non-prefixed versions

4. **setup-ghl-oauth-env.bat/sh**
   - Created setup scripts for easy configuration

### Next Steps

1. Run the setup script to configure OAuth credentials
2. Deploy to Vercel
3. Test the OAuth flow
4. Monitor logs for any remaining issues

The OAuth function should now work correctly with proper error handling and logging.
