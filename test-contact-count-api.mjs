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

async function testContactCountAPI() {
  console.log('🔍 Testing GoHighLevel Contact Count API...\n');

  const locationId = 'glgXnEKLMggg0CFhBRN8';
  const API_BASE_URL = 'https://services.leadconnectorhq.com';
  const API_VERSION = '2021-04-15';

  try {
    const accessToken = await getGHLAccessToken(locationId);
    if (!accessToken) throw new Error('GHL Access Token not found');

    // Test the contact count API with different pageLimit values
    console.log('📊 Test 1: Contact Count with pageLimit=1000');
    const response1 = await fetch(`${API_BASE_URL}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': API_VERSION
      },
      body: JSON.stringify({
        locationId: locationId,
        pageLimit: 1000,
        query: ''
      })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Contact Count API Response:', {
        totalContacts: data1.contacts?.length || 0,
        hasMeta: 'meta' in data1,
        metaTotal: data1.meta?.total,
        firstContact: data1.contacts?.[0] ? { id: data1.contacts[0].id, name: data1.contacts[0].firstName + ' ' + data1.contacts[0].lastName } : null
      });
    } else {
      const errorData1 = await response1.json();
      console.error('❌ Contact Count API Error:', response1.status, errorData1);
    }

    console.log('\n📊 Test 2: Contact Count with pageLimit=100');
    const response2 = await fetch(`${API_BASE_URL}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': API_VERSION
      },
      body: JSON.stringify({
        locationId: locationId,
        pageLimit: 100,
        query: ''
      })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Contact Count API Response (100 limit):', {
        totalContacts: data2.contacts?.length || 0,
        hasMeta: 'meta' in data2,
        metaTotal: data2.meta?.total
      });
    } else {
      const errorData2 = await response2.json();
      console.error('❌ Contact Count API Error (100 limit):', response2.status, errorData2);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testContactCountAPI();
