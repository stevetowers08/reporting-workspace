/**
 * Puppeteer PDF Export Service - Production Implementation
 * Based on PDR v2.0 specifications
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { debugLogger } from '../../lib/debugLogger';

const execAsync = promisify(exec);

export interface ExportConfig {
  clientId: string;
  userId: string;
  clientName: string;
  tabs: TabConfig[];
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    region?: string;
    [key: string]: any;
  };
  options: {
    quality: 'email' | 'download' | 'archive';
    includeClientHeader: boolean;
    excludeAgencyHeader: boolean;
    deliveryMethod: 'email' | 'download';
  };
}

export interface TabConfig {
  id: string;
  name: string;
  url: string;
}

export interface ExportResult {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime?: string;
  statusUrl?: string;
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: string;
  pageCount?: number;
  generatedAt?: string;
  error?: string;
}

export class PuppeteerPDFExporter {
  private browser: Browser | null = null;
  private readonly compressionPresets = {
    email: {
      dpi: 150,
      imageQuality: 0.85,
      ghostscriptSetting: '/ebook',
      targetSize: '8MB',
      expectedQuality: 'Good for screen viewing'
    },
    download: {
      dpi: 200,
      imageQuality: 0.92,
      ghostscriptSetting: '/printer',
      targetSize: '15MB',
      expectedQuality: 'Excellent for screen and print'
    },
    archive: {
      dpi: 300,
      imageQuality: 1.0,
      ghostscriptSetting: '/prepress',
      targetSize: '25MB',
      expectedQuality: 'Print-ready quality'
    }
  };

  /**
   * Generate client report using Puppeteer
   */
  async generateClientReport(config: ExportConfig): Promise<Buffer> {
    debugLogger.info('PuppeteerPDFExporter', 'Starting PDF generation', {
      clientId: config.clientId,
      tabsCount: config.tabs.length,
      quality: config.options.quality
    });

    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      
      // Set viewport to exact PDR requirements
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1 // Quality vs. size balance
      });
      
      // Authenticate as client user
      await this.authenticateClientSession(page, config.clientId, config.userId);
      
      // Inject print-specific CSS
      await page.addStyleTag({
        content: this.getPrintCSS()
      });
      
      const pdfPages: Buffer[] = [];
      
      // Process each tab according to PDR specifications
      for (const tab of config.tabs) {
        debugLogger.info('PuppeteerPDFExporter', `Processing tab: ${tab.name}`, {
          tabId: tab.id,
          url: tab.url
        });
        
        // Navigate to tab
        await page.goto(tab.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        // Wait for dynamic content to load
        await this.waitForContentReady(page);
        
        // Hide agency header, show client header
        await page.evaluate(() => {
          // Hide agency elements as per PDR requirements
          document.querySelectorAll('.agency-header, .admin-nav, .user-menu, [data-exclude-from-pdf]')
            .forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.display = 'none';
            });
          
          // Ensure client header is visible
          const clientHeader = document.querySelector('.client-header[data-pdf-include]');
          if (clientHeader) {
            const htmlEl = clientHeader as HTMLElement;
            htmlEl.style.display = 'block';
            htmlEl.style.visibility = 'visible';
            htmlEl.style.position = 'sticky';
            htmlEl.style.top = '0';
            htmlEl.style.zIndex = '100';
          }
          
          // Replace tab navigation with styled title
          const tabNav = document.querySelector('.tab-navigation');
          if (tabNav) {
            const title = document.createElement('div');
            title.className = 'pdf-tab-title';
            title.textContent = document.title;
            tabNav.replaceWith(title);
          }
        });
        
        // Capture page as PDF with PDR specifications
        const pageBuffer = await page.pdf({
          width: '1920px',
          height: '1080px',
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: false,
          margin: { top: 0, bottom: 0, left: 0, right: 0 }
        });
        
        pdfPages.push(pageBuffer);
        
        debugLogger.info('PuppeteerPDFExporter', `Successfully captured tab: ${tab.name}`, {
          pageSize: pageBuffer.length
        });
      }
      
      // Merge all pages
      const mergedPDF = await this.mergePDFPages(pdfPages);
      
      // Compress for email delivery
      const compressedPDF = await this.compressPDF(mergedPDF, config.options.quality);
      
      // Add metadata
      const finalPDF = await this.addMetadata(compressedPDF, {
        title: `${config.clientName} - Analytics Report`,
        author: 'Marketing Analytics Platform',
        subject: `Generated ${new Date().toISOString()}`,
        keywords: 'analytics, report, dashboard, marketing'
      });
      
      debugLogger.info('PuppeteerPDFExporter', 'PDF generation completed', {
        finalSize: finalPDF.length,
        pageCount: pdfPages.length
      });
      
      return finalPDF;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Launch Puppeteer browser with optimized settings
   */
  private async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    return this.browser;
  }

  /**
   * Authenticate client session for PDF generation
   */
  private async authenticateClientSession(page: Page, clientId: string, userId: string): Promise<void> {
    // TODO: Implement proper authentication
    // This would typically involve:
    // 1. Setting authentication cookies
    // 2. Adding authorization headers
    // 3. Ensuring proper session context
    
    debugLogger.info('PuppeteerPDFExporter', 'Authenticating client session', {
      clientId,
      userId
    });
    
    // For now, we'll assume the session is already authenticated
    // In production, this would integrate with your auth system
  }

  /**
   * Get print-specific CSS as per PDR specifications
   */
  private getPrintCSS(): string {
    return `
      @media print, screen {
        /* Hide agency elements as per PDR requirements */
        .agency-header,
        .admin-nav,
        .user-menu,
        .export-button,
        [data-exclude-from-pdf] {
          display: none !important;
        }
        
        /* Ensure client header is visible */
        .client-header[data-pdf-include] {
          display: flex !important;
          visibility: visible !important;
          background: white;
          border-bottom: 2px solid #e5e7eb;
          padding: 20px 40px;
          width: 1920px;
          height: 120px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        /* Tab title styling */
        .pdf-tab-title {
          font-size: 36px;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          padding: 30px 0;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          border-bottom: 3px solid #3b82f6;
        }
        
        /* Ensure backgrounds and colors print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* Prevent page breaks within elements */
        .metric-card,
        .chart-container,
        .data-table {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        /* Dashboard content styling */
        .dashboard-content {
          padding: 20px;
          background: white;
        }
        
        /* Chart optimization */
        canvas, svg {
          max-width: 100%;
          height: auto;
        }
      }
    `;
  }

  /**
   * Wait for content to be ready for capture
   */
  private async waitForContentReady(page: Page): Promise<void> {
    // Wait for all charts to render
    await page.waitForFunction(() => {
      const charts = document.querySelectorAll('canvas, svg[class*="chart"]');
      if (charts.length === 0) return true; // No charts
      
      return Array.from(charts).every(chart => {
        const rect = chart.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }, { timeout: 15000 });
    
    // Wait for lazy-loaded images
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).every(img => img.complete);
    }, { timeout: 10000 });
    
    // Additional wait for animations to settle
    await page.waitForTimeout(1000);
  }

  /**
   * Merge PDF pages using pdf-lib
   */
  private async mergePDFPages(pageBuffers: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();
    
    for (const buffer of pageBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    return Buffer.from(await mergedPdf.save());
  }

  /**
   * Compress PDF using Ghostscript
   */
  private async compressPDF(pdfBuffer: Buffer, quality: 'email' | 'download' | 'archive'): Promise<Buffer> {
    const preset = this.compressionPresets[quality];
    
    // Create temporary files
    const tempDir = '/tmp';
    const timestamp = Date.now();
    const tempInput = path.join(tempDir, `input-${timestamp}.pdf`);
    const tempOutput = path.join(tempDir, `output-${timestamp}.pdf`);
    
    try {
      // Write input file
      await fs.writeFile(tempInput, pdfBuffer);
      
      // Compress using Ghostscript
      const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${preset.ghostscriptSetting} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
      
      await execAsync(command);
      
      // Read compressed file
      const compressed = await fs.readFile(tempOutput);
      
      debugLogger.info('PuppeteerPDFExporter', 'PDF compression completed', {
        originalSize: pdfBuffer.length,
        compressedSize: compressed.length,
        compressionRatio: Math.round((1 - compressed.length / pdfBuffer.length) * 100) + '%',
        quality: preset.expectedQuality
      });
      
      return compressed;
      
    } finally {
      // Cleanup temporary files
      try {
        await fs.unlink(tempInput);
        await fs.unlink(tempOutput);
      } catch (error) {
        debugLogger.warn('PuppeteerPDFExporter', 'Failed to cleanup temp files', error);
      }
    }
  }

  /**
   * Add metadata to PDF
   */
  private async addMetadata(pdfBuffer: Buffer, metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    pdfDoc.setTitle(metadata.title);
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setSubject(metadata.subject);
    pdfDoc.setKeywords([metadata.keywords]);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
