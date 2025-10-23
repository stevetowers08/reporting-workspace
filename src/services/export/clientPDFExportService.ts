/**
 * Client-side PDF Export Integration
 * Replaces html2canvas implementation with Puppeteer-based API calls
 */

import { debugLogger } from '../lib/debugLogger';

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
  filters?: {
    region?: string;
    [key: string]: any;
  };
  quality?: 'email' | 'download' | 'archive';
  includeClientHeader?: boolean;
  excludeAgencyHeader?: boolean;
  deliveryMethod?: 'email' | 'download';
}

export interface ExportJobStatus {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: string;
  pageCount?: number;
  generatedAt?: string;
  error?: string;
  message?: string;
}

export class ClientPDFExportService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Export dashboard to PDF using Puppeteer backend
   */
  async exportToPDF(options: PDFExportOptions): Promise<ExportJobStatus> {
    debugLogger.info('ClientPDFExportService', 'Starting PDF export', {
      clientId: options.clientId,
      tabsCount: options.tabs.length,
      quality: options.quality || 'email'
    });

    try {
      // Prepare request body according to PDR API specification
      const requestBody = {
        clientId: options.clientId,
        reportType: 'performance',
        tabs: options.tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          url: this.buildTabUrl(tab.url, options.dateRange, options.filters)
        })),
        filters: {
          dateRange: options.dateRange,
          ...options.filters
        },
        options: {
          quality: options.quality || 'email',
          includeClientHeader: options.includeClientHeader !== false,
          excludeAgencyHeader: options.excludeAgencyHeader !== false,
          deliveryMethod: options.deliveryMethod || 'download'
        }
      };

      // Make API request
      const response = await fetch(`${this.baseUrl}/exports/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create PDF export');
      }

      const result: ExportJobStatus = await response.json();
      
      debugLogger.info('ClientPDFExportService', 'PDF export job created', {
        jobId: result.jobId,
        status: result.status,
        estimatedTime: result.message
      });

      return result;

    } catch (error) {
      debugLogger.error('ClientPDFExportService', 'PDF export failed', error);
      throw error;
    }
  }

  /**
   * Poll job status until completion
   */
  async waitForCompletion(jobId: string, onProgress?: (status: ExportJobStatus) => void): Promise<ExportJobStatus> {
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.getJobStatus(jobId);
        
        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed') {
          debugLogger.info('ClientPDFExportService', 'PDF export completed', {
            jobId,
            fileSize: status.fileSize,
            pageCount: status.pageCount
          });
          return status;
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'PDF export failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        debugLogger.error('ClientPDFExportService', 'Status polling failed', error);
        throw error;
      }
    }

    throw new Error('PDF export timed out');
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ExportJobStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/exports/pdf/status/${jobId}`, {
        headers: {
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get job status');
      }

      return await response.json();

    } catch (error) {
      debugLogger.error('ClientPDFExportService', 'Failed to get job status', error);
      throw error;
    }
  }

  /**
   * Download completed PDF
   */
  async downloadPDF(jobId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/exports/pdf/download/${jobId}`, {
        headers: {
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `report-${jobId}.pdf`;

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

      debugLogger.info('ClientPDFExportService', 'PDF downloaded successfully', {
        jobId,
        filename
      });

    } catch (error) {
      debugLogger.error('ClientPDFExportService', 'PDF download failed', error);
      throw error;
    }
  }

  /**
   * Build tab URL with filters
   */
  private buildTabUrl(baseUrl: string, dateRange: { start: string; end: string }, filters?: any): string {
    const url = new URL(baseUrl, window.location.origin);
    
    // Add date range
    url.searchParams.set('start', dateRange.start);
    url.searchParams.set('end', dateRange.end);
    
    // Add other filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Export with progress tracking
   */
  async exportWithProgress(
    options: PDFExportOptions,
    onProgress?: (status: ExportJobStatus) => void
  ): Promise<ExportJobStatus> {
    // Start export
    const initialStatus = await this.exportToPDF(options);
    
    // Wait for completion with progress updates
    const finalStatus = await this.waitForCompletion(initialStatus.jobId!, onProgress);
    
    return finalStatus;
  }
}

// Export singleton instance
export const clientPDFExportService = new ClientPDFExportService();

