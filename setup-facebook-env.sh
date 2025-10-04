#!/bin/bash

# Facebook API Setup Script
echo "🚀 Setting up Facebook API credentials..."

# Create .env.local with Facebook credentials
cat > .env.local << 'EOF'
# Vite Environment Variables
# Facebook OAuth - REAL CREDENTIALS
VITE_FACEBOOK_CLIENT_ID=2922447491235718
VITE_FACEBOOK_CLIENT_SECRET=1931f7ba0db26d624129eedc0d4ee10f
VITE_FACEBOOK_ACCESS_TOKEN=EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD

# Supabase Configuration
VITE_SUPABASE_URL=https://bdmcdyxjdkgitphieklb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw

# Google OAuth
VITE_GOOGLE_CLIENT_ID=1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=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

# Google Ads API
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token

# GoHighLevel OAuth
VITE_GHL_CLIENT_ID=your_ghl_client_id
VITE_GHL_CLIENT_SECRET=your_ghl_client_secret

# Google AI Studio (Gemini API)
VITE_GOOGLE_AI_API_KEY=your_google_ai_studio_api_key

# Environment
NODE_ENV=development
EOF

echo "✅ Created .env.local with Facebook credentials"
echo "🔄 Please restart your dev server: npm run dev"
echo "📊 Facebook API should now work in the Meta Ads tab"
