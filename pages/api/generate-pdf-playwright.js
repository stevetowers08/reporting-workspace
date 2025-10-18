import { PDFDocument } from 'pdf-lib';
import { chromium } from 'playwright';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let browser = null;

  try {
    const { url, clientName, dateRange, tabs, authToken } = req.body;

    console.log('🚀 Starting Playwright PDF generation:', { clientName, url, tabs });

    if (!url || !clientName) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: url and clientName' 
      });
      return;
    }

    // Launch headless browser with correct settings for Recharts
    console.log('🌐 Launching Chromium browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage', // Prevents crashes in Docker
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage({
      viewport: { width: 1680, height: 1050 } // Match dashboard width
    });

    // Navigate to dashboard URL
    console.log('📄 Navigating to dashboard:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle', // Wait for all network requests to finish
      timeout: 30000 
    });

    // Set auth token if provided
    if (authToken) {
      console.log('🔐 Setting authentication token...');
      await page.evaluate((token) => {
        localStorage.setItem('supabase.auth.token', token);
      }, authToken);
      
      // Reload page to apply auth
      await page.reload({ waitUntil: 'networkidle' });
    }

    // Wait for initial Recharts SVG elements to render
    console.log('⏳ Waiting for Recharts to render...');
    await page.waitForSelector('.recharts-wrapper svg', { 
      state: 'visible',
      timeout: 30000 
    });

    // Additional wait for animations to complete
    await page.waitForTimeout(1000);

    // Define tab selectors based on your dashboard structure
    const tabSelectors = [
      '[data-tab="summary"]',
      '[data-tab="meta"]', 
      '[data-tab="google"]',
      '[data-tab="leads"]'
    ].filter((_, index) => {
      // Only process tabs that are visible to the client
      return tabs ? tabs.includes(['summary', 'meta', 'google', 'leads'][index]) : true;
    });

    console.log('📊 Processing tabs:', tabSelectors);

    const pdfBuffers = [];

    // Loop through each tab
    for (let i = 0; i < tabSelectors.length; i++) {
      const tabSelector = tabSelectors[i];
      const tabName = ['summary', 'meta', 'google', 'leads'][i];
      
      console.log(`📄 Processing tab: ${tabName}`);

      try {
        // Click tab button
        await page.click(tabSelector, { timeout: 5000 });
        
        // Wait for tab content to be visible
        await page.waitForSelector('.recharts-wrapper svg', { 
          state: 'visible',
          timeout: 10000 
        });
        
        // Wait for animations to complete
        await page.waitForTimeout(1000);

        // Hide unwanted elements for this tab
        await page.evaluate(() => {
          // Hide tab navigation
          const tabElements = document.querySelectorAll('[role="tablist"], .tabs-list, .tab-list, [role="tab"], .tabs-trigger, .tab-trigger');
          tabElements.forEach(el => (el as HTMLElement).style.display = 'none');
          
          // Hide buttons and controls
          const controls = document.querySelectorAll('button, .btn, nav, .export-button, .share-button');
          controls.forEach(el => (el as HTMLElement).style.display = 'none');
        });

        // Capture this tab as PDF
        console.log(`📸 Capturing ${tabName} tab...`);
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true, // CRITICAL for colors
          preferCSSPageSize: false,
          margin: {
            top: '2cm',
            right: '1cm',
            bottom: '2cm',
            left: '1cm'
          },
          displayHeaderFooter: true,
          headerTemplate: `
            <div style="font-size: 12px; text-align: center; width: 100%; color: #333; margin: 0 20px;">
              <span style="font-weight: bold;">${clientName} - ${tabName.charAt(0).toUpperCase() + tabName.slice(1)} Analytics</span>
              <br>
              <span>Report Period: ${dateRange}</span>
            </div>
          `,
          footerTemplate: `
            <div style="font-size: 10px; text-align: center; width: 100%; color: #666; margin: 0 20px;">
              <span>Generated: ${new Date().toLocaleDateString()}</span>
              <span style="margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>
          `
        });

        pdfBuffers.push(pdfBuffer);
        console.log(`✅ Successfully captured ${tabName} tab`);

      } catch (tabError) {
        console.error(`❌ Error processing tab ${tabName}:`, tabError);
        // Continue with other tabs
      }
    }

    if (pdfBuffers.length === 0) {
      throw new Error('No tabs were successfully processed');
    }

    // Merge multiple PDFs into one document
    console.log('📄 Merging PDF pages...');
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const finalPdf = await mergedPdf.save();

    // Generate unique filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_${timestamp}.pdf`;

    console.log('✅ PDF generated successfully');

    // Return PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(Buffer.from(finalPdf));

  } catch (error) {
    console.error('💥 PDF generation error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  } finally {
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed successfully');
      } catch (closeError) {
        console.error('⚠️ Error closing browser:', closeError);
      }
    }
  }
}
