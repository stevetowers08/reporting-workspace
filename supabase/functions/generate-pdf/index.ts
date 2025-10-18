import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { chromium } from 'https://esm.sh/playwright@1.40.0';

interface PDFGenerationRequest {
  url: string;
  clientName: string;
  dateRange: string;
  tabs: string[];
  authToken?: string;
}

interface PDFGenerationResponse {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, clientName, dateRange, tabs, authToken }: PDFGenerationRequest = await req.json();

    console.log('🚀 Starting high-quality PDF generation:', { clientName, url, tabs });

    if (!url || !clientName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters: url and clientName' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Launch Playwright browser
    console.log('🌐 Launching browser...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2 // High DPI for crisp screenshots
      });

      const page = await context.newPage();

      // Set auth token if provided
      if (authToken) {
        await page.setExtraHTTPHeaders({
          'Authorization': `Bearer ${authToken}`
        });
      }

      // Navigate to dashboard
      console.log('📱 Navigating to dashboard:', url);
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for dashboard content to load
      console.log('⏳ Waiting for dashboard content...');
      await page.waitForSelector('[data-testid="dashboard-content"], main, .dashboard-content', { 
        timeout: 15000 
      });

      // Hide unwanted elements for PDF (but keep tab buttons for now)
      await page.evaluate(() => {
        // Hide all header elements (agency headers)
        const headers = document.querySelectorAll('header');
        headers.forEach(header => {
          const el = header as HTMLElement;
          el.style.display = 'none';
        });

        // Hide navigation and interactive elements (but NOT tab buttons yet)
        const elementsToHide = [
          'nav',
          '.export-button',
          '.share-button',
          '.navigation',
          '.nav',
          '.controls',
          '.action-buttons',
          '.toolbar',
          'select',
          '.dropdown',
          '.portal',
          '[data-radix-portal]'
        ];

        elementsToHide.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const el = element as HTMLElement;
            el.style.display = 'none';
          });
        });

        // Remove sticky positioning from remaining elements
        const stickyElements = document.querySelectorAll('.sticky');
        stickyElements.forEach(element => {
          const el = element as HTMLElement;
          el.style.position = 'static';
        });
      });

      // Create PDF document
      console.log('📄 Creating PDF document...');
      const pdfDoc = await PDFDocument.create();
      const { width, height } = { width: 595, height: 842 }; // A4 size

      // Add cover page
      const coverPage = pdfDoc.addPage([width, height]);
      coverPage.drawText(`${clientName} - Event Analytics Dashboard`, {
        x: 50,
        y: height - 100,
        size: 24,
        color: rgb(0, 0, 0)
      });
      
      coverPage.drawText(`Report Period: ${dateRange}`, {
        x: 50,
        y: height - 140,
        size: 16,
        color: rgb(0, 0, 0)
      });
      
      coverPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: height - 170,
        size: 14,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Define tab configurations based on actual implementation
      const tabConfigs = [
        { 
          id: 'summary', 
          name: 'Summary', 
          buttonSelector: 'button:has-text("Summary")',
          contentSelector: '[data-state="active"][value="summary"], .tabs-content [data-state="active"]'
        },
        { 
          id: 'meta', 
          name: 'Meta Ads', 
          buttonSelector: 'button:has-text("Meta")',
          contentSelector: '[data-state="active"][value="meta"], .tabs-content [data-state="active"]'
        },
        { 
          id: 'google', 
          name: 'Google Ads', 
          buttonSelector: 'button:has-text("Google")',
          contentSelector: '[data-state="active"][value="google"], .tabs-content [data-state="active"]'
        },
        { 
          id: 'leads', 
          name: 'Lead Analytics', 
          buttonSelector: 'button:has-text("Lead Info")',
          contentSelector: '[data-state="active"][value="leads"], .tabs-content [data-state="active"]'
        }
      ];

      // Capture each tab separately
      for (const tabConfig of tabConfigs) {
        console.log(`📸 Capturing ${tabConfig.name} tab...`);
        
        try {
          // Click on the tab button to activate it
          const tabButton = await page.$(tabConfig.buttonSelector);
          if (tabButton) {
            await tabButton.click();
            await page.waitForTimeout(2000); // Wait for content to load and charts to render
          } else {
            console.log(`⚠️ Could not find tab button for ${tabConfig.name}`);
            continue;
          }

          // Wait for tab content to be visible
          await page.waitForSelector(tabConfig.contentSelector, { timeout: 10000 });
          
          // Take screenshot of the tab content
          const screenshot = await page.screenshot({
            fullPage: true,
            type: 'png',
            quality: 100
          });

          // Add tab section page
          const tabPage = pdfDoc.addPage([width, height]);
          
          // Add tab title
          tabPage.drawText(tabConfig.name, {
            x: 50,
            y: height - 50,
            size: 18,
            color: rgb(0, 0, 0)
          });

          // Embed screenshot
          const pngImage = await pdfDoc.embedPng(screenshot);
          const imageDims = pngImage.scale(0.75); // Slightly smaller for better fit
          
          // Calculate how many pages we need for this tab's screenshot
          const imageHeight = imageDims.height;
          const pageHeight = height - 100; // Leave space for margins
          const pagesNeeded = Math.ceil(imageHeight / pageHeight);
          
          for (let i = 0; i < pagesNeeded; i++) {
            const page = pdfDoc.addPage([width, height]);
            const yOffset = -(i * pageHeight);
            
            page.drawImage(pngImage, {
              x: 50,
              y: height - 50 + yOffset,
              width: imageDims.width,
              height: imageDims.height
            });
          }

        } catch (error) {
          console.log(`⚠️ Could not capture ${tabConfig.name} tab:`, error.message);
          // Continue with other tabs
        }
      }

      // Hide tab buttons after we're done with them
      await page.evaluate(() => {
        const tabElements = document.querySelectorAll('button:has-text("Summary"), button:has-text("Meta"), button:has-text("Google"), button:has-text("Lead Info")');
        tabElements.forEach(element => {
          const el = element as HTMLElement;
          el.style.display = 'none';
        });
      });

      // Generate PDF buffer
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = new Uint8Array(pdfBytes);

    } finally {
      await browser.close();
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_${timestamp}.pdf`;

    console.log('✅ PDF generated successfully');

    // Return PDF directly
    return new Response(pdfBuffer, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('💥 PDF generation error:', error);
    
    const response: PDFGenerationResponse = {
      success: false,
      error: error.message || 'Failed to generate PDF'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

