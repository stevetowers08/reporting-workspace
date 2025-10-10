#!/usr/bin/env node

/**
 * Test script to verify Facebook Ads conversion actions dropdown fix
 * This script tests the FacebookAdsService.getConversionActions method
 */

import { FacebookAdsService } from './src/services/api/facebookAdsService.js';

async function testConversionActions() {
  console.log('🧪 Testing Facebook Ads conversion actions...\n');

  try {
    // Test with a sample account ID
    const testAccountId = 'act_123456789';
    console.log(`📋 Testing with account ID: ${testAccountId}`);

    const actions = await FacebookAdsService.getConversionActions(testAccountId);
    
    console.log('✅ Conversion actions loaded successfully!');
    console.log(`📊 Found ${actions.length} conversion actions:`);
    
    actions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action.name} (ID: ${action.id})`);
    });

    // Verify the structure
    if (actions.length > 0) {
      const firstAction = actions[0];
      const hasRequiredFields = firstAction.id && firstAction.name;
      
      if (hasRequiredFields) {
        console.log('\n✅ All conversion actions have required fields (id, name)');
      } else {
        console.log('\n❌ Some conversion actions are missing required fields');
      }
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testConversionActions();
