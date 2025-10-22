/**
 * Simple Puppeteer PDF Export Service
 * Production-ready, minimal complexity, industry standard
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { DevLogger } from '../../lib/logger';

export interface SimpleExportConfig {
  clientId: string;
  clientName: string;
  tabs: {
    id: string;
    name: string;
    url: string;
  }[];
  dateRange: {
    start: string;
    end: string;
  };
  quality: 'email' | 'download';
}

export class SimplePuppeteerPDFService {
  private browser: Browser | null = null;

  /**
   * Generate PDF with industry-standard Puppeteer approach
   */
  async generatePDF(config: SimpleExportConfig): Promise<Buffer> {
    DevLogger.info('SimplePuppeteerPDFService', 'Starting PDF generation', {
      clientId: config.clientId,
      tabsCount: config.tabs.length,
      quality: config.quality
    });

    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      
      // Set viewport to exact requirements (1920x1080)
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      });
      
      // Inject CSS to hide agency elements and show client header
      await page.addStyleTag({
        content: this.getPDFCSS()
      });
      
      const pdfPages: Buffer[] = [];
      
      // Process each tab
      for (const tab of config.tabs) {
        DevLogger.info('SimplePuppeteerPDFService', `Processing tab: ${tab.name}`);
        
        // Navigate to tab URL
        await page.goto(tab.url, {
          waitUntil: 'networkidle0',
          timeout: 15000 // Fail fast, not 30s
        });
        
        // Wait for content to be ready
        await this.waitForContentReady(page);
        
        // Apply PDF-specific styling
        await page.evaluate(() => {
          // Hide agency elements
          document.querySelectorAll('.agency-header, .admin-nav, .user-menu, .export-button')
            .forEach(el => {
              const htmlEl = el as any;
              htmlEl.style.display = 'none';
            });
          
          // Ensure client header is visible
          const clientHeader = document.querySelector('.client-header');
          if (clientHeader) {
            const htmlEl = clientHeader as any;
            htmlEl.style.display = 'block';
            htmlEl.style.visibility = 'visible';
            htmlEl.style.position = 'sticky';
            htmlEl.style.top = '0';
            htmlEl.style.zIndex = '100';
          }
        });
        
        // Generate PDF page with optimized settings
        const pageBuffer = await page.pdf({
          width: '2880px',  // Much wider PDF page (1.5x 1920px)
          height: '1080px', // Reduced height as requested
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: false,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          // Quality vs size optimization
          ...(config.quality === 'email' ? {
            // Email optimization: smaller file size
            scale: 0.8
          } : {
            // Download optimization: better quality
            scale: 1.0
          })
        });
        
        pdfPages.push(Buffer.from(pageBuffer));
        
        DevLogger.info('SimplePuppeteerPDFService', `Captured tab: ${tab.name}`, {
          size: pageBuffer.length
        });
      }
      
      // Merge pages into single PDF
      const mergedPDF = await this.mergePDFPages(pdfPages);
      
      DevLogger.info('SimplePuppeteerPDFService', 'PDF generation completed', {
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
  private async launchBrowser(): Promise<Browser> {
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
   * CSS for PDF optimization
   */
  private getPDFCSS(): string {
    return `
      @media print {
        /* Hide agency elements */
        .agency-header,
        .admin-nav,
        .user-menu,
        .export-button {
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
        
        /* Ensure cards don't constrain content */
        .card,
        .metric-card,
        [class*="card"] {
          overflow: visible !important;
          box-sizing: border-box !important;
        }
        
        /* Remove any padding/margins that squash content */
        .dashboard-content,
        .tab-content {
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Ensure full width utilization */
        body, html {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Fix any container constraints */
        .container,
        .max-w-7xl,
        .mx-auto {
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
        }
      }
    `;
  }

  /**
   * Wait for content to be ready (fail fast approach)
   */
  private async waitForContentReady(page: Page): Promise<void> {
    // Wait for charts to render (fail fast - 10s max)
    await page.waitForFunction(() => {
      const charts = document.querySelectorAll('canvas, svg[class*="chart"]');
      if (charts.length === 0) {return true;}
      
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
  private async mergePDFPages(pageBuffers: Buffer[]): Promise<Buffer> {
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
