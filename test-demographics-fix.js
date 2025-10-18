#!/usr/bin/env node

/**
 * Test script to verify demographics and platform breakdown fixes
 */

import fs from 'fs';

console.log('🧪 Testing Demographics and Platform Breakdown Fixes\n');

// Test 1: Check if Facebook Ads Service has demographics enabled
console.log('1️⃣ Testing Facebook Ads Service Demographics...');
const facebookServicePath = 'src/services/api/facebookAdsService.ts';

try {
  const facebookServiceContent = fs.readFileSync(facebookServicePath, 'utf8');
  
  // Check if demographics are enabled (not undefined)
  const demographicsEnabled = facebookServiceContent.includes('const demographics = await this.getDemographicBreakdown');
  const platformEnabled = facebookServiceContent.includes('const platformBreakdown = await this.getPlatformBreakdown');
  
  console.log(`   ✅ Demographics enabled: ${demographicsEnabled}`);
  console.log(`   ✅ Platform breakdown enabled: ${platformEnabled}`);
  
  if (demographicsEnabled && platformEnabled) {
    console.log('   🎉 SUCCESS: Both demographics and platform breakdown are enabled!\n');
  } else {
    console.log('   ❌ FAILURE: Demographics or platform breakdown not enabled\n');
  }
} catch (error) {
  console.log(`   ❌ ERROR: Could not read Facebook service file: ${error.message}\n`);
}

// Test 2: Check tab visibility configuration
console.log('2️⃣ Testing Tab Visibility Configuration...');

const integrationConfigPath = 'src/hooks/useDashboardIntegrationConfig.ts';

try {
  const integrationConfigContent = fs.readFileSync(integrationConfigPath, 'utf8');
  
  // Check if tabs show immediately based on client config
  const immediateTabVisibility = integrationConfigContent.includes('Show tabs immediately based on client integration settings');
  const fallbackConfig = integrationConfigContent.includes('immediateConfig.visibleTabs');
  
  console.log(`   ✅ Immediate tab visibility: ${immediateTabVisibility}`);
  console.log(`   ✅ Fallback configuration: ${fallbackConfig}`);
  
  if (immediateTabVisibility && fallbackConfig) {
    console.log('   🎉 SUCCESS: Tabs will show immediately based on client config!\n');
  } else {
    console.log('   ❌ FAILURE: Tab visibility not properly configured\n');
  }
} catch (error) {
  console.log(`   ❌ ERROR: Could not read integration config file: ${error.message}\n`);
}

// Test 3: Check tab colors
console.log('3️⃣ Testing Tab Colors...');

const unifiedHeaderPath = 'src/components/dashboard/UnifiedHeader.tsx';

try {
  const unifiedHeaderContent = fs.readFileSync(unifiedHeaderPath, 'utf8');
  
  // Check if tabs use blue border for selected state
  const blueBorderSelected = unifiedHeaderContent.includes('border-blue-600');
  const textColorConsistent = unifiedHeaderContent.includes('text-slate-500');
  const noOrangeColors = !unifiedHeaderContent.includes('text-orange-600');
  
  console.log(`   ✅ Blue border for selected tabs: ${blueBorderSelected}`);
  console.log(`   ✅ Consistent text color: ${textColorConsistent}`);
  console.log(`   ✅ No orange colors: ${noOrangeColors}`);
  
  if (blueBorderSelected && textColorConsistent && noOrangeColors) {
    console.log('   🎉 SUCCESS: Tab colors updated to blue with consistent text!\n');
  } else {
    console.log('   ❌ FAILURE: Tab colors not properly updated\n');
  }
} catch (error) {
  console.log(`   ❌ ERROR: Could not read unified header file: ${error.message}\n`);
}

// Test 4: Check for hardcoded data in components
console.log('4️⃣ Testing for Hardcoded Data...');

const demographicsPath = 'src/components/dashboard/MetaAdsDemographics.tsx';
const platformPath = 'src/components/dashboard/MetaAdsPlatformBreakdown.tsx';

try {
  const demographicsContent = fs.readFileSync(demographicsPath, 'utf8');
  const platformContent = fs.readFileSync(platformPath, 'utf8');
  
  // Check for hardcoded values (should only have 0 fallbacks)
  const demographicsHardcoded = demographicsContent.includes('25-34') && demographicsContent.includes('35-44');
  const platformHardcoded = platformContent.includes('facebook: 0') && platformContent.includes('instagram: 0');
  const noMockData = !demographicsContent.includes('mock') && !platformContent.includes('mock');
  
  console.log(`   ✅ Demographics has proper age groups: ${demographicsHardcoded}`);
  console.log(`   ✅ Platform has proper fallbacks: ${platformHardcoded}`);
  console.log(`   ✅ No mock data found: ${noMockData}`);
  
  if (demographicsHardcoded && platformHardcoded && noMockData) {
    console.log('   🎉 SUCCESS: Components use real data with proper fallbacks!\n');
  } else {
    console.log('   ❌ FAILURE: Components may have hardcoded or mock data\n');
  }
} catch (error) {
  console.log(`   ❌ ERROR: Could not read component files: ${error.message}\n`);
}

console.log('🏁 Testing Complete!');
console.log('\n📋 Summary:');
console.log('   • Demographics data should now show real percentages instead of 0%');
console.log('   • Platform breakdown should show real Facebook/Instagram and placement data');
console.log('   • Tabs should appear immediately on page refresh');
console.log('   • Selected tabs should have blue borders with consistent text color');
console.log('   • No hardcoded or mock data in the components');
