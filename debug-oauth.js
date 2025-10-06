// Debug OAuth callback - test the token exchange
// File: debug-oauth.js

const testOAuthExchange = async () => {
  console.log('🔍 Testing OAuth token exchange...');
  
  // Test with your actual environment variables
  const clientId = process.env.VITE_GHL_CLIENT_ID;
  const clientSecret = process.env.VITE_GHL_CLIENT_SECRET;
  
  console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET');
  console.log('Client Secret:', clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NOT SET');
  
  if (!clientId || !clientSecret) {
    console.error('❌ Missing OAuth credentials!');
    return;
  }
  
  // Test the token exchange endpoint
  const testCode = 'test_code_123';
  
  try {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: testCode,
        user_type: 'Location',
        refresh_token: 'true'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (!response.ok) {
      console.error('❌ Token exchange failed:', result);
    } else {
      console.log('✅ Token exchange successful:', result);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testOAuthExchange();
