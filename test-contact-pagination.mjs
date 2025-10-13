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

async function testContactCountWithPagination() {
  console.log('🔍 Testing GoHighLevel Contact Count with Pagination...\n');

  const locationId = 'glgXnEKLMggg0CFhBRN8';
  const API_BASE_URL = 'https://services.leadconnectorhq.com';
  const API_VERSION = '2021-04-15';

  try {
    const accessToken = await getGHLAccessToken(locationId);
    if (!accessToken) throw new Error('GHL Access Token not found');

    // Test pagination to get actual total count
    let allContacts = [];
    let hasMorePages = true;
    let pageCount = 0;
    const maxPages = 10; // Safety limit

    while (hasMorePages && pageCount < maxPages) {
      const response = await fetch(`${API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': API_VERSION
        },
        body: JSON.stringify({
          locationId: locationId,
          pageLimit: 100,
          query: '',
          skip: pageCount * 100
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contacts = data.contacts || [];
        
        console.log(`📄 Page ${pageCount + 1}: ${contacts.length} contacts`);
        
        if (contacts.length === 0) {
          hasMorePages = false;
        } else {
          allContacts = [...allContacts, ...contacts];
          hasMorePages = contacts.length === 100;
          pageCount++;
        }
      } else {
        const errorData = await response.json();
        console.error(`❌ Page ${pageCount + 1} Error:`, response.status, errorData);
        hasMorePages = false;
      }
    }

    console.log(`\n✅ Total Contacts Found: ${allContacts.length} (fetched ${pageCount} pages)`);
    
    // Show sample contacts
    if (allContacts.length > 0) {
      console.log('\n📊 Sample Contacts:');
      allContacts.slice(0, 3).forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testContactCountWithPagination();
