// Simple test to get venues from Supabase directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getVenues() {
  try {
    console.log('🔍 Fetching venues (clients) from Supabase...');
    
    const { data: venues, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return;
    }
    
    console.log('✅ Successfully retrieved venues:');
    console.log(`Found ${venues.length} venues:`);
    
    venues.forEach((venue, index) => {
      console.log(`\n${index + 1}. ${venue.name}`);
      console.log(`   ID: ${venue.id}`);
      console.log(`   Status: ${venue.status}`);
      console.log(`   Type: ${venue.type}`);
      console.log(`   Location: ${venue.location}`);
      console.log(`   Created: ${new Date(venue.created_at).toLocaleDateString()}`);
      
      if (venue.accounts) {
        console.log(`   Accounts:`);
        if (venue.accounts.facebookAds) console.log(`     - Facebook Ads: ${venue.accounts.facebookAds}`);
        if (venue.accounts.googleAds) console.log(`     - Google Ads: ${venue.accounts.googleAds}`);
        if (venue.accounts.goHighLevel) {
          if (typeof venue.accounts.goHighLevel === 'string') {
            console.log(`     - GoHighLevel: ${venue.accounts.goHighLevel}`);
          } else {
            console.log(`     - GoHighLevel: ${venue.accounts.goHighLevel.locationName} (${venue.accounts.goHighLevel.locationId})`);
          }
        }
        if (venue.accounts.googleSheets) console.log(`     - Google Sheets: ${venue.accounts.googleSheets}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching venues:', error.message);
  }
}

getVenues();
