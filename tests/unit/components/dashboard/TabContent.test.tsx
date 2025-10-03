import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabContent } from '@/components/dashboard/TabContent';
import { EventDashboardData } from '@/services/eventMetricsService';

// Mock the child components
jest.mock('@/components/InsightsCard', () => ({
  __esModule: true,
  default: ({ dashboardData, selectedPeriod }: any) => (
    <div data-testid="insights-card">
      Insights Card - Period: {selectedPeriod}, Leads: {dashboardData.totalLeads}
    </div>
  ),
}));

jest.mock('@/components/LeadQualityMetrics', () => ({
  LeadQualityMetricsComponent: ({ metrics }: any) => (
    <div data-testid="lead-quality-metrics">
      Lead Quality Metrics - Total Leads: {metrics.totalLeads}
    </div>
  ),
}));

// Mock data
const mockDashboardData: EventDashboardData = {
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

const mockClientData = {
  id: 'test-client-1',
  name: 'Test Venue'
};

const defaultProps = {
  dashboardData: mockDashboardData,
  selectedPeriod: '30d',
  clientData: mockClientData,
  activeTab: 'summary'
};

describe('TabContent', () => {
  it('renders loading state when dashboard data is null', () => {
    render(<TabContent {...defaultProps} dashboardData={null} />);

    expect(screen.getByText('Content Not Found')).toBeInTheDocument();
  });

  it('renders summary tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="summary" />);

    expect(screen.getByTestId('insights-card')).toBeInTheDocument();
    expect(screen.getByText('Insights Card - Period: 30d, Leads: 1250')).toBeInTheDocument();
  });

  it('renders Facebook ads tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="facebook" />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument(); // Facebook leads
    expect(screen.getByText('$8,000')).toBeInTheDocument(); // Facebook spend
    expect(screen.getByText('$10.67')).toBeInTheDocument(); // Facebook CPL
    expect(screen.getByText('2.5x')).toBeInTheDocument(); // Facebook ROAS
  });

  it('renders Facebook-all tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="facebook-all" />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
  });

  it('renders Google ads tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="google" />);

    expect(screen.getByText('Google Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument(); // Google leads
    expect(screen.getByText('$7,000')).toBeInTheDocument(); // Google cost
    expect(screen.getByText('$14.00')).toBeInTheDocument(); // Google CPL
    expect(screen.getByText('7.5')).toBeInTheDocument(); // Google Quality Score
  });

  it('renders Google-all tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="google-all" />);

    expect(screen.getByText('Google Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders lead quality tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="lead-quality" />);

    expect(screen.getByText('Lead Quality Metrics')).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-metrics')).toBeInTheDocument();
    expect(screen.getByText('Lead Quality Metrics - Total Leads: 1250')).toBeInTheDocument();
  });

  it('renders event analytics tab content correctly', () => {
    render(<TabContent {...defaultProps} activeTab="event-analytics" />);

    expect(screen.getByText('Event Analytics')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // Total events
    expect(screen.getByText('120')).toBeInTheDocument(); // Average guests
    expect(screen.getByText('$1,000')).toBeInTheDocument(); // Average event value
  });

  it('renders default content for unknown tab', () => {
    render(<TabContent {...defaultProps} activeTab="unknown-tab" />);

    expect(screen.getByText('Content Not Found')).toBeInTheDocument();
    expect(screen.getByText('The requested tab content could not be found.')).toBeInTheDocument();
  });

  it('formats numbers correctly in Facebook tab', () => {
    render(<TabContent {...defaultProps} activeTab="facebook" />);

    expect(screen.getByText('750')).toBeInTheDocument(); // Leads with comma formatting
    expect(screen.getByText('$8,000')).toBeInTheDocument(); // Spend with comma formatting
  });

  it('formats numbers correctly in Google tab', () => {
    render(<TabContent {...defaultProps} activeTab="google" />);

    expect(screen.getByText('500')).toBeInTheDocument(); // Leads
    expect(screen.getByText('$7,000')).toBeInTheDocument(); // Cost with comma formatting
  });

  it('formats numbers correctly in event analytics tab', () => {
    render(<TabContent {...defaultProps} activeTab="event-analytics" />);

    expect(screen.getByText('45')).toBeInTheDocument(); // Total events
    expect(screen.getByText('120')).toBeInTheDocument(); // Average guests
    expect(screen.getByText('$1,000')).toBeInTheDocument(); // Average event value
  });

  it('handles missing metrics gracefully', () => {
    const incompleteData = {
      ...mockDashboardData,
      facebookMetrics: {
        ...mockDashboardData.facebookMetrics,
        leads: 0,
        spend: 0,
        costPerLead: 0,
        roas: 0
      }
    };

    render(<TabContent {...defaultProps} dashboardData={incompleteData} activeTab="facebook" />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('passes correct props to InsightsCard', () => {
    render(<TabContent {...defaultProps} activeTab="summary" />);

    expect(screen.getByText('Insights Card - Period: 30d, Leads: 1250')).toBeInTheDocument();
  });

  it('passes correct props to LeadQualityMetricsComponent', () => {
    render(<TabContent {...defaultProps} activeTab="lead-quality" />);

    expect(screen.getByText('Lead Quality Metrics - Total Leads: 1250')).toBeInTheDocument();
  });

  it('renders correct metric labels', () => {
    render(<TabContent {...defaultProps} activeTab="facebook" />);

    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Spend')).toBeInTheDocument();
    expect(screen.getByText('Cost per Lead')).toBeInTheDocument();
    expect(screen.getByText('ROAS')).toBeInTheDocument();
  });

  it('renders correct metric labels for Google tab', () => {
    render(<TabContent {...defaultProps} activeTab="google" />);

    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Cost per Lead')).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
  });

  it('renders correct metric labels for event analytics tab', () => {
    render(<TabContent {...defaultProps} activeTab="event-analytics" />);

    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('Avg Guests')).toBeInTheDocument();
    expect(screen.getByText('Avg Event Value')).toBeInTheDocument();
  });
});
