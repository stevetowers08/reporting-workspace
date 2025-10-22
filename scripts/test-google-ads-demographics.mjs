#!/usr/bin/env node

/**
 * Comprehensive Google Ads Demographics API Test
 * Tests the new segments-based demographics implementation
 */

import { GoogleAdsService } from './src/services/api/googleAdsService.js';

// Test configuration
const TEST_CONFIG = {
  clients: [
    { id: 'e786e6a2-9340-4bd2-86e9-f3fcf6a3c0c7', name: 'Fire House Loft', googleAds: '5894368498' },
    { id: '2775ae60-b5d6-4714-add4-d6fa30292822', name: 'Wormwood', googleAds: 'customers/5659913242' },
    { id: '501cb994-2eb6-4a21-96b6-406e944a2d7e', name: 'Magnolia Terrace', googleAds: '2959629321' }
  ],
  dateRanges: [
    { start: '2024-09-22', end: '2024-10-22', name: 'Last 30 days' },
    { start: '2024-10-01', end: '2024-10-31', name: 'October 2024' }
  ]
};

async function testGoogleAdsDemographics() {
  console.log('🧪 Starting Comprehensive Google Ads Demographics API Test\n');
  
  // Test 1: Authentication
  console.log('1️⃣ Testing Google Ads Authentication...');
  try {
    const isAuthenticated = await GoogleAdsService.authenticate();
    console.log(`   ✅ Authentication: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ Authentication Error: ${error.message}`);
    return;
  }

  // Test 2: Main Metrics (baseline)
  console.log('\n2️⃣ Testing Main Google Ads Metrics...');
  for (const client of TEST_CONFIG.clients) {
    try {
      const metrics = await GoogleAdsService.getAccountMetrics(
        client.googleAds,
        TEST_CONFIG.dateRanges[0]
      );
      
      console.log(`   📊 ${client.name}:`);
      console.log(`      Leads: ${metrics?.leads || 0}`);
      console.log(`      Cost: $${metrics?.cost || 0}`);
      console.log(`      Impressions: ${metrics?.impressions || 0}`);
      console.log(`      Clicks: ${metrics?.clicks || 0}`);
    } catch (error) {
      console.log(`   ❌ ${client.name} Main Metrics Error: ${error.message}`);
    }
  }

  // Test 3: Demographics (our fix)
  console.log('\n3️⃣ Testing Demographics Implementation...');
  for (const client of TEST_CONFIG.clients) {
    try {
      console.log(`   🎯 Testing ${client.name} (${client.googleAds})...`);
      
      const demographics = await GoogleAdsService.getDemographicBreakdown(
        client.googleAds,
        TEST_CONFIG.dateRanges[0]
      );
      
      if (demographics) {
        console.log(`      ✅ Demographics Data Retrieved:`);
        console.log(`         Age Groups: ${JSON.stringify(demographics.ageGroups)}`);
        console.log(`         Gender: ${JSON.stringify(demographics.gender)}`);
        
        // Validate percentages
        const ageTotal = Object.values(demographics.ageGroups).reduce((a, b) => a + b, 0);
        const genderTotal = demographics.gender.female + demographics.gender.male;
        
        console.log(`         Age Total: ${ageTotal}%`);
        console.log(`         Gender Total: ${genderTotal}%`);
        
        if (ageTotal > 0 || genderTotal > 0) {
          console.log(`      🎉 SUCCESS: Real demographic data found!`);
        } else {
          console.log(`      ⚠️  WARNING: Demographics showing 0% (may be account limitation)`);
        }
      } else {
        console.log(`      ❌ No demographics data returned`);
      }
    } catch (error) {
      console.log(`   ❌ ${client.name} Demographics Error: ${error.message}`);
      
      // Check if it's the segments error we're trying to fix
      if (error.message.includes('segments.age_range') || error.message.includes('segments.gender')) {
        console.log(`      🔍 This is the error we're trying to fix!`);
      }
    }
  }

  // Test 4: Campaign Breakdown
  console.log('\n4️⃣ Testing Campaign Breakdown...');
  for (const client of TEST_CONFIG.clients) {
    try {
      const breakdown = await GoogleAdsService.getCampaignBreakdown(
        client.googleAds,
        TEST_CONFIG.dateRanges[0]
      );
      
      if (breakdown) {
        console.log(`   📈 ${client.name} Campaign Breakdown:`);
        console.log(`      Campaign Types: ${JSON.stringify(breakdown.campaignTypes)}`);
        console.log(`      Ad Formats: ${JSON.stringify(breakdown.adFormats)}`);
      } else {
        console.log(`   ❌ ${client.name}: No campaign breakdown data`);
      }
    } catch (error) {
      console.log(`   ❌ ${client.name} Campaign Breakdown Error: ${error.message}`);
    }
  }

  // Test 5: Different Date Ranges
  console.log('\n5️⃣ Testing Different Date Ranges...');
  const testClient = TEST_CONFIG.clients[0]; // Fire House Loft
  
  for (const dateRange of TEST_CONFIG.dateRanges) {
    try {
      console.log(`   📅 Testing ${dateRange.name} (${dateRange.start} to ${dateRange.end})...`);
      
      const demographics = await GoogleAdsService.getDemographicBreakdown(
        testClient.googleAds,
        dateRange
      );
      
      if (demographics) {
        const ageTotal = Object.values(demographics.ageGroups).reduce((a, b) => a + b, 0);
        const genderTotal = demographics.gender.female + demographics.gender.male;
        
        console.log(`      Age Total: ${ageTotal}%, Gender Total: ${genderTotal}%`);
      } else {
        console.log(`      No data for this date range`);
      }
    } catch (error) {
      console.log(`   ❌ Date Range Error: ${error.message}`);
    }
  }

  console.log('\n🏁 Test Complete!');
}

// Run the test
testGoogleAdsDemographics().catch(console.error);

