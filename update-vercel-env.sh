#!/bin/bash

echo "Updating Vercel environment variables..."

# Remove incorrect variables
echo "Removing incorrect VITE_GHL_CLIENT_ID..."
vercel env rm VITE_GHL_CLIENT_ID --yes

echo "Removing incorrect VITE_GHL_CLIENT_SECRET..."  
vercel env rm VITE_GHL_CLIENT_SECRET --yes

# Add correct variables
echo "Adding correct VITE_GHL_CLIENT_ID..."
echo "68e135aa17f574067cfb7e39-mgcefs9f" | vercel env add VITE_GHL_CLIENT_ID production

echo "Adding correct VITE_GHL_CLIENT_SECRET..."
echo "68e135aa17f574067cfb7e39-mgcefs9f" | vercel env add VITE_GHL_CLIENT_SECRET production

echo "Adding VITE_GHL_REDIRECT_URI..."
echo "https://reporting.tulenagency.com/oauth/callback" | vercel env add VITE_GHL_REDIRECT_URI production

echo "Environment variables updated!"
