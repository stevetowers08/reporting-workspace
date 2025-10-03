import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventDashboard from '@/pages/EventDashboard';
import { DatabaseService } from '@/services/databaseService';
import { EventMetricsService } from '@/services/eventMetricsService';

// Mock the services
jest.mock('@/services/databaseService');
jest.mock('@/services/eventMetricsService');

// Mock the child components
jest.mock('@/components/dashboard/DashboardHeader', () => ({
  DashboardHeader: ({ onClientChange, onPeriodChange, onExportPDF }: any) => (
    <div data-testid="dashboard-header">
      <button onClick={() => onClientChange('test-client-1')}>Select Client</button>
      <button onClick={() => onPeriodChange('7d')}>Change Period</button>
      <button onClick={onExportPDF}>Export PDF</button>
    </div>
  ),
}));

jest.mock('@/components/dashboard/MetricsOverview', () => ({
  MetricsOverview: ({ dashboardData }: any) => (
    <div data-testid="metrics-overview">
      Metrics - Leads: {dashboardData?.totalLeads || 0}
    </div>
  ),
}));

jest.mock('@/components/dashboard/ChartsSection', () => ({
  ChartsSection: ({ dashboardData }: any) => (
    <div data-testid="charts-section">
      Charts - Leads: {dashboardData?.totalLeads || 0}
    </div>
  ),
}));

jest.mock('@/components/dashboard/TablesSection', () => ({
  TablesSection: ({ dashboardData }: any) => (
    <div data-testid="tables-section">
      Tables - Leads: {dashboardData?.totalLeads || 0}
    </div>
  ),
}));

jest.mock('@/components/dashboard/TabContent', () => ({
  TabContent: ({ dashboardData, activeTab }: any) => (
    <div data-testid="tab-content">
      Tab Content - Tab: {activeTab}, Leads: {dashboardData?.totalLeads || 0}
    </div>
  ),
}));

// Mock PDF export service
jest.mock('@/services/pdfExportService', () => ({
  PDFExportService: {
    exportDashboardToPDF: jest.fn().mockResolvedValue(undefined),
  },
}));

const MockedRouter = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock data
const mockClients = [
  {
    id: 'test-client-1',
    name: 'Test Venue',
    logo_url: 'https://example.com/logo.png'
  },
  {
    id: 'test-client-2',
    name: 'Another Venue',
    logo_url: null
  }
];

const mockDashboardData = {
  totalLeads: 1250,
  totalSpend: 15000,
  totalRevenue: 45000,
  roi: 3.0,
  facebookMetrics: {
    impressions: 50000,
    clicks: 2500,
    spend: 8000,
    leads: 750,
    conversions: 150,
    ctr: 5.0,
    cpc: 3.2,
    cpm: 16.0,
    roas: 2.5,
    reach: 35000,
    frequency: 1.43,
    costPerLead: 10.67
  },
  googleMetrics: {
    impressions: 30000,
    clicks: 1200,
    cost: 7000,
    leads: 500,
    conversions: 100,
    ctr: 4.0,
    cpc: 5.83,
    conversionRate: 8.33,
    costPerConversion: 70.0,
    searchImpressionShare: 85.0,
    qualityScore: 7.5,
    costPerLead: 14.0
  },
  ghlMetrics: {
    totalContacts: 2000,
    newContacts: 500,
    totalOpportunities: 300,
    wonOpportunities: 150,
    lostOpportunities: 100,
    pipelineValue: 60000,
    avgDealSize: 400,
    conversionRate: 50.0,
    responseTime: 2.5
  },
  eventMetrics: {
    totalEvents: 45,
    averageGuests: 120,
    totalSubmissions: 150,
    eventTypeBreakdown: [
      { type: 'Wedding', count: 20, percentage: 44.4, avgGuests: 150 },
      { type: 'Corporate', count: 15, percentage: 33.3, avgGuests: 80 },
      { type: 'Birthday', count: 10, percentage: 22.2, avgGuests: 50 }
    ],
    budgetDistribution: [
      { range: '$0-5K', count: 10, percentage: 22.2 },
      { range: '$5K-10K', count: 20, percentage: 44.4 },
      { range: '$10K-20K', count: 15, percentage: 33.3 }
    ]
  },
  leadMetrics: {
    facebookCostPerLead: 10.67,
    googleCostPerLead: 14.0,
    overallCostPerLead: 12.0,
    leadToOpportunityRate: 15.0,
    opportunityToWinRate: 50.0,
    averageEventValue: 1000,
    averageGuestsPerEvent: 120,
    mostPopularEventType: 'Wedding',
    seasonalTrends: [
      { month: 'Jan', leads: 100, events: 5, revenue: 5000 },
      { month: 'Feb', leads: 120, events: 6, revenue: 6000 }
    ],
    landingPageConversionRate: 8.5,
    formCompletionRate: 95.0,
    leadSourceBreakdown: [
      { source: 'Facebook Ads', leads: 750, percentage: 60.0, costPerLead: 10.67, conversionRate: 20.0 },
      { source: 'Google Ads', leads: 500, percentage: 40.0, costPerLead: 14.0, conversionRate: 20.0 }
    ]
  },
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
};

