import { debugLogger } from '@/lib/debug';
import { jsPDF } from 'jspdf';
import { EventDashboardData } from '../data/eventMetricsService';

// Add type definitions for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    getCurrentPageInfo(): { pageNumber: number };
  }
}

export interface PDFExportOptions {
  clientName: string;
  logoUrl?: string;
  dateRange: string;
  includeCharts?: boolean;
  includeDetailedMetrics?: boolean;
}

export interface TabExportOptions extends PDFExportOptions {
  tabs?: string[];
  includeAllTabs?: boolean;
}

export class PDFExportService {
  /**
   * Lazy load PDF libraries
   */
  private static async loadPDFLibraries() {
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    return { jsPDF: jsPDF.default, html2canvas: html2canvas.default };
  }

  /**
   * Wait for all resources to load before capturing
   */
  private static async waitForResources(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const images = element.querySelectorAll('img');
      const promises: Promise<void>[] = [];

      images.forEach((img) => {
        if (!img.complete) {
          promises.push(
            new Promise<void>((imgResolve) => {
              img.onload = () => imgResolve();
              img.onerror = () => imgResolve(); // Resolve even if image fails
            })
          );
        }
      });

      // Wait for all images or timeout after 5 seconds
      Promise.race([
        Promise.all(promises),
        new Promise<void>((resolve) => setTimeout(resolve, 5000))
      ]).then(() => resolve());
    });
  }

  /**
   * Validate dashboard data structure
   */
  private static validateDashboardData(data: EventDashboardData): void {
    const requiredFields = [
      'totalLeads', 'totalSpend', 'totalRevenue', 'roi',
      'facebookMetrics', 'googleMetrics', 'ghlMetrics', 'eventMetrics', 'leadMetrics'
    ];

    for (const field of requiredFields) {
      if (data[field as keyof EventDashboardData] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate nested objects
    if (!data.facebookMetrics || typeof data.facebookMetrics !== 'object') {
      throw new Error('Facebook metrics data is invalid');
    }

    if (!data.googleMetrics || typeof data.googleMetrics !== 'object') {
      throw new Error('Google metrics data is invalid');
    }

    if (!data.eventMetrics || typeof data.eventMetrics !== 'object') {
      throw new Error('Event metrics data is invalid');
    }
  }

  /**
   * Export dashboard data to PDF
   */
  static async exportDashboardToPDF(
    dashboardData: EventDashboardData,
    options: PDFExportOptions
  ): Promise<void> {
    try {
      // Validate input data
      if (!dashboardData) {
        throw new Error('Dashboard data is required');
      }

      if (!options.clientName) {
        throw new Error('Client name is required');
      }

      // Validate required data properties
      this.validateDashboardData(dashboardData);

      // Lazy load PDF libraries
      const { jsPDF } = await this.loadPDFLibraries();
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add header
      yPosition = this.addHeader(pdf, options, yPosition);

      // Add summary metrics
      yPosition = this.addSummaryMetrics(pdf, dashboardData, yPosition, pageWidth);

      // Add platform performance comparison
      yPosition = this.addPlatformComparison(pdf, dashboardData, yPosition, pageWidth);

      // Add detailed metrics if requested
      if (options.includeDetailedMetrics) {
        yPosition = this.addDetailedMetrics(pdf, dashboardData, yPosition, pageWidth);
      }

      // Add charts if requested
      if (options.includeCharts) {
        await this.addCharts(pdf, dashboardData, yPosition, pageWidth);
      }

      // Add footer
      this.addFooter(pdf, pageWidth, pageHeight);

      // Save the PDF
      const fileName = `${options.clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      debugLogger.error('PDFExportService', 'Error generating PDF', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate PDF: ${error.message}`);
      }
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Add header section to PDF
   */
  private static addHeader(pdf: jsPDF, options: PDFExportOptions, yPosition: number): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Event Analytics Dashboard', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Client name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text(options.clientName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Date range
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Report Period: ${options.dateRange}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Generated date
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    return yPosition;
  }

  /**
   * Add summary metrics section
   */
  private static addSummaryMetrics(pdf: jsPDF, data: EventDashboardData, yPosition: number, pageWidth: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary Metrics', 20, yPosition);
    yPosition += 10;

    // Create metrics table with safe access
    const metrics = [
      ['Total Leads', (data.totalLeads || 0).toString()],
      ['Total Spend', `$${(data.totalSpend || 0).toLocaleString()}`],
      ['Total Revenue', `$${(data.totalRevenue || 0).toLocaleString()}`],
      ['ROI', `${(data.roi || 0)}%`],
      ['Facebook Leads', (data.facebookMetrics?.leads || 0).toString()],
      ['Google Leads', (data.googleMetrics?.leads || 0).toString()],
      ['Facebook Spend', `$${(data.facebookMetrics?.spend || 0).toLocaleString()}`],
      ['Google Spend', `$${(data.googleMetrics?.cost || 0).toLocaleString()}`]
    ];

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    metrics.forEach(([label, value], index) => {
      const x1 = 20;
      const x2 = pageWidth - 20;
      const y = yPosition + (index * 6);
      
      pdf.text(label, x1, y);
      pdf.text(value, x2 - pdf.getTextWidth(value), y);
      
      // Add line separator
      if (index < metrics.length - 1) {
        pdf.line(x1, y + 2, x2, y + 2);
      }
    });

    yPosition += (metrics.length * 6) + 10;
    return yPosition;
  }

  /**
   * Add platform performance comparison
   */
  private static addPlatformComparison(pdf: jsPDF, data: EventDashboardData, yPosition: number, pageWidth: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Platform Performance Comparison', 20, yPosition);
    yPosition += 10;

    // Facebook Ads metrics with safe access
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Meta Ads Performance', 20, yPosition);
    yPosition += 8;

    const facebookMetrics = [
      ['Impressions', (data.facebookMetrics?.impressions || 0).toLocaleString()],
      ['Clicks', (data.facebookMetrics?.clicks || 0).toLocaleString()],
      ['CTR', `${(data.facebookMetrics?.ctr || 0).toFixed(2)}%`],
      ['CPC', `$${(data.facebookMetrics?.cpc || 0).toFixed(2)}`],
      ['Cost Per Lead', `$${(data.facebookMetrics?.costPerLead || 0).toFixed(2)}`]
    ];

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    facebookMetrics.forEach(([label, value]) => {
      pdf.text(`  ${label}: ${value}`, 20, yPosition);
      yPosition += 5;
    });

    yPosition += 5;

    // Google Ads metrics with safe access
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Google Ads Performance', 20, yPosition);
    yPosition += 8;

    const googleMetrics = [
      ['Impressions', (data.googleMetrics?.impressions || 0).toLocaleString()],
      ['Clicks', (data.googleMetrics?.clicks || 0).toLocaleString()],
      ['CTR', `${(data.googleMetrics?.ctr || 0).toFixed(2)}%`],
      ['CPC', `$${(data.googleMetrics?.cpc || 0).toFixed(2)}`],
      ['Cost Per Lead', `$${(data.googleMetrics?.costPerLead || 0).toFixed(2)}`],
      ['Quality Score', `${(data.googleMetrics?.qualityScore || 0).toFixed(1)}/10`]
    ];

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    googleMetrics.forEach(([label, value]) => {
      pdf.text(`  ${label}: ${value}`, 20, yPosition);
      yPosition += 5;
    });

    yPosition += 10;
    return yPosition;
  }

  /**
   * Add detailed metrics section
   */
  private static addDetailedMetrics(pdf: jsPDF, data: EventDashboardData, yPosition: number, pageWidth: number): number {
    // Check if we need a new page
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Event Analytics', 20, yPosition);
    yPosition += 10;

    // Event metrics with safe access
    const eventMetrics = [
      ['Total Events', (data.eventMetrics?.totalEvents || 0).toString()],
      ['Average Guests', (data.eventMetrics?.averageGuests || 0).toString()],
      ['Total Submissions', (data.eventMetrics?.totalSubmissions || 0).toString()]
    ];

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    eventMetrics.forEach(([label, value]) => {
      pdf.text(`  ${label}: ${value}`, 20, yPosition);
      yPosition += 5;
    });

    yPosition += 10;

    // Event type breakdown with safe access
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Event Type Breakdown', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    if (data.eventMetrics?.eventTypeBreakdown && Array.isArray(data.eventMetrics.eventTypeBreakdown)) {
      data.eventMetrics.eventTypeBreakdown.forEach((event) => {
        pdf.text(`  ${event.type}: ${event.count} events (${(event.percentage || 0).toFixed(1)}%)`, 20, yPosition);
        yPosition += 5;
      });
    } else {
      pdf.text('  No event data available', 20, yPosition);
      yPosition += 5;
    }

    yPosition += 10;
    return yPosition;
  }

  /**
   * Add charts to PDF (simplified version)
   */
  private static async addCharts(pdf: jsPDF, _data: EventDashboardData, yPosition: number, pageWidth: number): Promise<void> {
    // For now, we'll add a simple text representation of charts
    // In a full implementation, you could capture actual chart images
    
    if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Performance Charts', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Note: Charts are available in the web dashboard. This PDF contains', 20, yPosition);
    yPosition += 5;
    pdf.text('the underlying data and metrics for offline analysis.', 20, yPosition);
  }

  /**
   * Add footer to PDF
   */
  private static addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    const footerY = pageHeight - 10;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Generated by Event Analytics Dashboard', 20, footerY);
    pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, pageWidth - 20 - pdf.getTextWidth(`Page ${pdf.getCurrentPageInfo().pageNumber}`), footerY);
  }

  /**
   * Export dashboard tabs as separate pages in PDF - FIXED VERSION
   */
  static async exportTabsToPDF(
    tabElements: { [key: string]: HTMLElement },
    options: TabExportOptions
  ): Promise<void> {
    try {
      debugLogger.info('PDFExportService', 'Starting PDF export', { 
        availableTabs: Object.keys(tabElements),
        options 
      });

      // Lazy load PDF libraries
      const { jsPDF, html2canvas } = await this.loadPDFLibraries();
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Define tab order and names
      const tabConfig = {
        summary: 'Summary Overview',
        meta: 'Meta Ads Performance',
        google: 'Google Ads Performance',
        leads: 'Lead Analytics'
      };

      // Determine which tabs to export
      const tabsToExport = options.includeAllTabs 
        ? Object.keys(tabConfig)
        : (options.tabs || ['summary']);

      debugLogger.info('PDFExportService', 'Tabs to export', { tabsToExport });

      let isFirstPage = true;

      for (const tabKey of tabsToExport) {
        const tabElement = tabElements[tabKey];
        const tabName = tabConfig[tabKey as keyof typeof tabConfig];
        
        if (!tabElement || !tabName) {
          debugLogger.warn('PDFExportService', `Tab ${tabKey} not found, skipping`, { 
            tabElement: !!tabElement, 
            tabName: !!tabName,
            availableTabs: Object.keys(tabElements)
          });
          continue;
        }

        debugLogger.info('PDFExportService', `Processing tab ${tabKey}`, {
          elementTagName: tabElement.tagName,
          elementClasses: tabElement.className,
          elementChildren: tabElement.children.length,
          elementVisible: tabElement.offsetWidth > 0 && tabElement.offsetHeight > 0,
          elementDisplay: window.getComputedStyle(tabElement).display,
          elementVisibility: window.getComputedStyle(tabElement).visibility,
          elementRect: tabElement.getBoundingClientRect()
        });

        try {
          // Add new page for each tab (except the first one)
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          // CRITICAL FIX: Make element visible and ensure it has content
          const originalStyles = {
            display: tabElement.style.display,
            visibility: tabElement.style.visibility,
            position: tabElement.style.position,
            opacity: tabElement.style.opacity,
            height: tabElement.style.height,
            width: tabElement.style.width
          };

          // Force element to be visible and have dimensions
          tabElement.style.display = 'block';
          tabElement.style.visibility = 'visible';
          tabElement.style.position = 'static';
          tabElement.style.opacity = '1';
          tabElement.style.height = 'auto';
          tabElement.style.width = '100%';

          // Wait for styles to apply
          await new Promise(resolve => setTimeout(resolve, 500));

          // Wait for resources to load
          await this.waitForResources(tabElement);
          
          // Get element dimensions after making it visible
          const rect = tabElement.getBoundingClientRect();
          debugLogger.info('PDFExportService', `Element dimensions after visibility fix`, {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          });

          // Skip if element still has no dimensions
          if (rect.width === 0 || rect.height === 0) {
            debugLogger.warn('PDFExportService', `Tab ${tabKey} still has no dimensions, skipping`);
            continue;
          }
          
          // Capture tab content with optimized settings
          debugLogger.info('PDFExportService', `Capturing canvas for tab ${tabKey}`);
          
          const canvas = await html2canvas(tabElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            width: rect.width,
            height: rect.height,
            logging: false,
            removeContainer: true,
            foreignObjectRendering: true,
            imageTimeout: 15000,
            onclone: (clonedDoc) => {
              // Ensure cloned element is also visible
              const clonedElement = clonedDoc.querySelector(`[data-tab="${tabKey}"]`) || 
                                  clonedDoc.querySelector(`.${tabElement.className.split(' ')[0]}`);
              if (clonedElement) {
                clonedElement.style.display = 'block';
                clonedElement.style.visibility = 'visible';
                clonedElement.style.position = 'static';
                clonedElement.style.opacity = '1';
              }
            }
          });

          debugLogger.info('PDFExportService', `Canvas captured for tab ${tabKey}`, {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasDataLength: canvas.toDataURL('image/png').length
          });

          // Validate canvas content
          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error(`Canvas is empty for tab ${tabKey}`);
          }

          const imgData = canvas.toDataURL('image/png');
          
          // Validate image data
          if (imgData.length < 1000) {
            throw new Error(`Image data is too small for tab ${tabKey}`);
          }
          
          // Get canvas dimensions
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          // Add the tab content image - fill the entire page
          const startY = 10; // Small margin from top
          const availableHeight = pageHeight - 20; // Leave small margins
          
          // Calculate dimensions to fill the page
          let finalWidth = pageWidth - 20; // 10mm margin on each side
          let finalHeight = availableHeight;
          
          // Maintain aspect ratio but prioritize filling the page
          const elementRatio = imgWidth / imgHeight;
          const pageRatio = finalWidth / finalHeight;
          
          if (elementRatio > pageRatio) {
            // Element is wider, fit to width
            finalHeight = finalWidth / elementRatio;
          } else {
            // Element is taller, fit to height
            finalWidth = finalHeight * elementRatio;
          }

          // Center the image
          const xOffset = (pageWidth - finalWidth) / 2;
          const yOffset = startY + (availableHeight - finalHeight) / 2;
          
          pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

          debugLogger.info('PDFExportService', `Successfully added tab ${tabKey} to PDF`);

          // Restore original styles
          Object.assign(tabElement.style, originalStyles);

        } catch (tabError) {
          debugLogger.error('PDFExportService', `Error processing tab ${tabKey}`, tabError);
          // Continue with other tabs even if one fails
        }
      }

      // Save the PDF
      const fileName = `${options.clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_tabs_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      debugLogger.info('PDFExportService', 'PDF export completed successfully', { fileName });

    } catch (error) {
      debugLogger.error('PDFExportService', 'Error generating tabs PDF', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  /**
   * Add tab-specific header to PDF
   */
  private static addTabHeader(pdf: jsPDF, options: PDFExportOptions, tabName: string, pageWidth: number): void {
    // Main title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Event Analytics Dashboard', pageWidth / 2, 15, { align: 'center' });
    
    // Client name
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(options.clientName, pageWidth / 2, 22, { align: 'center' });
    
    // Tab name
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tabName, pageWidth / 2, 28, { align: 'center' });
    
    // Date range
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Report Period: ${options.dateRange}`, pageWidth / 2, 34, { align: 'center' });
  }

  /**
   * Export specific dashboard section to PDF
   */
  static async exportSectionToPDF(
    sectionElement: any,
    fileName: string,
    options: PDFExportOptions
  ): Promise<void> {
    try {
      // Lazy load PDF libraries
      const { jsPDF, html2canvas } = await this.loadPDFLibraries();
      
      const canvas = await html2canvas(sectionElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit the image
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalWidth = pageWidth - 20; // 10mm margin on each side
      let finalHeight = finalWidth / ratio;
      
      // If height is too large, scale down
      if (finalHeight > pageHeight - 40) { // 20mm margin top and bottom
        finalHeight = pageHeight - 40;
        finalWidth = finalHeight * ratio;
      }

      // Add header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(options.clientName, pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });

      // Add the image
      pdf.addImage(imgData, 'PNG', (pageWidth - finalWidth) / 2, 30, finalWidth, finalHeight);

      // Save the PDF
      pdf.save(fileName);

    } catch (error) {
      debugLogger.error('PDFExportService', 'Error generating section PDF', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
}
