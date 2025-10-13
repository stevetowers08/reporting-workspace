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

async function inspectContactsData() {
  console.log('🔍 Inspecting GoHighLevel Contacts Data...\n');

  const locationId = 'glgXnEKLMggg0CFhBRN8';
  const API_BASE_URL = 'https://services.leadconnectorhq.com';
  const API_VERSION = '2021-04-15';

  try {
    const accessToken = await getGHLAccessToken(locationId);
    if (!accessToken) throw new Error('GHL Access Token not found');

    // Test the contacts search API
    const response = await fetch(`${API_BASE_URL}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': API_VERSION
      },
      body: JSON.stringify({
        locationId: locationId,
        pageLimit: 1, // Just get 1 contact to see the structure
        query: ''
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Contacts API Response Structure:');
      console.log('Total contacts:', data.meta?.total);
      console.log('Returned contacts:', data.contacts?.length);
      
      if (data.contacts && data.contacts.length > 0) {
        console.log('\n📊 Sample Contact Data Structure:');
        console.log('First contact:', JSON.stringify(data.contacts[0], null, 2));
      }
      
      console.log('\n🔍 Analysis:');
      console.log('- Meta total:', data.meta?.total);
      console.log('- Contacts array length:', data.contacts?.length);
      console.log('- Has meta field:', 'meta' in data);
      console.log('- Meta fields:', data.meta ? Object.keys(data.meta) : 'No meta');
    } else {
      const errorData = await response.json();
      console.error('❌ Contacts API Error:', response.status, errorData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectContactsData();
