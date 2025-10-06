# Add Server-Side Environment Variables to Vercel

The OAuth callback is failing because Vercel's serverless functions can't access `VITE_` prefixed environment variables.

## Required Environment Variables

Add these to Vercel (without VITE_ prefix for server-side access):

```
GHL_CLIENT_ID = [same value as VITE_GHL_CLIENT_ID]
GHL_CLIENT_SECRET = [same value as VITE_GHL_CLIENT_SECRET]
```

## Steps:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `GHL_CLIENT_ID` with the same value as `VITE_GHL_CLIENT_ID`
3. Add `GHL_CLIENT_SECRET` with the same value as `VITE_GHL_CLIENT_SECRET`
4. Redeploy the project

This will allow the serverless function at `/leadconnector/oath` to access the OAuth credentials.
