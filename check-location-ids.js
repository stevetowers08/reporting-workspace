// Check Supabase for actual Go High Level location IDs
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseLocationIds() {
  try {
    console.log('🔍 Checking Supabase for Go High Level location IDs...');
    
    // Get the Go High Level integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('connected', true)
      .single();
    
    if (error || !integration) {
      console.log('❌ No Go High Level integration found');
      return;
    }
    
    console.log('✅ Found Go High Level integration');
    console.log('Integration ID:', integration.id);
    console.log('Integration config keys:', Object.keys(integration.config));
    
    const config = integration.config;
    
    // Check for locationId in config
    if (config.locationId) {
      console.log('📍 Location ID in config:', config.locationId);
    }
    
    // Check for any location-related data
    if (config.locations) {
      console.log('📍 Locations in config:', config.locations);
    }
    
    // Check clients table for location IDs
    console.log('\n🔍 Checking clients table for location IDs...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) {
      console.log('❌ Error fetching clients:', clientsError.message);
    } else {
      console.log(`✅ Found ${clients.length} clients`);
      clients.forEach((client, index) => {
        console.log(`Client ${index + 1}:`, {
          id: client.id,
          name: client.name,
          locationId: client.locationId,
          platform: client.platform
        });
      });
    }
    
    // Check if there are any other tables with location data
    console.log('\n🔍 Checking for other location-related data...');
    
    // Check integrations table for any location-specific data
    const { data: allIntegrations, error: allIntegrationsError } = await supabase
      .from('integrations')
      .select('*');
    
    if (allIntegrationsError) {
      console.log('❌ Error fetching all integrations:', allIntegrationsError.message);
    } else {
      console.log(`✅ Found ${allIntegrations.length} total integrations`);
      allIntegrations.forEach((integration, index) => {
        console.log(`Integration ${index + 1}:`, {
          id: integration.id,
          platform: integration.platform,
          connected: integration.connected,
          hasLocationId: !!integration.config?.locationId,
          locationId: integration.config?.locationId
        });
      });
    }
    
    // Now test the API with real location IDs
    const token = config.apiKey.apiKey;
    const companyId = 'WgNZ7xm35vYaZwflSov7';
    
    console.log('\n🔍 Testing API with real location IDs...');
    
    // Test locations search
    try {
      const locationsResponse = await fetch(`https://services.leadconnectorhq.com/locations/search?companyId=${companyId}&limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Locations API Status:', locationsResponse.status, locationsResponse.statusText);
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        console.log('✅ Locations API Success!');
        console.log('Locations found:', locationsData.locations?.length || 0);
        if (locationsData.locations && locationsData.locations.length > 0) {
          console.log('First location:', locationsData.locations[0]);
          
          // Test contacts with real location ID
          const realLocationId = locationsData.locations[0].id;
          console.log(`\n🔍 Testing contacts with real location ID: ${realLocationId}`);
          
          const contactsResponse = await fetch('https://services.leadconnectorhq.com/contacts/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              locationId: realLocationId,
              pageLimit: 5
            })
          });
          
          console.log('Contacts API Status:', contactsResponse.status, contactsResponse.statusText);
          
          if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json();
            console.log('✅ Contacts API Success!');
            console.log('Contacts found:', contactsData.contacts?.length || 0);
          } else {
            const errorText = await contactsResponse.text();
            console.log('❌ Contacts API Error:', errorText);
          }
        }
      } else {
        const errorText = await locationsResponse.text();
        console.log('❌ Locations API Error:', errorText);
      }
    } catch (error) {
      console.log('❌ API test failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

checkSupabaseLocationIds();
