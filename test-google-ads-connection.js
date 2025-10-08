/**
 * Google Ads Connection Diagnostic Script
 * Tests all aspects of Google Ads integration
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGoogleAdsConnection() {
  console.log('🔍 Google Ads Connection Diagnostic');
  console.log('=====================================');
  
  // Test 1: Environment Variables
  console.log('\n1. Environment Variables Check:');
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
  const developerToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
  
  console.log(`   VITE_GOOGLE_CLIENT_ID: ${clientId ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   VITE_GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   VITE_GOOGLE_ADS_DEVELOPER_TOKEN: ${developerToken ? '✅ SET' : '❌ NOT SET'}`);
  
  if (!clientId || !clientSecret || !developerToken) {
    console.log('\n❌ Missing required environment variables. Please check .env.local file.');
    return;
  }
  
  // Test 2: OAuth URL Generation
  console.log('\n2. OAuth URL Generation Test:');
  try {
    const { UserGoogleAdsService } = await import('./src/services/auth/userGoogleAdsService.ts');
    const authUrl = await UserGoogleAdsService.generateUserAuthUrl('test-user');
    console.log('   ✅ OAuth URL generated successfully');
    console.log(`   URL: ${authUrl.substring(0, 100)}...`);
  } catch (error) {
    console.log('   ❌ OAuth URL generation failed:', error.message);
  }
  
  // Test 3: TokenManager Connection Check
  console.log('\n3. TokenManager Connection Check:');
  try {
    const { TokenManager } = await import('./src/services/auth/TokenManager.ts');
    const isConnected = await TokenManager.isConnected('googleAds');
    console.log(`   Google Ads Connected: ${isConnected ? '✅ YES' : '❌ NO'}`);
    
    if (isConnected) {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      console.log(`   Access Token: ${accessToken ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
    }
  } catch (error) {
    console.log('   ❌ TokenManager check failed:', error.message);
  }
  
  // Test 4: Google Ads Service Test
  console.log('\n4. Google Ads Service Test:');
  try {
    const { GoogleAdsService } = await import('./src/services/api/googleAdsService.ts');
    
    // Test authentication
    const isAuthenticated = await GoogleAdsService.authenticate();
    console.log(`   Authentication: ${isAuthenticated ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (isAuthenticated) {
      // Test getting accounts
      const accounts = await GoogleAdsService.getAdAccounts();
      console.log(`   Accounts Retrieved: ${accounts.length} accounts found`);
      
      if (accounts.length > 0) {
        console.log('   Account Details:');
        accounts.forEach((account, index) => {
          console.log(`     ${index + 1}. ${account.name} (${account.id})`);
        });
      }
    }
  } catch (error) {
    console.log('   ❌ Google Ads Service test failed:', error.message);
  }
  
  // Test 5: Edge Function Test
  console.log('\n5. Supabase Edge Function Test:');
  try {
    const { supabase } = await import('./src/lib/supabase.ts');
    
    const { data, error } = await supabase.functions.invoke('google-ads-api/accounts');
    
    if (error) {
      console.log('   ❌ Edge Function error:', error.message);
    } else if (data?.success) {
      console.log('   ✅ Edge Function working');
      console.log(`   Accounts from Edge Function: ${data.data?.length || 0}`);
    } else {
      console.log('   ❌ Edge Function returned invalid response');
    }
  } catch (error) {
    console.log('   ❌ Edge Function test failed:', error.message);
  }
  
  console.log('\n=====================================');
  console.log('🔍 Diagnostic Complete');
  console.log('\nNext Steps:');
  console.log('1. If OAuth URL generation works, try connecting via the UI');
  console.log('2. If Edge Function fails, check Supabase deployment');
  console.log('3. If authentication fails, verify Google Cloud Console settings');
  console.log('4. Check browser console for detailed error messages');
}

// Run the diagnostic
testGoogleAdsConnection().catch(console.error);
