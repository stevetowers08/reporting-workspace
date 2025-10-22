// Test GoHighLevel Won Opportunities API for Magnolia Terrace
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bdmcdyxjdkgitphieklb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw'
);

async function testGHLAPI() {
  try {
    console.log('🔍 Testing GoHighLevel Won Opportunities API...');
    
    const locationId = 'V7bzEjKiigXzh8r6sQq0';
    
    // Get the access token from database
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'goHighLevel')
      .eq('account_id', locationId)
      .single();
    
    if (error || !integration) {
      console.error('❌ Integration not found:', error);
      return;
    }
    
    const accessToken = integration.config?.tokens?.accessToken;
    if (!accessToken) {
      console.error('❌ No access token found');
      return;
    }
    
    console.log('✅ Access token found');
    
    // Test won opportunities API call
    const wonOpportunitiesUrl = `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&status=Won&limit=50`;
    
    console.log('🔍 Fetching won opportunities from:', wonOpportunitiesUrl);
    
    const response = await fetch(wonOpportunitiesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Won Opportunities Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test all opportunities for comparison
    console.log('\n🔍 Testing all opportunities for comparison...');
    const allOpportunitiesUrl = `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&limit=50`;
    
    const allResponse = await fetch(allOpportunitiesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json'
      }
    });
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log('✅ All Opportunities Count:', allData.opportunities?.length || 0);
      console.log('✅ Won Opportunities Count:', data.opportunities?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGHLAPI();
