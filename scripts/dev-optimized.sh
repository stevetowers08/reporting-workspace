#!/bin/bash

# Development Server Optimization Script
# Restarts the Vite dev server with optimized environment settings

echo "🔧 Optimizing Vite dev server environment..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Creating optimized environment file..."
    cat > .env.local << 'EOF'
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://bdmcdyxjdkgitphieklb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw

# Development Optimizations
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
VITE_LOG_LEVEL=info
VITE_CACHE_TTL=30000
VITE_CACHE_MAX_SIZE=25
VITE_API_TIMEOUT=5000
EOF
    echo "✅ Created optimized .env.local"
fi

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
    echo "❌ .env.development not found. Creating development overrides..."
    cat > .env.development << 'EOF'
# Development-specific overrides
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
VITE_CACHE_TTL=15000
VITE_CACHE_MAX_SIZE=10
VITE_API_TIMEOUT=3000
VITE_ENABLE_HOT_RELOAD=true
VITE_ENABLE_SOURCE_MAPS=true
VITE_ENABLE_DEV_TOOLS=true
EOF
    echo "✅ Created optimized .env.development"
fi

# Clear Vite cache for fresh start
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist

# Clear browser cache (if possible)
echo "🌐 Clearing browser cache..."
echo "   Please manually clear your browser cache or use Ctrl+Shift+R"

# Start optimized dev server
echo "🚀 Starting optimized Vite dev server..."
echo "   Environment: Development"
echo "   Optimizations: Enabled"
echo "   Hot Reload: Enabled"
echo "   Source Maps: Enabled"
echo "   Dev Tools: Enabled"
echo ""

# Start the dev server with optimized settings
npm run dev
