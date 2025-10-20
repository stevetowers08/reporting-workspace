#!/bin/bash
# Script to add environment variables to Netlify

echo "🔧 Adding environment variables to Netlify..."

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Login to Netlify (if not already logged in)
echo "🔐 Logging into Netlify..."
netlify login

# Add environment variables
echo "📝 Adding environment variables..."

# Supabase Configuration
netlify env:set VITE_SUPABASE_URL "your_supabase_url_here"
netlify env:set VITE_SUPABASE_ANON_KEY "your_supabase_anon_key_here"

# App Configuration
netlify env:set VITE_APP_NAME "Marketing Analytics Dashboard"
netlify env:set VITE_APP_VERSION "1.0.0"
netlify env:set VITE_APP_ENV "production"

# Feature Flags
netlify env:set VITE_ENABLE_DEBUG "false"
netlify env:set VITE_ENABLE_ANALYTICS "true"
netlify env:set VITE_ENABLE_ERROR_REPORTING "true"

# Performance Settings
netlify env:set VITE_CACHE_TTL "300000"
netlify env:set VITE_CACHE_MAX_SIZE "100"
netlify env:set VITE_API_TIMEOUT "30000"

# Security
netlify env:set VITE_ENCRYPTION_KEY "your_production_encryption_key_here"

echo "✅ Environment variables added!"
echo ""
echo "⚠️  IMPORTANT: Update the placeholder values with your actual credentials:"
echo "   - Replace 'your_supabase_url_here' with your actual Supabase URL"
echo "   - Replace 'your_supabase_anon_key_here' with your actual Supabase anon key"
echo "   - Replace 'your_production_encryption_key_here' with a secure key"
echo ""
echo "🌐 You can also add them manually at: https://app.netlify.com/sites/YOUR_SITE_NAME/settings/deploys#environment-variables"
