# GoHighLevel OAuth Fix for Vercel Production

## 🚨 **Issue**: "Invalid client credentials" Error on Vercel

The GoHighLevel OAuth integration is failing on production because the environment variables are not set in Vercel.

## 🔧 **Solution**: Add Environment Variables to Vercel

### Step 1: Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and log in
2. Navigate to your project: `reporting-workspace`
3. Go to **Settings** → **Environment Variables**

### Step 2: Add GoHighLevel OAuth Credentials
Add these environment variables:

```
VITE_GHL_CLIENT_ID=68e135aa17f574067cfb7e39
VITE_GHL_CLIENT_SECRET=68e135aa17f574067cfb7e39-mgcefs9f
```

### Step 3: Verify Redirect URI
Ensure your GoHighLevel OAuth app is configured with:
- **Redirect URI**: `https://tulenreporting.vercel.app/oauth/callback`

### Step 4: Redeploy
After adding the environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## 🔍 **Verification**

After redeployment, test the GoHighLevel connection:
1. Go to the agency integrations page
2. Click "Connect GoHighLevel"
3. Complete the OAuth flow
4. Verify the connection is successful

## 📋 **Current Status**

✅ **Local Development**: Working (credentials in `.env.local`)
❌ **Production (Vercel)**: Missing environment variables
✅ **OAuth App**: Correctly configured
✅ **Redirect URI**: Set to `https://tulenreporting.vercel.app/oauth/callback`

## 🎯 **Expected Result**

Once the environment variables are added to Vercel:
- GoHighLevel OAuth flow will work on production
- "Invalid client credentials" error will be resolved
- Total Contacts will display correctly after reconnection

---

**Next Steps**: Add the environment variables to Vercel and redeploy.
