#!/bin/bash

echo "Setting up Google Ads OAuth Environment Variables"
echo "================================================"

echo ""
echo "Please provide the following Google OAuth credentials:"
echo ""

read -p "Enter your Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "Enter your Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
read -p "Enter your Google Ads Developer Token: " GOOGLE_ADS_DEVELOPER_TOKEN

echo ""
echo "Adding Google Ads configuration to .env file..."

# Add Google Ads configuration to .env file
cat >> .env << EOF

# Google Ads API Configuration
VITE_GOOGLE_ADS_CLIENT_ID=$GOOGLE_CLIENT_ID
VITE_GOOGLE_ADS_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=$GOOGLE_ADS_DEVELOPER_TOKEN
VITE_GOOGLE_ADS_REDIRECT_URI=http://localhost:5173/oauth/callback
EOF

echo ""
echo "Environment variables have been added to .env file"
echo ""
echo "Next steps:"
echo "1. Restart your development server"
echo "2. Try connecting to Google Ads again"
echo ""
echo "Note: Make sure your Google Cloud Console project has:"
echo "- Google Ads API enabled"
echo "- OAuth consent screen configured"
echo "- Authorized redirect URIs: http://localhost:5173/oauth/callback and https://tulenreporting.vercel.app/oauth/callback"
echo ""
