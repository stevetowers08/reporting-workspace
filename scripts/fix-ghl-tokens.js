#!/usr/bin/env node

/**
 * Fix GoHighLevel Token Issues
 * 
 * This script clears expired/invalid GoHighLevel tokens from the database
 * and provides instructions for re-authentication.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGHLTokens() {
  console.log('🔧 Fixing GoHighLevel token issues...\n');

  try {
    // 1. Check current GoHighLevel integrations
    console.log('📊 Checking current GoHighLevel integrations...');
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel');

    if (fetchError) {
      console.error('❌ Error fetching integrations:', fetchError);
      return;
    }

    console.log(`Found ${integrations?.length || 0} GoHighLevel integrations`);

    if (integrations && integrations.length > 0) {
      console.log('\n📋 Current integrations:');
      integrations.forEach((integration, index) => {
        const tokens = integration.config?.tokens;
        const expiresAt = tokens?.expiresAt;
        const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : true;
        
        console.log(`  ${index + 1}. Account ID: ${integration.account_id}`);
        console.log(`     Connected: ${integration.connected}`);
        console.log(`     Expires: ${expiresAt || 'Unknown'}`);
        console.log(`     Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`);
        console.log('');
      });

      // 2. Clear expired/invalid tokens
      console.log('🧹 Clearing expired/invalid tokens...');
      
      const { error: deleteError } = await supabase
        .from('integrations')
        .delete()
        .eq('platform', 'goHighLevel');

      if (deleteError) {
        console.error('❌ Error clearing tokens:', deleteError);
        return;
      }

      console.log('✅ Cleared all GoHighLevel tokens');
    }

    // 3. Check clients with GoHighLevel accounts
    console.log('\n👥 Checking clients with GoHighLevel accounts...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, accounts')
      .not('accounts->goHighLevel', 'is', null);

    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError);
      return;
    }

    if (clients && clients.length > 0) {
      console.log(`Found ${clients.length} clients with GoHighLevel accounts:`);
      clients.forEach((client, index) => {
        const ghlAccount = client.accounts?.goHighLevel;
        console.log(`  ${index + 1}. ${client.name} (${client.id})`);
        console.log(`     GoHighLevel: ${typeof ghlAccount === 'object' ? ghlAccount.locationId : ghlAccount}`);
      });

      // 4. Reset client GoHighLevel accounts to 'none'
      console.log('\n🔄 Resetting client GoHighLevel accounts...');
      
      for (const client of clients) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            accounts: {
              ...client.accounts,
              goHighLevel: 'none'
            }
          })
          .eq('id', client.id);

        if (updateError) {
          console.error(`❌ Error updating client ${client.name}:`, updateError);
        } else {
          console.log(`✅ Reset GoHighLevel account for ${client.name}`);
        }
      }
    }

    console.log('\n🎉 GoHighLevel token cleanup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to the Agency Panel in your app');
    console.log('2. Reconnect GoHighLevel using the OAuth flow');
    console.log('3. Select the appropriate location for each client');
    console.log('4. Test the integration to ensure it\'s working');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixGHLTokens().then(() => {
  console.log('\n✨ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
