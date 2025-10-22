import { usePDFExport } from '@/hooks/usePDFExport';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { act, renderHook } from '@testing-library/react';

// Mock the PDF export service
jest.mock('@/services/export/pdfExportService', () => ({
  PDFExportService: {
    exportDashboardToPDF: jest.fn(),
    exportSectionToPDF: jest.fn(),
    exportTabsToPDF: jest.fn()
  }
}));

describe('usePDFExport', () => {
  const mockDashboardData: EventDashboardData = {
    totalLeads: 150,
    totalSpend: 5000,
    totalRevenue: 15000,
    roi: 200,
    facebookMetrics: {
      impressions: 100000,
      clicks: 2000,
      spend: 2000,
      conversions: 50,
      ctr: 2,
      cpc: 1,
      cpm: 20,
      conversionRate: 2.5
    },
    googleMetrics: {
      impressions: 80000,
      clicks: 1500,
      spend: 1500,
      conversions: 30,
      ctr: 1.875,
      cpc: 1,
      cpm: 18.75,
      conversionRate: 2
    },
    ghlMetrics: {
      totalOpportunities: 100,
      totalRevenue: 10000,
      averageDealSize: 100,
      conversionRate: 10
    },
    eventMetrics: {
      totalEvents: 200,
      totalGuests: 500,
      averageGuestsPerEvent: 2.5,
      eventTypes: {
        'Wedding': 50,
        'Corporate': 30,
        'Birthday': 120
      }
    },
    leadMetrics: {
      totalLeads: 150,
      leadsBySource: {
        'Facebook': 80,
        'Google': 50,
        'Direct': 20
      },
      averageLeadValue: 100
    }
  };

  const mockOptions = {
    clientName: 'Test Client',
    logoUrl: 'https://example.com/logo.png',
    dateRange: 'Last 30 days',
    includeCharts: true,
    includeDetailedMetrics: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePDFExport());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.exportToPDF).toBe('function');
    expect(typeof result.current.exportSectionToPDF).toBe('function');
    expect(typeof result.current.exportTabsToPDF).toBe('function');
  });

  it('should handle successful PDF export', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    PDFExportService.exportDashboardToPDF.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePDFExport());

    await act(async () => {
      await result.current.exportToPDF(mockDashboardData, mockOptions);
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(PDFExportService.exportDashboardToPDF).toHaveBeenCalledWith(
      mockDashboardData,
      mockOptions
    );
  });

  it('should handle PDF export error', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    const mockError = new Error('PDF generation failed');
    PDFExportService.exportDashboardToPDF.mockRejectedValue(mockError);

    const { result } = renderHook(() => usePDFExport());

    await act(async () => {
      try {
        await result.current.exportToPDF(mockDashboardData, mockOptions);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe('PDF generation failed');
  });

  it('should handle section export successfully', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    PDFExportService.exportSectionToPDF.mockResolvedValue(undefined);

    const mockElement = document.createElement('div');
    const { result } = renderHook(() => usePDFExport());

    await act(async () => {
      await result.current.exportSectionToPDF(mockElement, 'test.pdf', mockOptions);
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(PDFExportService.exportSectionToPDF).toHaveBeenCalledWith(
      mockElement,
      'test.pdf',
      mockOptions
    );
  });

  it('should handle tabs export successfully', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    PDFExportService.exportTabsToPDF.mockResolvedValue(undefined);

    const mockTabElements = {
      summary: document.createElement('div'),
      meta: document.createElement('div')
    };

    const tabOptions = {
      ...mockOptions,
      includeAllTabs: true,
      tabs: ['summary', 'meta']
    };

    const { result } = renderHook(() => usePDFExport());

    await act(async () => {
      await result.current.exportTabsToPDF(mockTabElements, tabOptions);
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(PDFExportService.exportTabsToPDF).toHaveBeenCalledWith(
      mockTabElements,
      tabOptions
    );
  });

  it('should set loading state during export', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    
    // Create a promise that we can control
    let resolveExport: () => void;
    const exportPromise = new Promise<void>((resolve) => {
      resolveExport = resolve;
    });
    PDFExportService.exportDashboardToPDF.mockReturnValue(exportPromise);

    const { result } = renderHook(() => usePDFExport());

    // Start the export
    act(() => {
      result.current.exportToPDF(mockDashboardData, mockOptions);
    });

    // Check that loading state is set
    expect(result.current.isExporting).toBe(true);

    // Complete the export
    await act(async () => {
      resolveExport!();
      await exportPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('should clear error on successful export', async () => {
    const { PDFExportService } = require('@/services/export/pdfExportService');
    
    // First, set an error
    PDFExportService.exportDashboardToPDF.mockRejectedValueOnce(new Error('Previous error'));
    
    const { result } = renderHook(() => usePDFExport());

    // Trigger an error
    await act(async () => {
      try {
        await result.current.exportToPDF(mockDashboardData, mockOptions);
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.error).toBe('Previous error');

    // Now succeed
    PDFExportService.exportDashboardToPDF.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.exportToPDF(mockDashboardData, mockOptions);
    });

    expect(result.current.error).toBe(null);
  });
});

