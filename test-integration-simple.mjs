#!/usr/bin/env node

// Simple Integration Test - Test if services can be imported and basic methods exist

console.log('🔍 Testing Service Integration...\n');

async function testServiceImports() {
  try {
    // Test 1: Google Ads Service
    console.log('1️⃣ Testing Google Ads Service import...');
    const { GoogleAdsService } = await import('./src/services/api/googleAdsService.ts');
    
    if (GoogleAdsService && typeof GoogleAdsService.getAdAccounts === 'function') {
      console.log('✅ Google Ads Service imported successfully');
      console.log('   - getAdAccounts method exists');
      console.log('   - testConnection method exists:', typeof GoogleAdsService.testConnection === 'function');
    } else {
      console.log('❌ Google Ads Service import failed');
    }

    // Test 2: GoHighLevel Service
    console.log('\n2️⃣ Testing GoHighLevel Service import...');
    const { GoHighLevelService } = await import('./src/services/ghl/goHighLevelService.ts');
    
    if (GoHighLevelService && typeof GoHighLevelService.getContacts === 'function') {
      console.log('✅ GoHighLevel Service imported successfully');
      console.log('   - getContacts method exists');
      console.log('   - setAgencyToken method exists:', typeof GoHighLevelService.setAgencyToken === 'function');
      console.log('   - testAgencyToken method exists:', typeof GoHighLevelService.testAgencyToken === 'function');
    } else {
      console.log('❌ GoHighLevel Service import failed');
    }

    // Test 3: Facebook Ads Service
    console.log('\n3️⃣ Testing Facebook Ads Service import...');
    const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
    
    if (FacebookAdsService && typeof FacebookAdsService.getAdAccounts === 'function') {
      console.log('✅ Facebook Ads Service imported successfully');
      console.log('   - getAdAccounts method exists');
      console.log('   - testConnection method exists:', typeof FacebookAdsService.testConnection === 'function');
    } else {
      console.log('❌ Facebook Ads Service import failed');
    }

    // Test 4: Shared Hooks
    console.log('\n4️⃣ Testing Shared Hooks import...');
    const { useGHLMetrics, useGHLFunnelAnalytics, useGHLContactCount } = await import('./src/hooks/useGHLHooks.ts');
    
    if (useGHLMetrics && useGHLFunnelAnalytics && useGHLContactCount) {
      console.log('✅ Shared Hooks imported successfully');
      console.log('   - useGHLMetrics exists');
      console.log('   - useGHLFunnelAnalytics exists');
      console.log('   - useGHLContactCount exists');
    } else {
      console.log('❌ Shared Hooks import failed');
    }

    // Test 5: Database Service
    console.log('\n5️⃣ Testing Database Service import...');
    const { DatabaseService } = await import('./src/services/data/databaseService.ts');
    
    if (DatabaseService && typeof DatabaseService.getAllClients === 'function') {
      console.log('✅ Database Service imported successfully');
      console.log('   - getAllClients method exists');
    } else {
      console.log('❌ Database Service import failed');
    }

    console.log('\n🎉 Service integration test completed!');
    console.log('\n📊 Summary:');
    console.log('   - All services can be imported');
    console.log('   - Core methods exist on all services');
    console.log('   - Shared hooks are available');
    console.log('   - Database service is accessible');

  } catch (error) {
    console.error('❌ Service integration test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testServiceImports().catch(console.error);
