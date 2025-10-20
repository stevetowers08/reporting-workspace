#!/bin/bash
# Netlify deployment script for Marketing Analytics Dashboard

echo "🚀 Starting Netlify deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type checking
echo "🔍 Running type check..."
npm run type-check

# Run linting
echo "🧹 Running linter..."
npm run lint

# Build the project
echo "🏗️ Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output is in the 'dist' directory"
    echo ""
    echo "🌐 To deploy to Netlify:"
    echo "1. Go to https://app.netlify.com"
    echo "2. Click 'New site from Git'"
    echo "3. Connect your GitHub repository"
    echo "4. Set build command: npm run build"
    echo "5. Set publish directory: dist"
    echo "6. Click 'Deploy site'"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
