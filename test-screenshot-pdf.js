#!/usr/bin/env node

/**
 * Test script for screenshot-based PDF generation
 * Tests the new Playwright screenshot approach
 */

const testScreenshotPDF = async () => {
  console.log('🧪 Testing Screenshot PDF Generation');
  console.log('=====================================');

  try {
    // Test the API endpoint
    const testPayload = {
      url: 'http://localhost:5173', // Your local dev server
      clientName: 'Test Client',
      dateRange: '2024-01-01 to 2024-01-31',
      tabs: ['summary', 'meta', 'google', 'leads'],
      authToken: null
    };

    console.log('📤 Sending test request to Playwright API...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://localhost:54321/functions/v1/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-supabase-anon-key'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log('✅ Multi-tab PDF generated successfully!');
        
        // Save the PDF to a file for inspection
        const pdfBuffer = await response.arrayBuffer();
        const fs = require('fs');
        fs.writeFileSync('test-multi-tab-dashboard.pdf', Buffer.from(pdfBuffer));
        console.log('💾 PDF saved as test-multi-tab-dashboard.pdf');
        
        console.log('📄 PDF size:', pdfBuffer.byteLength, 'bytes');
        console.log('📋 This PDF should contain:');
        console.log('   - Cover page with client info');
        console.log('   - Summary tab screenshot');
        console.log('   - Meta Ads tab screenshot');
        console.log('   - Google Ads tab screenshot');
        console.log('   - Lead Analytics tab screenshot');
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Request failed:', response.status, errorText);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
};

// Run the test
testScreenshotPDF().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test error:', error);
});
