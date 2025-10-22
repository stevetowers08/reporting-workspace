/**
 * Simple Express Server for PDF Export
 * Minimal setup for Puppeteer PDF generation
 */

import cors from 'cors';
import express from 'express';
import pdfRoutes from './src/api/routes/simplePDFRoutes.ts';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/pdf', pdfRoutes);

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
