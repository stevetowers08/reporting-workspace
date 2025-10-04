# Facebook Marketing API Setup & Troubleshooting Guide

## 🚨 **CURRENT ISSUE: Meta Ads Data Not Pulling**

### **Root Cause**
The Facebook API credentials exist but are not properly configured in the environment variables. The system has the credentials but can't access them.

### **Quick Fix**
Create a `.env.local` file in your project root with these REAL credentials:

```bash
# Facebook OAuth - REAL CREDENTIALS
VITE_FACEBOOK_CLIENT_ID=2922447491235718
VITE_FACEBOOK_CLIENT_SECRET=1931f7ba0db26d624129eedc0d4ee10f
VITE_FACEBOOK_ACCESS_TOKEN=EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD
```

Then restart your dev server: `npm run dev`

---

## 📋 **Complete Facebook Marketing API Documentation**

### **1. App Configuration**

#### **Facebook App Details**
- **App ID**: `2922447491235718`
- **App Secret**: `1931f7ba0db26d624129eedc0d4ee10f`
- **App Name**: Marketing Analytics Dashboard
- **App Type**: Business

#### **Required Permissions**
- `ads_read` - Read ad performance data
- `ads_management` - Access campaign details  
- `business_management` - Access business account info

#### **OAuth Redirect URIs**
- Development: `http://localhost:8082/oauth/callback`
- Production: `https://yourdomain.com/oauth/callback`

### **2. API Implementation**

#### **Service Architecture**
```typescript
// src/services/api/facebookAdsService.ts
export class FacebookAdsService {
  private static readonly API_VERSION = 'v19.0';
  private static readonly BASE_URL = `https://graph.facebook.com/${this.API_VERSION}`;
  
  // Token management with multiple fallbacks
  static async getAccessToken(): Promise<string> {
    // 1. Try unified credential service
    // 2. Fallback to localStorage OAuth tokens
    // 3. Fallback to environment variables
  }
}
```

#### **Rate Limiting & Retry Logic**
- **Rate Limit**: 10 requests/second (100ms intervals)
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Comprehensive error logging and fallbacks

#### **Key API Methods**
1. `getAccessToken()` - Token management with fallbacks
2. `authenticate()` - Validate token with Facebook
3. `getAdAccounts()` - Fetch available ad accounts
4. `getAccountMetrics()` - Get campaign performance data
5. `getDemographicBreakdown()` - Age/gender demographics
6. `getPlatformBreakdown()` - Facebook vs Instagram data

### **3. Data Flow**

```
Facebook Marketing API → FacebookAdsService → EventMetricsService → Dashboard Components
```

#### **Authentication Flow**
1. **OAuth Flow**: User clicks "Connect Facebook" → Redirects to Facebook → Returns with code → Exchanges for token
2. **Token Storage**: Stored in localStorage and unified credential service
3. **Token Validation**: Validates token with Facebook Graph API `/me` endpoint
4. **Token Refresh**: Handles token expiration and refresh

#### **Data Fetching Flow**
1. **Get Ad Accounts**: Fetches user's ad accounts
2. **Get Account Metrics**: Fetches insights for specific account
3. **Parse Actions**: Extracts lead/conversion data from actions array
4. **Calculate Metrics**: Computes CTR, CPC, CPM, etc.
5. **Fetch Demographics**: Gets age/gender breakdown
6. **Fetch Platform Data**: Gets Facebook vs Instagram breakdown

### **4. Error Handling**

#### **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `No Facebook access token found` | Missing credentials | Set `VITE_FACEBOOK_ACCESS_TOKEN` in `.env.local` |
| `(#100) age, gender are not valid for fields param` | Wrong API usage | Use `breakdowns` parameter, not `fields` |
| `(#100) placement is not valid for breakdowns param` | Wrong API usage | Use correct breakdown parameters |
| `Rate limited` | Too many requests | Implement exponential backoff |
| `Token expired` | Token needs refresh | Re-authenticate through OAuth |

#### **Debug Tools**
- **Browser Console**: Check for debug logs
- **FacebookDebugPanel**: Built-in connection tester
- **Debug Script**: `debug-facebook-api.js` for comprehensive testing

### **5. Testing & Validation**

#### **Manual Testing Steps**
1. **Check Environment**: Verify `.env.local` has correct credentials
2. **Test Authentication**: Use `FacebookAdsService.authenticate()`
3. **Test Ad Accounts**: Use `FacebookAdsService.getAdAccounts()`
4. **Test Metrics**: Use `FacebookAdsService.getAccountMetrics()`
5. **Check Dashboard**: Verify data appears in Meta Ads tab

#### **Debug Commands**
```javascript
// Run in browser console
const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
const isAuth = await FacebookAdsService.authenticate();
console.log('Auth result:', isAuth);
```

### **6. Production Considerations**

#### **Security**
- **Never commit** `.env.local` to version control
- **Use environment variables** for production
- **Implement token refresh** for long-running apps
- **Validate tokens** before each API call

#### **Performance**
- **Rate limiting** prevents API throttling
- **Caching** reduces API calls
- **Error boundaries** prevent app crashes
- **Fallback data** maintains UX during API issues

#### **Monitoring**
- **Log all API calls** for debugging
- **Monitor rate limits** and adjust accordingly
- **Track token expiration** and refresh proactively
- **Alert on API failures** for quick response

### **7. Troubleshooting Checklist**

#### **Data Not Loading**
- [ ] Check `.env.local` has correct `VITE_FACEBOOK_ACCESS_TOKEN`
- [ ] Verify token hasn't expired
- [ ] Check browser console for errors
- [ ] Test authentication with `FacebookAdsService.authenticate()`
- [ ] Verify ad account has data in the specified date range

#### **Authentication Issues**
- [ ] Check Facebook app permissions in developer console
- [ ] Verify redirect URI matches exactly
- [ ] Ensure app is not in development mode restrictions
- [ ] Check if token has required scopes

#### **API Errors**
- [ ] Check Facebook API status page
- [ ] Verify API version compatibility
- [ ] Check rate limiting headers
- [ ] Review error messages for specific issues

### **8. API Reference**

#### **Facebook Marketing API Endpoints Used**
- `GET /me` - Validate token
- `GET /me/adaccounts` - Get ad accounts
- `GET /{ad-account-id}/insights` - Get account metrics
- `GET /{ad-account-id}/insights?breakdowns=age,gender` - Demographics
- `GET /{ad-account-id}/insights?breakdowns=publisher_platform` - Platform data

#### **Required Parameters**
- `access_token` - Facebook access token
- `fields` - Metrics to retrieve (impressions, clicks, spend, actions)
- `breakdowns` - Data segmentation (age, gender, platform)
- `time_range` - Date range for data
- `level` - Data level (account, campaign, adset, ad)

---

## 🚀 **Next Steps**

1. **Create `.env.local`** with the credentials above
2. **Restart dev server** with `npm run dev`
3. **Test the connection** using the debug tools
4. **Verify data loads** in the Meta Ads dashboard tab
5. **Monitor for any remaining issues** and debug as needed

The Facebook API should work immediately once the environment variables are properly set!
