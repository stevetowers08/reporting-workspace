@echo off
echo Updating .env.local with real Facebook credentials...

REM Create new .env.local with real Facebook credentials
(
echo # Vite Environment Variables
echo # Copy this file to .env.local and fill in your actual values
echo.
echo # Supabase Configuration
echo VITE_SUPABASE_URL=https://bdmcdyxjdkgitphieklb.supabase.co
echo VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw         
echo.
echo # Facebook OAuth - REAL CREDENTIALS FOUND!
echo VITE_FACEBOOK_CLIENT_ID=2922447491235718
echo VITE_FACEBOOK_CLIENT_SECRET=1931f7ba0db26d624129eedc0d4ee10f
echo VITE_FACEBOOK_ACCESS_TOKEN=EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD
echo.
echo # Google OAuth
echo VITE_GOOGLE_CLIENT_ID=1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com                                                                 
echo VITE_GOOGLE_CLIENT_SECRET=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
echo.
echo # Google Ads API
echo VITE_GOOGLE_ADS_DEVELOPER_TOKEN=5D7nPWHfNnpiMgxGOgNLlA
echo.
echo # GoHighLevel OAuth
echo VITE_GHL_CLIENT_ID=your_ghl_client_id
echo VITE_GHL_CLIENT_SECRET=your_ghl_client_secret
echo.
echo # Environment
echo NODE_ENV=development
) > .env.local.new

echo.
echo ✅ New .env.local file created as .env.local.new
echo.
echo 📋 TO COMPLETE THE FIX:
echo 1. Replace your current .env.local with .env.local.new
echo 2. Restart your dev server (npm run dev)
echo 3. Test the Facebook API - it should work now!
echo.
echo 🔍 REAL FACEBOOK CREDENTIALS FOUND:
echo App ID: 2922447491235718
echo App Secret: 1931f7ba0db26d624129eedc0d4ee10f
echo Access Token: EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD
echo.
pause
