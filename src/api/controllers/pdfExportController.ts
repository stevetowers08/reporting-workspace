/**
 * PDF Export API Controller
 * Handles PDF export requests according to PDR v2.0 specifications
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { debugLogger } from '../../lib/debug';
import { ExportConfig, ExportResult, PuppeteerPDFExporter } from '../services/export/puppeteerPDFExportService';

export interface ExportRequest {
  clientId: string;
  reportType: string;
  tabs: {
    id: string;
    name: string;
    url: string;
  }[];
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
    region?: string;
    [key: string]: unknown;
  };
  options: {
    quality: 'email' | 'download' | 'archive';
    includeClientHeader: boolean;
    excludeAgencyHeader: boolean;
    deliveryMethod: 'email' | 'download';
  };
}

export interface ExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  config: ExportConfig;
  result?: Buffer;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  pageCount?: number;
}

// In-memory job storage (in production, use Redis)
const exportJobs = new Map<string, ExportJob>();

export class PDFExportController {
  private exporter: PuppeteerPDFExporter;

  constructor() {
    this.exporter = new PuppeteerPDFExporter();
  }

  /**
   * POST /api/v1/exports/pdf
   * Create new PDF export job
   */
  async createExport(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const validation = await this.validateExportRequest(req);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
          message: validation.message
        });
        return;
      }

      const { user, clientId } = validation;
      const exportRequest: ExportRequest = req.body;

      // Generate job ID
      const jobId = `export-${uuidv4()}`;

      // Create export configuration
      const config: ExportConfig = {
        clientId,
        userId: user.id,
        clientName: exportRequest.clientId, // TODO: Get actual client name
        tabs: exportRequest.tabs,
        dateRange: exportRequest.filters.dateRange,
        filters: exportRequest.filters,
        options: exportRequest.options
      };

      // Create job
      const job: ExportJob = {
        id: jobId,
        status: 'queued',
        progress: 0,
        currentStep: 'Queued for processing',
        config,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      exportJobs.set(jobId, job);

      // Queue job for processing (in production, use Bull queue)
      this.processExportJob(jobId).catch(error => {
        debugLogger.error('PDFExportController', 'Job processing failed', error);
      });

      // Return job status
      const result: ExportResult = {
        success: true,
        jobId,
        status: 'queued',
        estimatedCompletionTime: this.estimateCompletionTime(config),
        statusUrl: `/api/v1/exports/pdf/status/${jobId}`,
        message: 'PDF export queued successfully'
      };

      res.status(202).json(result);

    } catch (error) {
      debugLogger.error('PDFExportController', 'Export creation failed', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create PDF export job'
      });
    }
  }

  /**
   * GET /api/v1/exports/pdf/status/:jobId
   * Get export job status
   */
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = exportJobs.get(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
          message: 'Export job not found'
        });
        return;
      }

      const result: ExportResult = {
        success: job.status === 'completed',
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        downloadUrl: job.downloadUrl,
        expiresAt: job.expiresAt?.toISOString(),
        fileSize: job.fileSize ? this.formatFileSize(job.fileSize) : undefined,
        pageCount: job.pageCount,
        generatedAt: job.completedAt?.toISOString(),
        error: job.error
      };

      res.json(result);

    } catch (error) {
      debugLogger.error('PDFExportController', 'Status retrieval failed', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve export status'
      });
    }
  }

  /**
   * GET /api/v1/exports/pdf/download/:jobId
   * Download completed PDF
   */
  async downloadPDF(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = exportJobs.get(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
          message: 'Export job not found'
        });
        return;
      }

      if (job.status !== 'completed' || !job.result) {
        res.status(400).json({
          success: false,
          error: 'JOB_NOT_COMPLETED',
          message: 'Export job is not completed yet'
        });
        return;
      }

      // Check if job has expired
      if (job.expiresAt && new Date() > job.expiresAt) {
        res.status(410).json({
          success: false,
          error: 'JOB_EXPIRED',
          message: 'Export job has expired'
        });
        return;
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${job.config.clientName}-report.pdf"`);
      res.setHeader('Content-Length', job.result.length);

      // Send PDF
      res.send(job.result);

    } catch (error) {
      debugLogger.error('PDFExportController', 'PDF download failed', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to download PDF'
      });
    }
  }

  /**
   * Validate export request
   */
  private async validateExportRequest(req: Request): Promise<{
    valid: boolean;
    error?: string;
    message?: string;
    user?: unknown;
    clientId?: string;
  }> {
    // 1. Verify user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      };
    }

    // TODO: Implement proper JWT validation
    const user = { id: 'user-123' }; // Mock user

    // 2. Validate request body
    const body = req.body as ExportRequest;
    if (!body.clientId || !body.tabs || !Array.isArray(body.tabs) || body.tabs.length === 0) {
      return {
        valid: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid request body'
      };
    }

    // 3. Verify user has access to client data
    // TODO: Implement proper client access check
    const hasAccess = true; // Mock access check

    if (!hasAccess) {
      return {
        valid: false,
        error: 'FORBIDDEN',
        message: 'No access to client data'
      };
    }

    // 4. Rate limiting
    // TODO: Implement rate limiting
    const withinLimit = true; // Mock rate limit check

    if (!withinLimit) {
      return {
        valid: false,
        error: 'RATE_LIMITED',
        message: 'Too many export requests'
      };
    }

    return {
      valid: true,
      user,
      clientId: body.clientId
    };
  }

  /**
   * Process export job
   */
  private async processExportJob(jobId: string): Promise<void> {
    const job = exportJobs.get(jobId);
    if (!job) {return;}

    try {
      // Update job status
      job.status = 'processing';
      job.progress = 10;
      job.currentStep = 'Initializing browser';
      exportJobs.set(jobId, job);

      debugLogger.info('PDFExportController', 'Starting PDF generation', {
        jobId,
        clientId: job.config.clientId,
        tabsCount: job.config.tabs.length
      });

      // Generate PDF
      const pdfBuffer = await this.exporter.generateClientReport(job.config);

      // Update job with results
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Completed';
      job.result = pdfBuffer;
      job.completedAt = new Date();
      job.fileSize = pdfBuffer.length;
      job.pageCount = job.config.tabs.length;
      job.downloadUrl = `/api/v1/exports/pdf/download/${jobId}`;

      exportJobs.set(jobId, job);

      debugLogger.info('PDFExportController', 'PDF generation completed', {
        jobId,
        fileSize: this.formatFileSize(pdfBuffer.length),
        pageCount: job.pageCount
      });

    } catch (error) {
      debugLogger.error('PDFExportController', 'PDF generation failed', error);

      // Update job with error
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.currentStep = 'Failed';
      exportJobs.set(jobId, job);
    }
  }

  /**
   * Estimate completion time
   */
  private estimateCompletionTime(config: ExportConfig): string {
    const baseTime = 20; // Base 20 seconds
    const tabTime = config.tabs.length * 5; // 5 seconds per tab
    const totalSeconds = baseTime + tabTime;
    
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    } else {
      const minutes = Math.ceil(totalSeconds / 60);
      return `${minutes}m`;
    }
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) {return '0 B';}
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Cleanup expired jobs
   */
  cleanupExpiredJobs(): void {
    const now = new Date();
    for (const [jobId, job] of exportJobs.entries()) {
      if (job.expiresAt && now > job.expiresAt) {
        exportJobs.delete(jobId);
        debugLogger.info('PDFExportController', 'Cleaned up expired job', { jobId });
      }
    }
  }
}
