@echo off
echo Setting up GoHighLevel OAuth environment variables...

echo.
echo Add these environment variables to your .env file:
echo.
echo # GoHighLevel OAuth Configuration
echo GHL_CLIENT_ID=your_client_id
echo GHL_CLIENT_SECRET=your_client_secret
echo NEXT_PUBLIC_GHL_CLIENT_ID=your_client_id
echo NEXT_PUBLIC_APP_URL=http://localhost:5173
echo.

echo You can get these from your GoHighLevel Marketplace App:
echo 1. Go to https://marketplace.gohighlevel.com/
echo 2. Create or edit your marketplace app
echo 3. Set Distribution Type to "Sub-account - Both Can Install"
echo 4. Set Redirect URI to: http://localhost:5173/api/oauth/callback
echo 5. Copy the Client ID and Client Secret
echo.

pause
