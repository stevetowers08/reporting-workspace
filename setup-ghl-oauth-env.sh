#!/bin/bash
echo "Setting up GoHighLevel OAuth environment variables for Vercel..."
echo

echo "IMPORTANT: You need to add your actual GoHighLevel OAuth credentials!"
echo
echo "1. Go to your GoHighLevel account"
echo "2. Navigate to Settings > Integrations > Private Integrations"
echo "3. Create a new private integration or use existing one"
echo "4. Copy the Client ID and Client Secret"
echo

read -p "Enter your GoHighLevel Client ID: " GHL_CLIENT_ID
read -p "Enter your GoHighLevel Client Secret: " GHL_CLIENT_SECRET

echo
echo "Setting environment variables in Vercel..."

# Update the vercel-env-vars.txt file
sed -i "s/your_ghl_client_id_here/$GHL_CLIENT_ID/g" vercel-env-vars.txt
sed -i "s/your_ghl_client_secret_here/$GHL_CLIENT_SECRET/g" vercel-env-vars.txt

echo
echo "Environment variables updated in vercel-env-vars.txt"
echo
echo "Next steps:"
echo "1. Deploy to Vercel: vercel --prod"
echo "2. Or manually add these environment variables in Vercel dashboard:"
echo "   - GHL_CLIENT_ID=$GHL_CLIENT_ID"
echo "   - GHL_CLIENT_SECRET=$GHL_CLIENT_SECRET"
echo "   - VITE_GHL_CLIENT_ID=$GHL_CLIENT_ID"
echo "   - VITE_GHL_CLIENT_SECRET=$GHL_CLIENT_SECRET"
echo
echo "3. Test the OAuth flow at: https://tulenreporting.vercel.app/api/leadconnector/oath"
echo


