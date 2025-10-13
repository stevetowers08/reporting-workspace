// Browser console test for Google Ads service
// Copy and paste this into the browser console on localhost:5173

console.log('🔍 Browser Google Ads Service Test');
console.log('===================================');

// Test 1: Check environment variables
console.log('📋 Environment Variables:');
console.log('- VITE_GOOGLE_ADS_DEVELOPER_TOKEN:', import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN ? 'Found' : 'Not found');
console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Found' : 'Not found');
console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Not found');

// Test 2: Check if services are available
console.log('\n📋 Service Availability:');
console.log('- GoogleAdsService:', typeof GoogleAdsService !== 'undefined' ? 'Available' : 'Not available');
console.log('- TokenManager:', typeof TokenManager !== 'undefined' ? 'Available' : 'Not available');
console.log('- supabase:', typeof supabase !== 'undefined' ? 'Available' : 'Not available');

// Test 3: Test database connection
async function testDatabaseConnection() {
  try {
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('integrations')
      .select('platform, connected')
      .eq('platform', 'googleAds')
      .limit(1);
    
    if (error) {
      console.error('❌ Database error:', error);
      return false;
    }
    
    console.log('✅ Database connection working');
    console.log('Google Ads integration:', data);
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

// Test 4: Test TokenManager
async function testTokenManager() {
  try {
    console.log('\n🔍 Testing TokenManager...');
    const token = await TokenManager.getAccessToken('googleAds');
    console.log('Token result:', token ? 'Found' : 'Not found');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    return !!token;
  } catch (error) {
    console.error('❌ TokenManager error:', error);
    return false;
  }
}

// Test 5: Test Google Ads service
async function testGoogleAdsService() {
  try {
    console.log('\n🔍 Testing Google Ads service...');
    const accounts = await GoogleAdsService.getAdAccounts();
    console.log('✅ Google Ads service working');
    console.log('Accounts count:', accounts.length);
    console.log('First account:', accounts[0]);
    return true;
  } catch (error) {
    console.error('❌ Google Ads service error:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Running all tests...');
  
  const dbTest = await testDatabaseConnection();
  const tokenTest = await testTokenManager();
  const serviceTest = await testGoogleAdsService();
  
  console.log('\n📊 Test Results:');
  console.log('- Database:', dbTest ? '✅ PASS' : '❌ FAIL');
  console.log('- TokenManager:', tokenTest ? '✅ PASS' : '❌ FAIL');
  console.log('- Google Ads Service:', serviceTest ? '✅ PASS' : '❌ FAIL');
  
  if (dbTest && tokenTest && serviceTest) {
    console.log('\n🎉 All tests passed! Google Ads should be working.');
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.');
  }
}

// Start the tests
runAllTests();
