/**
 * Simple PDF Export API
 * Minimal Express endpoint for Puppeteer PDF generation
 */

import express, { Request, Response } from 'express';
import { debugLogger } from '../lib/debug';
import { SimpleExportConfig, SimplePuppeteerPDFService } from '../services/export/simplePuppeteerPDFService';

const router = express.Router();
const pdfService = new SimplePuppeteerPDFService();

/**
 * POST /api/pdf/export
 * Generate PDF using Puppeteer
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const config: SimpleExportConfig = req.body;
    
    // Basic validation
    if (!config.clientId || !config.tabs || !Array.isArray(config.tabs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }

    debugLogger.info('PDFExportAPI', 'Starting PDF generation', {
      clientId: config.clientId,
      tabsCount: config.tabs.length
    });

    // Generate PDF
    const pdfBuffer = await pdfService.generatePDF(config);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${config.clientName}-report.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
    debugLogger.info('PDFExportAPI', 'PDF generation completed', {
      clientId: config.clientId,
      fileSize: pdfBuffer.length
    });

  } catch (error) {
    debugLogger.error('PDFExportAPI', 'PDF generation failed', error);
    
    res.status(500).json({
      success: false,
      error: 'PDF generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

