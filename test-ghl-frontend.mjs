import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bdmcdyxjdkgitphieklb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw'
);

async function testGHLFrontend() {
  try {
    console.log('🔍 Testing GoHighLevel Frontend Integration...');
    
    // Test 1: Check if we can get the integration data
    console.log('\n1️⃣ Testing Supabase integration query...');
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('account_id', 'V7bzEjKiigXzh8r6sQq0')
      .single();
    
    if (integrationError) {
      console.error('❌ Integration query failed:', integrationError);
      return;
    }
    
    console.log('✅ Integration found:', {
      account_id: integration.account_id,
      connected: integration.connected,
      hasToken: !!integration.config?.tokens?.accessToken
    });
    
    // Test 2: Test the exact API call the frontend would make
    console.log('\n2️⃣ Testing GoHighLevel API call...');
    const token = integration.config?.tokens?.accessToken;
    
    if (!token) {
      console.error('❌ No access token found');
      return;
    }
    
    const apiUrl = `https://services.leadconnectorhq.com/opportunities/search?location_id=V7bzEjKiigXzh8r6sQq0&status=won&limit=100`;
    console.log('🔗 API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    console.log('✅ API Response:', {
      opportunitiesCount: data.opportunities?.length || 0,
      total: data.meta?.total || 0
    });
    
    if (data.opportunities?.length > 0) {
      console.log('📋 Sample opportunity:', {
        id: data.opportunities[0].id,
        name: data.opportunities[0].name,
        status: data.opportunities[0].status,
        createdAt: data.opportunities[0].createdAt,
        monetaryValue: data.opportunities[0].monetaryValue
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGHLFrontend();
