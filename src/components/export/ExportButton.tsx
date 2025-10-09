import { Button } from '@/components/ui/button';
import { usePDFExport } from '@/hooks/usePDFExport';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface ExportButtonProps {
  data: EventDashboardData;
  clientName: string;
  dateRange: string;
}

/**
 * Example component showing how to use lazy-loaded PDF export
 * PDF libraries are only loaded when user clicks the export button
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  clientName, 
  dateRange 
}) => {
  const { exportToPDF, isExporting, error } = usePDFExport();

  const handleExport = async () => {
    try {
      await exportToPDF(data, {
        clientName,
        dateRange,
        includeCharts: true,
        includeDetailedMetrics: true
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleExport} 
        disabled={isExporting}
        className="w-full"
      >
        {isExporting ? 'Exporting...' : 'Export to PDF'}
      </Button>
      
      {error && (
        <p className="text-sm text-red-600">
          Export failed: {error}
        </p>
      )}
    </div>
  );
};
