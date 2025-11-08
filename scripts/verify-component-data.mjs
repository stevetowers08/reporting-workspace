#!/usr/bin/env node

/**
 * Verify that campaignBreakdown data structure matches what the component expects
 */

const testData = {
  campaignTypes: {
    search: { conversions: 41, impressions: 111968, conversionRate: 0.0366 },
    display: { conversions: 0, impressions: 0, conversionRate: 0 },
    youtube: { conversions: 0, impressions: 0, conversionRate: 0 }
  },
  adFormats: {
    textAds: { conversions: 0, impressions: 0, conversionRate: 0 },
    responsiveDisplay: { conversions: 41, impressions: 111968, conversionRate: 0.0366 },
    videoAds: { conversions: 0, impressions: 0, conversionRate: 0 }
  }
};

// Simulate component data preparation (exact code from GoogleAdsCampaignBreakdown.tsx)
function simulateComponentData(campaignBreakdown) {
  const campaignTypesData = [
    {
      name: 'Search',
      impressions: campaignBreakdown?.campaignTypes?.search?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.search?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.search?.conversionRate || 0
    },
    {
      name: 'Display',
      impressions: campaignBreakdown?.campaignTypes?.display?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.display?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.display?.conversionRate || 0
    },
    {
      name: 'YouTube',
      impressions: campaignBreakdown?.campaignTypes?.youtube?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.youtube?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.youtube?.conversionRate || 0
    }
  ];

  const adFormatsData = [
    {
      name: 'Text Ads',
      impressions: campaignBreakdown?.adFormats?.textAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.textAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.textAds?.conversionRate || 0
    },
    {
      name: 'Responsive Display',
      impressions: campaignBreakdown?.adFormats?.responsiveDisplay?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.responsiveDisplay?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.responsiveDisplay?.conversionRate || 0
    },
    {
      name: 'Video Ads',
      impressions: campaignBreakdown?.adFormats?.videoAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.videoAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.videoAds?.conversionRate || 0
    }
  ];

  return { campaignTypesData, adFormatsData };
}

console.log('🔍 Verifying Component Data Structure\n');

// Test 1: Direct data
console.log('1️⃣ Testing with direct campaignBreakdown data:');
const componentData1 = simulateComponentData(testData);
console.log('   Campaign Types:', JSON.stringify(componentData1.campaignTypesData, null, 2));
console.log('   Ad Formats:', JSON.stringify(componentData1.adFormatsData, null, 2));
console.log('   ✅ Search has data:', componentData1.campaignTypesData[0].conversions > 0);
console.log('   ✅ Responsive Display has data:', componentData1.adFormatsData[1].conversions > 0);
console.log('');

// Test 2: Nested in googleMetrics
console.log('2️⃣ Testing with nested data structure (data.googleMetrics.campaignBreakdown):');
const nestedData = {
  googleMetrics: {
    campaignBreakdown: testData
  }
};
const componentData2 = simulateComponentData(nestedData.googleMetrics?.campaignBreakdown);
console.log('   Campaign Types:', JSON.stringify(componentData2.campaignTypesData, null, 2));
console.log('   Ad Formats:', JSON.stringify(componentData2.adFormatsData, null, 2));
console.log('   ✅ Search has data:', componentData2.campaignTypesData[0].conversions > 0);
console.log('   ✅ Responsive Display has data:', componentData2.adFormatsData[1].conversions > 0);
console.log('');

// Test 3: Check what happens if data is undefined
console.log('3️⃣ Testing with undefined data:');
const componentData3 = simulateComponentData(undefined);
console.log('   Campaign Types:', JSON.stringify(componentData3.campaignTypesData, null, 2));
console.log('   Ad Formats:', JSON.stringify(componentData3.adFormatsData, null, 2));
console.log('   ⚠️  All zeros (expected if no data)');
console.log('');

// Test 4: Check chart rendering requirements
console.log('4️⃣ Chart Rendering Requirements:');
const hasCampaignData = componentData1.campaignTypesData.some(item => item.conversions > 0 || item.impressions > 0);
const hasAdFormatData = componentData1.adFormatsData.some(item => item.conversions > 0 || item.impressions > 0);
console.log('   Campaign Types will render:', hasCampaignData ? '✅ YES' : '❌ NO (all zeros)');
console.log('   Ad Formats will render:', hasAdFormatData ? '✅ YES' : '❌ NO (all zeros)');
console.log('');

// Test 5: Verify the exact path the component uses
console.log('5️⃣ Component Data Path Verification:');
const mockData = {
  googleMetrics: {
    campaignBreakdown: testData
  }
};
const campaignBreakdown = mockData?.googleMetrics?.campaignBreakdown;
console.log('   Path: data?.googleMetrics?.campaignBreakdown');
console.log('   Value exists:', !!campaignBreakdown);
console.log('   campaignTypes exists:', !!campaignBreakdown?.campaignTypes);
console.log('   campaignTypes.search exists:', !!campaignBreakdown?.campaignTypes?.search);
console.log('   campaignTypes.search.conversions:', campaignBreakdown?.campaignTypes?.search?.conversions);
console.log('   campaignTypes.search.impressions:', campaignBreakdown?.campaignTypes?.search?.impressions);
console.log('   adFormats exists:', !!campaignBreakdown?.adFormats);
console.log('   adFormats.responsiveDisplay exists:', !!campaignBreakdown?.adFormats?.responsiveDisplay);
console.log('   adFormats.responsiveDisplay.conversions:', campaignBreakdown?.adFormats?.responsiveDisplay?.conversions);
console.log('   adFormats.responsiveDisplay.impressions:', campaignBreakdown?.adFormats?.responsiveDisplay?.impressions);
console.log('');

console.log('✅ Component data structure verification complete!');
console.log('');
console.log('📊 Expected Chart Output:');
console.log('   Campaign Types Chart:');
componentData1.campaignTypesData.forEach(item => {
  if (item.conversions > 0 || item.impressions > 0) {
    console.log(`      - ${item.name}: ${item.conversions} conversions, ${item.impressions.toLocaleString()} impressions`);
  }
});
console.log('   Ad Formats Chart:');
componentData1.adFormatsData.forEach(item => {
  if (item.conversions > 0 || item.impressions > 0) {
    console.log(`      - ${item.name}: ${item.conversions} conversions, ${item.impressions.toLocaleString()} impressions`);
  }
});

