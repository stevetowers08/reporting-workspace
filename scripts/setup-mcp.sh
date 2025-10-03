#!/bin/bash

# MCP Server Setup Script
# This script installs dependencies and sets up MCP servers

set -e

echo "🚀 Setting up MCP servers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Creating package.json..."
    cat > package.json << EOF
{
  "name": "mcp-servers",
  "version": "1.0.0",
  "description": "MCP servers for various services",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "@supabase/supabase-js": "^2.39.0",
    "@octokit/rest": "^20.0.2",
    "playwright": "^1.40.0"
  },
  "keywords": ["mcp", "servers", "automation"],
  "author": "",
  "license": "MIT"
}
EOF
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install

# Make MCP server files executable
echo "🔧 Making MCP server files executable..."
chmod +x mcp-servers/*.js

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
    echo "⚠️  .env.development file not found. Please create it with your environment variables."
    exit 1
fi

# Check if .cursor/mcp.json exists
if [ ! -f ".cursor/mcp.json" ]; then
    echo "⚠️  .cursor/mcp.json file not found. Please create it with your MCP configuration."
    exit 1
fi

echo "✅ MCP server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart Cursor to load the MCP configuration"
echo "2. Test the MCP servers by using them in your conversations"
echo "3. Check the Cursor logs if you encounter any issues"
echo ""
echo "🔧 Available MCP servers:"
echo "- Supabase: Database operations"
echo "- GitHub: Repository management"
echo "- Vercel: Deployment management"
echo "- Playwright: Browser automation"
echo "- Browser Automation: Advanced browser automation"
echo "- Airtable: Data management"
echo ""
echo "📚 For troubleshooting, check the Cursor documentation on MCP servers."
