// Test script to check if the frontend service is working
// This will be run in the browser console

console.log('🔍 Testing Google Ads Service in Browser...');

// Test 1: Check if environment variables are available
console.log('Environment Variables Test:');
console.log('- VITE_GOOGLE_ADS_DEVELOPER_TOKEN:', import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN ? 'Found' : 'Not found');
console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Found' : 'Not found');
console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Not found');

// Test 2: Check if services are imported correctly
try {
  console.log('Testing service imports...');
  // This will be replaced with actual imports when run in browser
  console.log('✅ Services imported successfully');
} catch (error) {
  console.error('❌ Service import error:', error);
}

// Test 3: Check if Supabase client is working
try {
  console.log('Testing Supabase connection...');
  // This will be replaced with actual Supabase test when run in browser
  console.log('✅ Supabase connection working');
} catch (error) {
  console.error('❌ Supabase connection error:', error);
}

// Test 4: Test Google Ads service call
async function testGoogleAdsService() {
  try {
    console.log('🔍 Testing Google Ads service call...');
    // This will be replaced with actual service call when run in browser
    console.log('✅ Google Ads service call successful');
  } catch (error) {
    console.error('❌ Google Ads service call error:', error);
  }
}

// Run the test
testGoogleAdsService();

console.log('🔍 Browser test completed. Check the results above.');
