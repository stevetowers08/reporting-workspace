/**
 * Simple Client PDF Export Service
 * Replaces html2canvas with Puppeteer API calls
 */

import { DevLogger } from '../../lib/logger';

export interface PDFExportOptions {
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
  quality?: 'email' | 'download';
}

export class SimpleClientPDFService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api/pdf') {
    this.baseUrl = baseUrl;
  }

  /**
   * Export dashboard to PDF using Puppeteer backend
   */
  async exportToPDF(options: PDFExportOptions): Promise<void> {
    DevLogger.info('SimpleClientPDFService', 'Starting PDF export', {
      clientId: options.clientId,
      tabsCount: options.tabs.length,
      quality: options.quality || 'email'
    });

    try {
      // Prepare request body
      const requestBody = {
        clientId: options.clientId,
        clientName: options.clientName,
        tabs: options.tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          url: this.buildTabUrl(tab.url, options.dateRange)
        })),
        dateRange: options.dateRange,
        quality: options.quality || 'email'
      };

      // Make API request
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${options.clientName}-report.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      DevLogger.info('SimpleClientPDFService', 'PDF downloaded successfully', {
        clientId: options.clientId,
        filename,
        fileSize: blob.size
      });

    } catch (error) {
      DevLogger.error('SimpleClientPDFService', 'PDF export failed', error);
      throw error;
    }
  }

  /**
   * Build tab URL with date range filters
   */
  private buildTabUrl(baseUrl: string, dateRange: { start: string; end: string }): string {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('start', dateRange.start);
    url.searchParams.set('end', dateRange.end);
    return url.toString();
  }

  /**
   * Export with progress feedback
   */
  async exportWithProgress(
    options: PDFExportOptions,
    onProgress?: (message: string) => void
  ): Promise<void> {
    if (onProgress) {
      onProgress('Preparing PDF export...');
    }
    
    await this.exportToPDF(options);
    
    if (onProgress) {
      onProgress('PDF generated successfully!');
    }
  }
}

// Export singleton instance
export const simpleClientPDFService = new SimpleClientPDFService();
