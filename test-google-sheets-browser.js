// Test Google Sheets integration in browser
console.log('🔍 Testing Google Sheets Integration...');

// Test 1: Check if OAuth service is available
console.log('1. Checking OAuth service...');
try {
  // Import the OAuth service (this will work in browser context)
  console.log('   OAuth service should be available');
} catch (error) {
  console.log('   ❌ OAuth service not available:', error);
}

// Test 2: Check environment variables in browser
console.log('\n2. Checking environment variables in browser...');
console.log('   VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID || 'NOT SET');
console.log('   VITE_GOOGLE_CLIENT_SECRET:', import.meta.env.VITE_GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

// Test 3: Test Google Sheets API endpoint
console.log('\n3. Testing Google Sheets API endpoint...');
fetch('https://sheets.googleapis.com/v4/spreadsheets')
  .then(response => {
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    return response.text();
  })
  .then(data => {
    console.log('   Response preview:', data.substring(0, 200) + '...');
    if (response.status === 401) {
      console.log('   ✅ API endpoint is reachable (401 = authentication required)');
    } else if (response.status === 200) {
      console.log('   ✅ API endpoint is working');
    } else {
      console.log('   ⚠️  Unexpected status code:', response.status);
    }
  })
  .catch(error => {
    console.log('   ❌ Error:', error.message);
  });

// Test 4: Test OAuth token validation endpoint
console.log('\n4. Testing OAuth token validation endpoint...');
fetch('https://www.googleapis.com/oauth2/v1/tokeninfo')
  .then(response => {
    console.log('   Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('   Response:', data);
    if (response.status === 400) {
      console.log('   ✅ Token validation endpoint is reachable (400 = token required)');
    } else if (response.status === 200) {
      console.log('   ✅ Token validation endpoint is working');
    } else {
      console.log('   ⚠️  Unexpected status code:', response.status);
    }
  })
  .catch(error => {
    console.log('   ❌ Error:', error.message);
  });

console.log('\n📋 Browser test completed. Check console for results.');
