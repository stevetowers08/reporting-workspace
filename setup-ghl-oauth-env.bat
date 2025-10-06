@echo off
echo Setting up GoHighLevel OAuth environment variables for Vercel...
echo.

echo IMPORTANT: You need to add your actual GoHighLevel OAuth credentials!
echo.
echo 1. Go to your GoHighLevel account
echo 2. Navigate to Settings ^> Integrations ^> Private Integrations
echo 3. Create a new private integration or use existing one
echo 4. Copy the Client ID and Client Secret
echo.

set /p GHL_CLIENT_ID="Enter your GoHighLevel Client ID: "
set /p GHL_CLIENT_SECRET="Enter your GoHighLevel Client Secret: "

echo.
echo Setting environment variables in Vercel...

rem Update the vercel-env-vars.txt file
powershell -Command "(Get-Content 'vercel-env-vars.txt') -replace 'your_ghl_client_id_here', '%GHL_CLIENT_ID%' | Set-Content 'vercel-env-vars.txt'"
powershell -Command "(Get-Content 'vercel-env-vars.txt') -replace 'your_ghl_client_secret_here', '%GHL_CLIENT_SECRET%' | Set-Content 'vercel-env-vars.txt'"

echo.
echo Environment variables updated in vercel-env-vars.txt
echo.
echo Next steps:
echo 1. Deploy to Vercel: vercel --prod
echo 2. Or manually add these environment variables in Vercel dashboard:
echo    - GHL_CLIENT_ID=%GHL_CLIENT_ID%
echo    - GHL_CLIENT_SECRET=%GHL_CLIENT_SECRET%
echo    - VITE_GHL_CLIENT_ID=%GHL_CLIENT_ID%
echo    - VITE_GHL_CLIENT_SECRET=%GHL_CLIENT_SECRET%
echo.
echo 3. Test the OAuth flow at: https://tulenreporting.vercel.app/api/leadconnector/oath
echo.
pause