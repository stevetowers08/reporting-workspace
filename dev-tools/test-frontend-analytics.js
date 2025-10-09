// Test frontend analytics data pulling
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFrontendAnalytics() {
  try {
    console.log('🔍 Testing frontend analytics data pulling...');
    
    // Test 1: Check if clients have Go High Level location IDs
    console.log('\n📊 Checking client data...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) {
      console.log('❌ Error fetching clients:', clientsError.message);
      return;
    }
    
    console.log(`✅ Found ${clients.length} clients`);
    clients.forEach((client, index) => {
      console.log(`Client ${index + 1}:`, {
        id: client.id,
        name: client.name,
        accounts: client.accounts,
        hasGHLAccount: !!client.accounts?.goHighLevel
      });
    });
    
    // Test 2: Check Go High Level integration
    console.log('\n🔗 Checking Go High Level integration...');
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('connected', true)
      .single();
    
    if (integrationError) {
      console.log('❌ Error fetching Go High Level integration:', integrationError.message);
      return;
    }
    
    console.log('✅ Go High Level integration found');
    console.log('Integration details:', {
      id: integration.id,
      connected: integration.connected,
      locationId: integration.config?.locationId,
      hasApiKey: !!integration.config?.apiKey?.apiKey,
      lastSync: integration.config?.lastSync
    });
    
    // Test 3: Simulate frontend analytics data pulling
    console.log('\n📈 Testing analytics data pulling...');
    
    const locationId = integration.config?.locationId || 'V7bzEjKiigXzh8r6sQq0';
    const token = integration.config?.apiKey?.apiKey;
    
    if (!token) {
      console.log('❌ No API key found in integration');
      return;
    }
    
    // Test contact count (what FunnelMetricsCards calls)
    console.log('Testing contact count...');
    try {
      const contactResponse = await fetch('https://services.leadconnectorhq.com/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: locationId,
          pageLimit: 1
        })
      });
      
      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        console.log('✅ Contact count test successful');
        console.log(`Total contacts: ${contactData.total || contactData.contacts?.length || 0}`);
      } else {
        const errorText = await contactResponse.text();
        console.log('❌ Contact count test failed:', contactResponse.status, errorText);
      }
    } catch (error) {
      console.log('❌ Contact count test error:', error.message);
    }
    
    // Test funnel analytics (what FunnelMetricsCards calls)
    console.log('Testing funnel analytics...');
    try {
      const funnelResponse = await fetch(`https://services.leadconnectorhq.com/funnels/funnel/list?locationId=${locationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });
      
      if (funnelResponse.ok) {
        const funnelData = await funnelResponse.json();
        console.log('✅ Funnel analytics test successful');
        console.log(`Funnels found: ${funnelData.funnels?.length || 0}`);
        if (funnelData.funnels && funnelData.funnels.length > 0) {
          console.log('First funnel:', funnelData.funnels[0]);
        }
      } else {
        const errorText = await funnelResponse.text();
        console.log('❌ Funnel analytics test failed:', funnelResponse.status, errorText);
      }
    } catch (error) {
      console.log('❌ Funnel analytics test error:', error.message);
    }
    
    // Test 4: Check EventMetricsService data flow
    console.log('\n🔄 Testing EventMetricsService data flow...');
    
    // Simulate what EventMetricsService.getGHLMetrics does
    try {
      const ghlMetricsResponse = await fetch('https://services.leadconnectorhq.com/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId: locationId,
          pageLimit: 10
        })
      });
      
      if (ghlMetricsResponse.ok) {
        const ghlMetricsData = await ghlMetricsResponse.json();
        console.log('✅ EventMetricsService GHL metrics test successful');
        console.log(`Contacts for metrics: ${ghlMetricsData.contacts?.length || 0}`);
        
        // Calculate some basic metrics like the service would
        const contacts = ghlMetricsData.contacts || [];
        const totalContacts = ghlMetricsData.total || contacts.length;
        const facebookAdsContacts = contacts.filter(c => c.source?.includes('facebook') || c.source?.includes('Facebook')).length;
        const googleAdsContacts = contacts.filter(c => c.source?.includes('google') || c.source?.includes('Google')).length;
        
        console.log('Calculated metrics:', {
          totalContacts,
          facebookAdsContacts,
          googleAdsContacts,
          facebookAdsPercentage: totalContacts > 0 ? ((facebookAdsContacts / totalContacts) * 100).toFixed(1) + '%' : '0%',
          googleAdsPercentage: totalContacts > 0 ? ((googleAdsContacts / totalContacts) * 100).toFixed(1) + '%' : '0%'
        });
      } else {
        const errorText = await ghlMetricsResponse.text();
        console.log('❌ EventMetricsService GHL metrics test failed:', ghlMetricsResponse.status, errorText);
      }
    } catch (error) {
      console.log('❌ EventMetricsService GHL metrics test error:', error.message);
    }
    
    console.log('\n🎉 Frontend analytics testing completed!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testFrontendAnalytics();
