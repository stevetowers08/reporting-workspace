#!/bin/bash

# Go High Level OAuth Environment Setup Script
# This script helps you set up the required environment variables for GHL OAuth

echo "🔧 Go High Level OAuth Environment Setup"
echo "========================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "✅ Created .env.local from env.example"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🔍 Current GHL environment variables:"
echo "GHL_CLIENT_ID: ${GHL_CLIENT_ID:-'NOT SET'}"
echo "GHL_CLIENT_SECRET: ${GHL_CLIENT_SECRET:-'NOT SET'}"
echo "VITE_GHL_CLIENT_ID: ${VITE_GHL_CLIENT_ID:-'NOT SET'}"
echo "VITE_GHL_CLIENT_SECRET: ${VITE_GHL_CLIENT_SECRET:-'NOT SET'}"

echo ""
echo "📋 To fix OAuth issues, you need to:"
echo "1. Get your GHL Client ID and Secret from: https://marketplace.gohighlevel.com/"
echo "2. Update your .env.local file with:"
echo "   VITE_GHL_CLIENT_ID=your_client_id_here"
echo "   VITE_GHL_CLIENT_SECRET=your_client_secret_here"
echo ""
echo "3. Make sure your redirect URI is set to:"
echo "   https://your-domain.com/api/leadconnector/oath"
echo ""
echo "4. Restart your development server after updating .env.local"

# Check if variables are set
if [ -z "$GHL_CLIENT_ID" ] && [ -z "$VITE_GHL_CLIENT_ID" ]; then
    echo ""
    echo "❌ GHL_CLIENT_ID is not set!"
    echo "   Please set VITE_GHL_CLIENT_ID in your .env.local file"
    exit 1
fi

if [ -z "$GHL_CLIENT_SECRET" ] && [ -z "$VITE_GHL_CLIENT_SECRET" ]; then
    echo ""
    echo "❌ GHL_CLIENT_SECRET is not set!"
    echo "   Please set VITE_GHL_CLIENT_SECRET in your .env.local file"
    exit 1
fi

echo ""
echo "✅ Environment variables are properly set!"
echo "🚀 You can now test the OAuth flow"