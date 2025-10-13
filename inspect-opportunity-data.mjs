import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getGHLAccessToken(locationId) {
  const { data, error } = await supabase
    .from('integrations')
    .select('config->tokens')
    .eq('platform', 'goHighLevel')
    .eq('account_id', locationId)
    .single();

  if (error || !data || !data.tokens || !data.tokens.accessToken) {
    console.error(`❌ Error fetching GHL token for ${locationId}:`, error?.message || 'Token not found');
    return null;
  }
  return data.tokens.accessToken;
}

async function inspectOpportunityData() {
  console.log('🔍 Inspecting GoHighLevel Opportunity Data Structure...\n');

  const locationId = 'glgXnEKLMggg0CFhBRN8';
  const API_BASE_URL = 'https://services.leadconnectorhq.com';
  const API_VERSION = '2021-04-15';

  try {
    const accessToken = await getGHLAccessToken(locationId);
    if (!accessToken) throw new Error('GHL Access Token not found');

    // Get a few opportunities to inspect their structure
    const response = await fetch(`${API_BASE_URL}/opportunities/search?location_id=${locationId}&limit=3`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': API_VERSION
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Opportunities API Response Structure:');
      console.log('Total opportunities:', data.meta?.total);
      console.log('Returned opportunities:', data.opportunities?.length);
      
      if (data.opportunities && data.opportunities.length > 0) {
        console.log('\n📊 Sample Opportunity Data Structure:');
        console.log('First opportunity:', JSON.stringify(data.opportunities[0], null, 2));
        
        if (data.opportunities.length > 1) {
          console.log('\nSecond opportunity:', JSON.stringify(data.opportunities[1], null, 2));
        }
        
        if (data.opportunities.length > 2) {
          console.log('\nThird opportunity:', JSON.stringify(data.opportunities[2], null, 2));
        }
      }
      
      console.log('\n🔍 Analysis:');
      if (data.opportunities && data.opportunities.length > 0) {
        const opp = data.opportunities[0];
        console.log('- Has value field:', 'value' in opp, opp.value);
        console.log('- Has status field:', 'status' in opp, opp.status);
        console.log('- Has title field:', 'title' in opp, opp.title);
        console.log('- Has id field:', '_id' in opp, opp._id);
        console.log('- All fields:', Object.keys(opp));
      }
    } else {
      const errorData = await response.json();
      console.error('❌ Opportunities API Error:', response.status, errorData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectOpportunityData();
