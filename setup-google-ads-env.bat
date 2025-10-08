@echo off
echo Setting up Google Ads OAuth Environment Variables
echo ================================================

echo.
echo Please provide the following Google OAuth credentials:
echo.

set /p GOOGLE_CLIENT_ID="Enter your Google OAuth Client ID: "
set /p GOOGLE_CLIENT_SECRET="Enter your Google OAuth Client Secret: "
set /p GOOGLE_ADS_DEVELOPER_TOKEN="Enter your Google Ads Developer Token: "

echo.
echo Creating .env.local file with Google OAuth credentials...

echo # Google OAuth Configuration > .env.local
echo VITE_GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID% >> .env.local
echo VITE_GOOGLE_CLIENT_SECRET=%GOOGLE_CLIENT_SECRET% >> .env.local
echo VITE_GOOGLE_ADS_DEVELOPER_TOKEN=%GOOGLE_ADS_DEVELOPER_TOKEN% >> .env.local

echo.
echo Environment variables have been set in .env.local
echo.
echo Next steps:
echo 1. Restart your development server
echo 2. Try connecting to Google Ads again
echo.
echo Note: Make sure your Google Cloud Console project has:
echo - Google Ads API enabled
echo - OAuth consent screen configured
echo - Authorized redirect URIs: http://localhost:5173/oauth/callback and https://tulenreporting.vercel.app/oauth/callback
echo.

pause
