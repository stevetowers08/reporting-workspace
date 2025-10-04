import { debugLogger } from '@/lib/debug';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

export class PDFExportService {
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
  private static async addCharts(pdf: jsPDF, data: EventDashboardData, yPosition: number, pageWidth: number): Promise<void> {
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
   * Export specific dashboard section to PDF
   */
  static async exportSectionToPDF(
    sectionElement: HTMLElement,
    fileName: string,
    options: PDFExportOptions
  ): Promise<void> {
    try {
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
