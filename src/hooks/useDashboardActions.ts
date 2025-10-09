import { debugLogger } from '@/lib/debug';
import { useCallback } from 'react';

// Define proper TypeScript interfaces
interface DashboardData {
  totalLeads?: number;
  leadMetrics?: {
    totalLeads: number;
    averageQualityScore: number;
    conversionRate: number;
    topPerformingSources: Array<{
      source: string;
      conversionRate: number;
    }>;
  };
  [key: string]: unknown; // Allow additional properties
}

interface ClientData {
  id: string;
  name: string;
  type?: string;
  logo_url?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Custom hook for dashboard action handlers
 * Provides reusable actions for the dashboard header buttons
 */
export const useDashboardActions = (actualClientId: string | undefined) => {
  const handleShare = useCallback(() => {
    if (!actualClientId) {
      debugLogger.warn('useDashboardActions', 'No client ID available for sharing');
      return;
    }
    
    try {
      // Create shareable URL
      const shareUrl = `${window.location.origin}/share/${actualClientId}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        // TODO: Replace with proper toast notification system
        alert('Share URL copied to clipboard!');
      }).catch((err) => {
        debugLogger.error('useDashboardActions', 'Failed to copy share URL', err);
        alert('Failed to copy URL to clipboard');
      });
    } catch (error) {
      debugLogger.error('useDashboardActions', 'Error creating share URL', error);
      alert('Failed to create share URL');
    }
  }, [actualClientId]);

  const handleSettings = useCallback(() => {
    try {
      // Navigate to agency panel or settings page
      window.location.href = '/agency';
    } catch (error) {
      debugLogger.error('useDashboardActions', 'Error navigating to settings', error);
    }
  }, []);

  const handleExportPDF = useCallback(async (
    dashboardData: DashboardData | null, 
    clientData: ClientData | null, 
    setExportingPDF: (loading: boolean) => void
  ) => {
    if (!dashboardData || !clientData) {
      // Missing data for PDF export
      return;
    }
    
    setExportingPDF(true);
    try {
      const { PDFExportService } = await import('@/services/export/pdfExportService');
      await PDFExportService.exportDashboardToPDF(dashboardData, clientData);
    } catch (error) {
      // PDF export failed
      alert('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  }, []);

  return {
    handleShare,
    handleSettings,
    handleExportPDF
  };
};