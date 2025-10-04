# Integration Setup Guide

This guide will help you connect your marketing platforms to the Event Metrics Dashboard using OAuth 2.0 authentication.

## 🚀 Quick Start

1. Go to **Admin Panel** → **Integrations** → **Settings** button
2. Click **"Connect with [Platform]"** for each integration you want
3. Complete OAuth authorization in the popup window
4. Integration will automatically connect and start syncing data

## 📊 Supported Platforms

### 1. Facebook Ads (Meta)

**OAuth Setup:**

1. Go to [Facebook Developer Portal](https://developers.facebook.com)
2. Create a new app → **Business** type
3. Add **Facebook Login** product
4. Configure OAuth redirect URIs
5. Get your **App ID** and **App Secret**

**Required Permissions:**

- `ads_read` - Read ad performance data
- `ads_management` - Access campaign details  
- `business_management` - Access business account info

**Integration Process:**

1. Click **"Connect with Facebook"** in the dashboard
2. Authorize the app in the popup window
3. Grant required permissions
4. Integration automatically connects

### 2. Google Ads

**OAuth Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Ads API**
4. Create **OAuth 2.0 Client ID** credentials
5. Configure authorized redirect URIs
6. Get your **Client ID** and **Client Secret**

**Required Scopes:**

- `https://www.googleapis.com/auth/adwords` - Access Google Ads data

**Integration Process:**

1. Click **"Connect with Google"** in the dashboard
2. Sign in with your Google account
3. Grant access to Google Ads data
4. Integration automatically connects

### 3. Go High Level (GHL)

**OAuth Setup:**

1. Go to [GoHighLevel Marketplace](https://marketplace.gohighlevel.com)
2. Sign up for developer account
3. Create a new app in the marketplace
4. Configure OAuth settings and scopes
5. Get your **Client ID** and **Client Secret**

**Required Scopes:**

- `contacts.read` - Read contact data
- `opportunities.read` - Read opportunity/pipeline data
- `locations.read` - Access location information

**Integration Process:**

1. Click **"Connect with GoHighLevel"** in the dashboard
2. Select your location in the popup
3. Authorize the app
4. Integration automatically connects

### 4. Google Sheets

**OAuth Setup:**

1. Use the same Google Cloud project as Google Ads
2. Enable **Google Sheets API** and **Google Drive API**
3. Use the same OAuth 2.0 credentials
4. Configure additional scopes for Sheets access

**Required Scopes:**

- `https://www.googleapis.com/auth/spreadsheets.readonly` - Read sheet data
- `https://www.googleapis.com/auth/drive.readonly` - Access sheet metadata

**Integration Process:**

1. Click **"Connect with Google"** in the dashboard
2. Sign in with your Google account
3. Grant access to Google Sheets and Drive
4. Integration automatically connects

## 🔧 OAuth Integration Features

**Automatic Connection Testing:**

- OAuth flow validates credentials automatically
- Real-time connection status indicators
- Automatic token refresh handling
- Secure credential storage

## 🛠️ Troubleshooting

### Common OAuth Issues

**Facebook Ads:**

- ❌ "App not approved" → Complete Facebook app review process
- ❌ "Invalid redirect URI" → Check OAuth redirect URI configuration
- ❌ "Insufficient permissions" → Request additional scopes in app settings

**Google Ads:**

- ❌ "OAuth consent screen not configured" → Set up consent screen in Google Cloud Console
- ❌ "Invalid client ID" → Verify OAuth 2.0 credentials
- ❌ "Scope not authorized" → Add required scopes to OAuth request

**Go High Level:**

- ❌ "App not registered" → Register app in GoHighLevel Marketplace
- ❌ "Invalid client credentials" → Check Client ID and Secret
- ❌ "Location access denied" → Ensure user has access to selected location

**Google Sheets:**

- ❌ "API not enabled" → Enable Google Sheets API in Cloud Console
- ❌ "Insufficient permissions" → Grant access to specific spreadsheets
- ❌ "Quota exceeded" → Check API usage limits

## 🔒 Security Best Practices

1. **Use OAuth 2.0** instead of API keys for user authentication
2. **Store tokens securely** in encrypted storage
3. **Implement token refresh** for long-lived access
4. **Use HTTPS only** for all OAuth redirects
5. **Request minimal scopes** - only what you need
6. **Monitor API usage** for unusual activity

## 📈 Data Sync

Once configured, the dashboard will:

- **Sync data every 24 hours** automatically
- **Show real-time status** in admin panel
- **Alert on connection issues**
- **Store data locally** for offline access

## 🆘 Need Help?

If you're having trouble with any integration:

1. Check the **Test Connection** results
2. Verify all credentials are correct
3. Ensure API permissions are granted
4. Check platform-specific documentation
5. Contact support with error details

## 🔄 Next Steps

After setting up integrations:

1. **Test all connections**
2. **Save configuration**
3. **Check dashboard data**
4. **Set up automated reports**
5. **Monitor sync status**

---

## 🚀 Production Implementation

For production deployment, you'll need to:

1. **Register OAuth Apps** with each platform
2. **Configure Environment Variables** for client credentials
3. **Implement OAuth Callback Handling** on your server
4. **Set up Secure Token Storage** (database with encryption)
5. **Add Token Refresh Logic** for expired tokens
6. **Implement Error Handling** for failed OAuth flows

**Environment Variables Needed:**

```bash
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GHL_CLIENT_ID=your_ghl_client_id
```

**Note:** This demo simulates OAuth connections. In production, implement proper OAuth callback handling and secure token storage.
