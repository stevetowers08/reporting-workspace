import { EventDashboardData } from '@/services/data/eventMetricsService';
import { PDFExportOptions } from '@/services/export/pdfExportService';
import { useCallback, useState } from 'react';

interface UsePDFExportReturn {
  exportToPDF: (data: EventDashboardData, options: PDFExportOptions) => Promise<void>;
  exportSectionToPDF: (element: HTMLElement, fileName: string, options: PDFExportOptions) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

/**
 * Hook for lazy-loaded PDF export functionality
 * Only loads PDF libraries when export is triggered
 */
export const usePDFExport = (): UsePDFExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(async (data: EventDashboardData, options: PDFExportOptions) => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Dynamic import of PDF export service
      const { PDFExportService } = await import('@/services/export/pdfExportService');
      await PDFExportService.exportDashboardToPDF(data, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportSectionToPDF = useCallback(async (
    element: HTMLElement, 
    fileName: string, 
    options: PDFExportOptions
  ) => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Dynamic import of PDF export service
      const { PDFExportService } = await import('@/services/export/pdfExportService');
      await PDFExportService.exportSectionToPDF(element, fileName, options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportToPDF,
    exportSectionToPDF,
    isExporting,
    error
  };
};
