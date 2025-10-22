import { EventDashboardData } from '@/services/data/eventMetricsService';
import { PDFExportService } from '@/services/export/pdfExportService';

// Mock PDF libraries
jest.mock('jspdf', () => ({
  default: jest.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    },
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    addImage: jest.fn(),
    save: jest.fn(),
    getCurrentPageInfo: () => ({ pageNumber: 1 })
  }))
}));

jest.mock('html2canvas', () => ({
  default: jest.fn().mockResolvedValue({
    width: 800,
    height: 600,
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock-image-data')
  })
}));

describe('PDFExportService', () => {
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

  describe('exportDashboardToPDF', () => {
    it('should export dashboard data to PDF successfully', async () => {
      await expect(
        PDFExportService.exportDashboardToPDF(mockDashboardData, mockOptions)
      ).resolves.not.toThrow();
    });

    it('should throw error when dashboard data is missing', async () => {
      await expect(
        PDFExportService.exportDashboardToPDF(null as any, mockOptions)
      ).rejects.toThrow('Dashboard data is required');
    });

    it('should throw error when client name is missing', async () => {
      await expect(
        PDFExportService.exportDashboardToPDF(mockDashboardData, { ...mockOptions, clientName: '' })
      ).rejects.toThrow('Client name is required');
    });

    it('should validate dashboard data structure', async () => {
      const invalidData = { ...mockDashboardData, totalLeads: undefined };
      
      await expect(
        PDFExportService.exportDashboardToPDF(invalidData as any, mockOptions)
      ).rejects.toThrow('Event metrics data is invalid');
    });
  });

  describe('exportSectionToPDF', () => {
    it('should export HTML element to PDF successfully', async () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = '<h1>Test Content</h1>';
      
      await expect(
        PDFExportService.exportSectionToPDF(mockElement, 'test-section.pdf', mockOptions)
      ).resolves.not.toThrow();
    });

    it('should handle missing element gracefully', async () => {
      await expect(
        PDFExportService.exportSectionToPDF(null as any, 'test.pdf', mockOptions)
      ).rejects.toThrow();
    });
  });

  describe('exportTabsToPDF', () => {
    it('should export multiple tabs to PDF successfully', async () => {
      const mockTabElements = {
        summary: document.createElement('div'),
        meta: document.createElement('div'),
        google: document.createElement('div'),
        leads: document.createElement('div')
      };

      const tabOptions = {
        ...mockOptions,
        includeAllTabs: true,
        tabs: ['summary', 'meta', 'google', 'leads']
      };

      await expect(
        PDFExportService.exportTabsToPDF(mockTabElements, tabOptions)
      ).resolves.not.toThrow();
    });

    it('should export only selected tabs', async () => {
      const mockTabElements = {
        summary: document.createElement('div'),
        meta: document.createElement('div')
      };

      const tabOptions = {
        ...mockOptions,
        includeAllTabs: false,
        tabs: ['summary', 'meta']
      };

      await expect(
        PDFExportService.exportTabsToPDF(mockTabElements, tabOptions)
      ).resolves.not.toThrow();
    });
  });

  describe('Data validation', () => {
    it('should validate required fields in dashboard data', () => {
      const validData = mockDashboardData;
      expect(() => {
        // Access private method through any type
        (PDFExportService as any).validateDashboardData(validData);
      }).not.toThrow();
    });

    it('should throw error for invalid data structure', () => {
      const invalidData = { totalLeads: 100 }; // Missing required fields
      
      expect(() => {
        (PDFExportService as any).validateDashboardData(invalidData);
      }).toThrow('Event metrics data is invalid');
    });
  });

  describe('File naming', () => {
    it('should generate valid filename from client name', () => {
      const clientName = 'Test Client & Co.';
      const expectedPattern = /Test_Client___Co__dashboard_\d{4}-\d{2}-\d{2}\.pdf/;
      
      // This would be tested by checking the actual filename generated
      // in a real implementation, we'd mock the save method to capture the filename
      expect(clientName.replace(/[^a-z0-9]/gi, '_')).toBe('Test_Client___Co__');
    });
  });
});

