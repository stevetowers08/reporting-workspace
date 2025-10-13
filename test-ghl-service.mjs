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

async function testGHLService() {
  console.log('🔍 Testing GoHighLevel Service directly...\n');

  try {
    // Import the service
    const { GoHighLevelService } = await import('./src/services/ghl/goHighLevelService.js');
    
    const locationId = 'glgXnEKLMggg0CFhBRN8';
    const dateRange = {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    };
    
    console.log('📊 Testing GoHighLevelService.getGHLMetrics...');
    console.log(`- Location ID: ${locationId}`);
    console.log(`- Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n`);
    
    const result = await GoHighLevelService.getGHLMetrics(locationId, dateRange);
    
    console.log('✅ GoHighLevelService.getGHLMetrics result:', {
      totalContacts: result?.totalContacts,
      newContacts: result?.newContacts,
      totalOpportunities: result?.totalOpportunities,
      wonOpportunities: result?.wonOpportunities,
      pipelineValue: result?.pipelineValue,
      avgDealSize: result?.avgDealSize,
      conversionRate: result?.conversionRate,
      wonRevenue: result?.wonRevenue
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGHLService();
