@echo off

REM Go High Level OAuth Environment Setup Script
REM This script helps you set up the required environment variables for GHL OAuth

echo 🔧 Go High Level OAuth Environment Setup
echo ========================================

REM Check if .env.local exists
if not exist ".env.local" (
    echo 📝 Creating .env.local file...
    copy env.example .env.local
    echo ✅ Created .env.local from env.example
) else (
    echo ✅ .env.local already exists
)

echo.
echo 🔍 Current GHL environment variables:
if defined GHL_CLIENT_ID (
    echo GHL_CLIENT_ID: %GHL_CLIENT_ID%
) else (
    echo GHL_CLIENT_ID: NOT SET
)

if defined GHL_CLIENT_SECRET (
    echo GHL_CLIENT_SECRET: SET
) else (
    echo GHL_CLIENT_SECRET: NOT SET
)

if defined VITE_GHL_CLIENT_ID (
    echo VITE_GHL_CLIENT_ID: %VITE_GHL_CLIENT_ID%
) else (
    echo VITE_GHL_CLIENT_ID: NOT SET
)

if defined VITE_GHL_CLIENT_SECRET (
    echo VITE_GHL_CLIENT_SECRET: SET
) else (
    echo VITE_GHL_CLIENT_SECRET: NOT SET
)

echo.
echo 📋 To fix OAuth issues, you need to:
echo 1. Get your GHL Client ID and Secret from: https://marketplace.gohighlevel.com/
echo 2. Update your .env.local file with:
echo    VITE_GHL_CLIENT_ID=your_client_id_here
echo    VITE_GHL_CLIENT_SECRET=your_client_secret_here
echo.
echo 3. Make sure your redirect URI is set to:
echo    https://your-domain.com/api/leadconnector/oath
echo.
echo 4. Restart your development server after updating .env.local

REM Check if variables are set
if not defined GHL_CLIENT_ID if not defined VITE_GHL_CLIENT_ID (
    echo.
    echo ❌ GHL_CLIENT_ID is not set!
    echo    Please set VITE_GHL_CLIENT_ID in your .env.local file
    exit /b 1
)

if not defined GHL_CLIENT_SECRET if not defined VITE_GHL_CLIENT_SECRET (
    echo.
    echo ❌ GHL_CLIENT_SECRET is not set!
    echo    Please set VITE_GHL_CLIENT_SECRET in your .env.local file
    exit /b 1
)

echo.
echo ✅ Environment variables are properly set!
echo 🚀 You can now test the OAuth flow