import { PDFGenerationOptions, PlaywrightPDFService } from '@/services/export/playwrightPdfService';
import { useCallback, useState } from 'react';

interface UsePDFExportReturn {
  exportWithPlaywright: (options: PDFGenerationOptions) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

/**
 * Hook for Playwright PDF export functionality
 * Uses server-side rendering for perfect fidelity
 */
export const usePDFExport = (): UsePDFExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Export using Playwright server-side rendering
   * This provides perfect fidelity - exactly as displayed on screen
   */
  const exportWithPlaywright = useCallback(async (options: PDFGenerationOptions) => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Skip availability check - let the actual request handle any errors

      // Generate and download PDF
      await PlaywrightPDFService.generateAndDownloadPDF(options);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportWithPlaywright,
    isExporting,
    error
  };
};