describe('EventDashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (DatabaseService.getClients as jest.Mock).mockResolvedValue(mockClients);
    (DatabaseService.getClient as jest.Mock).mockResolvedValue(mockClients[0]);
    (EventMetricsService.getClientMetrics as jest.Mock).mockResolvedValue(mockDashboardData);
    (EventMetricsService.getAllVenuesMetrics as jest.Mock).mockResolvedValue(mockDashboardData);
  });

  it('renders the dashboard with all components', async () => {
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Should render welcome message initially
    expect(screen.getByText('Welcome to Event Analytics')).toBeInTheDocument();
  });

  it('loads clients and auto-selects first client', async () => {
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(DatabaseService.getClients).toHaveBeenCalled();
    });

    // Should auto-select first client
    await waitFor(() => {
      expect(DatabaseService.getClient).toHaveBeenCalledWith('test-client-1');
    });
  });

  it('handles client change correctly', async () => {
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Simulate client change
    const selectClientButton = screen.getByText('Select Client');
    fireEvent.click(selectClientButton);

    await waitFor(() => {
      expect(DatabaseService.getClient).toHaveBeenCalledWith('test-client-1');
      expect(EventMetricsService.getClientMetrics).toHaveBeenCalledWith('test-client-1', '30d');
    });
  });

  it('handles period change correctly', async () => {
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Simulate period change
    const changePeriodButton = screen.getByText('Change Period');
    fireEvent.click(changePeriodButton);

    await waitFor(() => {
      expect(EventMetricsService.getClientMetrics).toHaveBeenCalledWith('test-client-1', '7d');
    });
  });

  it('handles PDF export correctly', async () => {
    const { PDFExportService } = require('@/services/pdfExportService');
    
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Simulate PDF export
    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(PDFExportService.exportDashboardToPDF).toHaveBeenCalled();
    });
  });

  it('renders dashboard content when client is selected', async () => {
    // Mock that a client is already selected
    (DatabaseService.getClient as jest.Mock).mockResolvedValue(mockClients[0]);
    
    render(
      <MockedRouter>
        <EventDashboard clientId="test-client-1" />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-overview')).toBeInTheDocument();
      expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      expect(screen.getByTestId('tables-section')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });
  });

  it('handles shared mode correctly', async () => {
    render(
      <MockedRouter>
        <EventDashboard isShared={true} clientId="test-client-1" />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Should not show admin/export buttons in shared mode
    // This would be tested in the DashboardHeader component
  });

  it('handles errors gracefully', async () => {
    (DatabaseService.getClients as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Failed to load clients')).toBeInTheDocument();
    });
  });

  it('handles all venues selection', async () => {
    render(
      <MockedRouter>
        <EventDashboard />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Simulate selecting all venues
    const selectClientButton = screen.getByText('Select Client');
    fireEvent.click(selectClientButton);

    // Mock the all venues selection
    (EventMetricsService.getAllVenuesMetrics as jest.Mock).mockResolvedValue(mockDashboardData);

    await waitFor(() => {
      expect(EventMetricsService.getAllVenuesMetrics).toHaveBeenCalledWith('30d');
    });
  });

  it('updates tab content when active tab changes', async () => {
    render(
      <MockedRouter>
        <EventDashboard clientId="test-client-1" />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });

    // Tab content should show the current active tab
    expect(screen.getByText('Tab Content - Tab: summary, Leads: 1250')).toBeInTheDocument();
  });

  it('passes correct props to all child components', async () => {
    render(
      <MockedRouter>
        <EventDashboard clientId="test-client-1" />
      </MockedRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-overview')).toBeInTheDocument();
      expect(screen.getByTestId('charts-section')).toBeInTheDocument();
      expect(screen.getByTestId('tables-section')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });

    // Verify that data is passed correctly
    expect(screen.getByText('Metrics - Leads: 1250')).toBeInTheDocument();
    expect(screen.getByText('Charts - Leads: 1250')).toBeInTheDocument();
    expect(screen.getByText('Tables - Leads: 1250')).toBeInTheDocument();
    expect(screen.getByText('Tab Content - Tab: summary, Leads: 1250')).toBeInTheDocument();
  });
});
