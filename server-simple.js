/**
 * Simple Express Server for PDF Export
 * Minimal setup for Puppeteer PDF generation
 */

import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple PDF export endpoint
app.post('/api/pdf/export', async (req, res) => {
  try {
    const config = req.body;
    
    // Basic validation
    if (!config.clientId || !config.tabs || !Array.isArray(config.tabs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }

    console.log('Starting PDF generation for client:', config.clientId);

    // Import and use the actual Puppeteer service
    const { SimplePuppeteerPDFService } = await import('./src/services/export/simplePuppeteerPDFService.js');
    const pdfService = new SimplePuppeteerPDFService();
    
    // Generate PDF
    const pdfBuffer = await pdfService.generatePDF(config);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${config.clientName}-report.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
    console.log('PDF generation completed for client:', config.clientId, 'Size:', pdfBuffer.length);

  } catch (error) {
    console.error('PDF generation failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'PDF generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Export Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PDF API: http://localhost:${PORT}/api/pdf/export`);
});

export default app;
