// Test script for PDF export functionality
// Run this in browser console to test the PDF export

async function testPDFExport() {
  console.log('🧪 Testing PDF Export Functionality...');
  
  try {
    // Test 1: Check if Playwright service is available
    console.log('1️⃣ Testing Playwright service availability...');
    
    // Import the service dynamically
    const module = await import('/src/services/export/playwrightPdfService.ts');
    const { PlaywrightPDFService } = module;
    
    const isAvailable = await PlaywrightPDFService.isServiceAvailable();
    console.log('Playwright service available:', isAvailable);
    
    if (!isAvailable) {
      console.log('❌ Playwright service not available, will fall back to client-side export');
    }
    
    // Test 2: Test PDF generation
    console.log('2️⃣ Testing PDF generation...');
    
    const testOptions = {
      clientName: 'Test Client',
      dateRange: '2024-01-01 to 2024-01-31',
      tabs: ['summary']
    };
    
    const result = await PlaywrightPDFService.generateDashboardPDF(testOptions);
    
    if (result.success) {
      console.log('✅ PDF generated successfully!');
      console.log('PDF URL:', result.pdfUrl);
      
      // Test 3: Test download
      console.log('3️⃣ Testing PDF download...');
      await PlaywrightPDFService.generateAndDownloadPDF(testOptions);
      console.log('✅ PDF download triggered!');
      
    } else {
      console.log('❌ PDF generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test client-side fallback
async function testClientSideFallback() {
  console.log('🧪 Testing Client-Side Fallback...');
  
  try {
    const { usePDFExport } = await import('/src/hooks/usePDFExport.ts');
    console.log('✅ Client-side PDF export hook loaded successfully');
    
    // Test the old html2canvas method
    const { PDFExportService } = await import('/src/services/export/pdfExportService.ts');
    console.log('✅ Client-side PDF service loaded successfully');
    
  } catch (error) {
    console.error('❌ Client-side fallback test failed:', error);
  }
}

// Export test functions for manual testing in browser console
if (typeof window !== 'undefined') {
  window.testPDFExport = testPDFExport;
  window.testClientSideFallback = testClientSideFallback;
  
  console.log('🚀 PDF Export Test Functions Loaded!');
  console.log('Run testPDFExport() to test Playwright PDF export');
  console.log('Run testClientSideFallback() to test client-side fallback');
}
