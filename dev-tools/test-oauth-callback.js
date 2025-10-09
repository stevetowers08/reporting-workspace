// Test OAuth credentials and callback flow
console.log('🔍 Testing OAuth Credentials and Callback Flow');
console.log('==============================================');

// Check environment variables
const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;

console.log('Environment Variables:');
console.log('VITE_GHL_CLIENT_ID:', clientId ? 'SET' : 'NOT SET');
console.log('VITE_GHL_CLIENT_SECRET:', clientSecret ? 'SET' : 'NOT SET');

if (!clientId || !clientSecret) {
  console.error('❌ Missing OAuth credentials!');
  console.log('Please set VITE_GHL_CLIENT_ID and VITE_GHL_CLIENT_SECRET in .env.local');
} else {
  console.log('✅ OAuth credentials are set');
}

// Test current URL parameters
const urlParams = new URLSearchParams(window.location.search);
console.log('\nCurrent URL Parameters:');
console.log('code:', urlParams.get('code') ? 'PRESENT' : 'MISSING');
console.log('locationId:', urlParams.get('locationId') || 'MISSING');
console.log('error:', urlParams.get('error') || 'NONE');
console.log('state:', urlParams.get('state') || 'MISSING');

// Test redirect URI
const redirectUri = `${window.location.origin}/api/leadconnector/oath`;
console.log('\nRedirect URI:', redirectUri);

console.log('\n🔍 OAuth Flow Test Complete');
