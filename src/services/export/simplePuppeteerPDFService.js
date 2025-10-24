/**
 * Simple Puppeteer PDF Export Service (JavaScript)
 * Production-ready, minimal complexity, industry standard
 */

import puppeteer from 'puppeteer';

export class SimplePuppeteerPDFService {
  /**
   * Generate PDF with industry-standard Puppeteer approach
   */
  async generatePDF(config) {
    console.log('Starting PDF generation', {
      clientId: config.clientId,
      tabsCount: config.tabs.length,
      quality: config.quality
    });

    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      
      // Set viewport to landscape orientation (1920x1080)
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      });
      
      // Inject CSS to hide agency elements and show client header
      await page.addStyleTag({
        content: this.getPDFCSS()
      });
      
      const pdfPages = [];
      
      // Process each tab
      for (const tab of config.tabs) {
        console.log(`Processing tab: ${tab.name}`);
        
        // Navigate to specific tab URL
        try {
          console.log(`Navigating to tab URL: ${tab.url}`);
          await page.goto(tab.url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          
          // Wait for dashboard to fully load
          await page.waitForSelector('.mx-auto, .dashboard-container, main', { timeout: 10000 });
          
          // Wait for specific tab content to be visible
          await page.waitForFunction((tabId) => {
            // Check if the specific tab is active/visible
            const activeTab = document.querySelector(`[data-tab="${tabId}"], .tab-${tabId}, #${tabId}`);
            const tabContent = document.querySelector(`[data-tab-content="${tabId}"], .tab-content-${tabId}`);
            
            if (activeTab && tabContent) {
              return tabContent.offsetHeight > 0 && tabContent.offsetWidth > 0;
            }
            
            // Fallback: check for any content
            const charts = document.querySelectorAll('canvas, svg');
            const metrics = document.querySelectorAll('.metric-card, .card');
            return charts.length > 0 || metrics.length > 0;
          }, { timeout: 15000 }, tab.id);
          
          // Additional wait for charts to render
          await page.waitForFunction(() => {
            const charts = document.querySelectorAll('canvas, svg');
            return Array.from(charts).every(chart => {
              const rect = chart.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
          }, { timeout: 10000 });
          
          console.log(`Successfully loaded tab: ${tab.name} (${tab.id})`);
          
        } catch (error) {
          console.error(`Failed to load tab ${tab.name}: ${error.message}`);
          throw new Error(`Cannot access tab ${tab.name} at ${tab.url}. Please ensure the frontend server is running.`);
        }
        
        // Wait for content to be ready
        await this.waitForContentReady(page);
        
        // Apply PDF-specific styling (matches PDR exactly)
        await page.evaluate((tabName, clientName) => {
          // Hide ALL agency elements comprehensively
          const agencySelectors = [
            '.agency-header',
            '.admin-nav', 
            '.user-menu',
            '.export-button',
            '.tab-navigation',
            'nav[class*="nav"]',
            'header[class*="header"]',
            '.navbar',
            '.navigation',
            '[class*="admin"]',
            '[class*="agency"]',
            'button[class*="export"]',
            '.user-dropdown',
            '.profile-menu',
            // Additional selectors for common agency elements
            'header',
            'nav',
            '.header',
            '.nav',
            '.top-bar',
            '.toolbar',
            '.menu-bar',
            '.user-info',
            '.logout',
            '.settings',
            '.admin-panel',
            '.dashboard-header',
            '.page-header'
          ];
          
          agencySelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.style.display = 'none !important';
              el.style.visibility = 'hidden !important';
              el.style.height = '0 !important';
              el.style.overflow = 'hidden !important';
              el.remove(); // Completely remove from DOM
            });
          });
          
          // Also hide any elements with agency-related classes or IDs
          document.querySelectorAll('*').forEach(el => {
            const className = typeof el.className === 'string' ? el.className : '';
            const id = typeof el.id === 'string' ? el.id : '';
            if (className.includes('admin') || className.includes('agency') || 
                className.includes('nav') || className.includes('header') ||
                id.includes('admin') || id.includes('agency') ||
                id.includes('nav') || id.includes('header')) {
              if (el.tagName === 'HEADER' || el.tagName === 'NAV' || 
                  className.includes('menu') || className.includes('toolbar')) {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden !important';
              }
            }
          });
          
          // Ensure client header is visible
          const clientHeader = document.querySelector('.client-header');
          if (clientHeader) {
            clientHeader.style.display = 'block';
            clientHeader.style.visibility = 'visible';
            clientHeader.style.position = 'sticky';
            clientHeader.style.top = '0';
            clientHeader.style.zIndex = '100';
          }
          
          // Add tab title for PDF
          const body = document.body;
          const tabTitle = document.createElement('div');
          tabTitle.className = 'pdf-tab-title';
          tabTitle.textContent = `${tabName} - ${clientName}`;
          tabTitle.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 20px;
          `;
          body.insertBefore(tabTitle, body.firstChild);
        }, tab.name, config.clientName);
        
        // Capture page as PDF (screenshot-like fidelity)
        const pageBuffer = await page.pdf({
          width: '2880px',  // Much wider PDF page (1.5x 1920px)
          height: '1080px', // Reduced height as requested
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: false,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          // Quality improvements
          scale: config.quality === 'email' ? 0.8 : 1.0, // Reduced scale to fit better
          format: 'A4',
          landscape: true, // Force landscape orientation
          // Remove any potential blank pages
          omitBackground: false,
          timeout: 30000,
          // Ensure single page per tab
          pageRanges: '1'
        });
        
        pdfPages.push(Buffer.from(pageBuffer));
        
        console.log(`Captured tab: ${tab.name}`, {
          size: pageBuffer.length
        });
      }
      
      // Merge pages into single PDF
      const mergedPDF = await this.mergePDFPages(pdfPages);
      
      console.log('PDF generation completed', {
        finalSize: mergedPDF.length,
        pageCount: pdfPages.length,
        quality: config.quality
      });
      
      return mergedPDF;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Launch browser with optimized settings
   */
  async launchBrowser() {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--disable-web-security'
      ]
    });
  }

  /**
   * CSS for PDF optimization (matches PDR requirements)
   */
  getPDFCSS() {
    return `
      @media print {
        /* Hide agency elements */
        .agency-header,
        .admin-nav,
        .user-menu,
        .export-button,
        .tab-navigation {
          display: none !important;
        }
        
        /* Ensure client header is visible */
        .client-header {
          display: block !important;
          visibility: visible !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
        }
        
        /* Print color adjustment */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Prevent page breaks */
        .metric-card,
        .chart-container {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        /* Fix chart bleeding and sizing issues */
        .chart-container,
        canvas,
        svg,
        .recharts-wrapper,
        .recharts-surface {
          max-width: none !important;
          width: 100% !important;
          min-width: 100% !important;
          overflow: visible !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure cards contain their content */
        .card,
        .metric-card,
        [class*="card"] {
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        /* Fix chart dimensions */
        canvas {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* PDF tab title styling */
        .pdf-tab-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }
      }
    `;
  }

  /**
   * Wait for content to be ready (fail fast approach)
   */
  async waitForContentReady(page) {
    // Wait for charts to render (fail fast - 10s max)
    await page.waitForFunction(() => {
      const charts = document.querySelectorAll('canvas, svg[class*="chart"]');
      if (charts.length === 0) {
        return true;
      }
      
      return Array.from(charts).every(chart => {
        const rect = chart.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }, { timeout: 10000 });
    
    // Wait for images to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).every(img => img.complete);
    }, { timeout: 5000 });
    
    // Brief pause for animations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Merge PDF pages using pdf-lib
   */
  async mergePDFPages(pageBuffers) {
    const { PDFDocument } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();
    
    for (const buffer of pageBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    return Buffer.from(await mergedPdf.save());
  }
}
