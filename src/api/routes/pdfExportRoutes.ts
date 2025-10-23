/**
 * PDF Export API Routes
 * Express routes for PDF export functionality
 */

import { Router } from 'express';
import { PDFExportController } from '../controllers/pdfExportController';

const router = Router();
const pdfController = new PDFExportController();

/**
 * POST /api/v1/exports/pdf
 * Create new PDF export job
 */
router.post('/exports/pdf', async (req, res) => {
  await pdfController.createExport(req, res);
});

/**
 * GET /api/v1/exports/pdf/status/:jobId
 * Get export job status
 */
router.get('/exports/pdf/status/:jobId', async (req, res) => {
  await pdfController.getExportStatus(req, res);
});

/**
 * GET /api/v1/exports/pdf/download/:jobId
 * Download completed PDF
 */
router.get('/exports/pdf/download/:jobId', async (req, res) => {
  await pdfController.downloadPDF(req, res);
});

export default router;

