#!/usr/bin/env node

/**
 * Comprehensive test for multi-tab PDF generation
 * Tests the complete Playwright screenshot approach with proper tab handling
 */

const testMultiTabPDF = async () => {
  console.log('🧪 Testing Multi-Tab PDF Generation');
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

    const startTime = Date.now();
    
    const response = await fetch('https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw'
      },
      body: JSON.stringify(testPayload)
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('⏱️ Generation time:', `${duration}ms`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log('✅ Multi-tab PDF generated successfully!');
        
        // Save the PDF to a file for inspection
        const pdfBuffer = await response.arrayBuffer();
        const fs = await import('fs');
        fs.writeFileSync('test-multi-tab-dashboard.pdf', Buffer.from(pdfBuffer));
        console.log('💾 PDF saved as test-multi-tab-dashboard.pdf');
        
        console.log('📄 PDF size:', pdfBuffer.byteLength, 'bytes');
        console.log('📋 This PDF should contain:');
        console.log('   ✅ Cover page with client info');
        console.log('   ✅ Summary tab screenshot');
        console.log('   ✅ Meta Ads tab screenshot');
        console.log('   ✅ Google Ads tab screenshot');
        console.log('   ✅ Lead Analytics tab screenshot');
        console.log('   ❌ No agency headers');
        console.log('   ❌ No navigation elements');
        console.log('   ❌ No export buttons');
        
        // Basic validation
        if (pdfBuffer.byteLength > 100000) { // At least 100KB
          console.log('✅ PDF size looks reasonable');
        } else {
          console.log('⚠️ PDF seems small, might be missing content');
        }
        
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
    console.error('Stack:', error.stack);
  }
};

// Run the test
testMultiTabPDF().then(() => {
  console.log('\n🏁 Test completed');
  console.log('\n📝 Next steps:');
  console.log('   1. Open test-multi-tab-dashboard.pdf to verify content');
  console.log('   2. Check that all tabs are captured');
  console.log('   3. Verify agency headers are hidden');
  console.log('   4. Test with real client data if needed');
}).catch(error => {
  console.error('💥 Test error:', error);
});
