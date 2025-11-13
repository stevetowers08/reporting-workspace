/**
 * Backfill oauthClientId for all existing GoHighLevel integrations
 * Extracts oauthClientId from JWT tokens and saves to database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw'
);

/**
 * Decode JWT token to extract oauthClientId
 */
function extractOAuthClientId(accessToken) {
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }

    // Decode base64url
    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    // Decode
    const jsonPayload = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonPayload);
    
    // Use oauthMeta.client (base client_id) for refresh, not sourceId (which has suffix)
    // Refresh tokens work with the base client_id, not the full sourceId
    return payload.oauthMeta?.client || payload.sourceId?.split('-')[0] || payload.sourceId || null;
  } catch (error) {
    console.error('Error extracting oauthClientId:', error.message);
    return null;
  }
}

async function backfillOAuthClientIds() {
  console.log('🔄 Starting oauthClientId backfill for GoHighLevel integrations...\n');

  try {
    // Get all GoHighLevel integrations that are connected but missing oauthClientId
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, account_id, account_name, config')
      .eq('platform', 'goHighLevel')
      .eq('connected', true);

    if (fetchError) {
      throw new Error(`Failed to fetch integrations: ${fetchError.message}`);
    }

    if (!integrations || integrations.length === 0) {
      console.log('✅ No GoHighLevel integrations found');
      return;
    }

    console.log(`📊 Found ${integrations.length} GoHighLevel integration(s)\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const integration of integrations) {
      const locationId = integration.account_id;
      const locationName = integration.account_name || locationId;
      const config = integration.config;
      const tokens = config?.tokens;

      // Check if oauthClientId needs update (if it has a suffix, extract base)
      let needsUpdate = false;
      let currentOAuthClientId = tokens?.oauthClientId;
      
      if (currentOAuthClientId && currentOAuthClientId.includes('-')) {
        // Check if it's the full sourceId format (base-suffix) - if so, extract base
        // The base client_id is typically 24 chars, suffix is shorter (8-12 chars)
        const parts = currentOAuthClientId.split('-');
        if (parts.length > 1) {
          const basePart = parts[0];
          const suffixPart = parts[parts.length - 1];
          // If base is ~24 chars and suffix is 8-12 chars, it's likely sourceId format
          if (basePart.length >= 20 && basePart.length <= 30 && suffixPart.length >= 8 && suffixPart.length <= 15) {
            // It has a suffix, we need to extract the base
            needsUpdate = true;
            console.log(`🔄 ${locationName} (${locationId}) has oauthClientId with suffix, will extract base`);
          }
        }
      } else if (!currentOAuthClientId) {
        // No oauthClientId at all
        needsUpdate = true;
      }
      
      // Skip if already has correct base oauthClientId (no suffix or suffix is short like UUID)
      if (!needsUpdate && currentOAuthClientId) {
        console.log(`⏭️  Skipping ${locationName} (${locationId}) - already has correct oauthClientId`);
        skipped++;
        continue;
      }

      // Skip if no access token
      if (!tokens?.accessToken) {
        console.log(`⚠️  Skipping ${locationName} (${locationId}) - no access token`);
        skipped++;
        continue;
      }

      // Extract oauthClientId from token (will be base client_id)
      let oauthClientId = extractOAuthClientId(tokens.accessToken);

      if (!oauthClientId) {
        console.log(`❌ Failed to extract oauthClientId for ${locationName} (${locationId})`);
        errors++;
        continue;
      }
      
      // If we already have an oauthClientId with suffix, check if the new one is different
      if (currentOAuthClientId && currentOAuthClientId !== oauthClientId) {
        console.log(`🔄 Updating oauthClientId from ${currentOAuthClientId.substring(0, 30)}... to ${oauthClientId.substring(0, 30)}...`);
      }

      // Update database
      const updatedConfig = {
        ...config,
        tokens: {
          ...tokens,
          oauthClientId
        }
      };

      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          config: updatedConfig
        })
        .eq('id', integration.id);

      if (updateError) {
        console.error(`❌ Failed to update ${locationName} (${locationId}):`, updateError.message);
        errors++;
      } else {
        console.log(`✅ Updated ${locationName} (${locationId}) - oauthClientId: ${oauthClientId.substring(0, 20)}...`);
        updated++;
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${integrations.length}`);

    if (updated > 0) {
      console.log('\n✨ Backfill completed successfully!');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillOAuthClientIds()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

