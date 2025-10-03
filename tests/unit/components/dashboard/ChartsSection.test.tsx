import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { EventDashboardData } from '@/services/eventMetricsService';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

// Mock Chart.js registration
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  ArcElement: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
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

const defaultProps = {
  dashboardData: mockDashboardData,
  selectedPeriod: '30d'
};

describe('ChartsSection', () => {
  it('renders all chart components when data is available', () => {
    render(<ChartsSection {...defaultProps} />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('Google Ads Performance')).toBeInTheDocument();
    expect(screen.getByText('Event Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
  });

  it('renders loading state when dashboard data is null', () => {
    render(<ChartsSection {...defaultProps} dashboardData={null} />);

    // Should render skeleton cards
    const skeletonCards = screen.getAllByRole('generic');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('renders Meta Ads chart with correct data', () => {
    render(<ChartsSection {...defaultProps} />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders Google Ads chart with correct data', () => {
    render(<ChartsSection {...defaultProps} />);

    expect(screen.getByText('Google Ads Performance')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders Event Type Distribution chart', () => {
    render(<ChartsSection {...defaultProps} />);

    expect(screen.getByText('Event Type Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders Budget Distribution chart', () => {
    render(<ChartsSection {...defaultProps} />);

    expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('handles missing event metrics gracefully', () => {
    const incompleteData = {
      ...mockDashboardData,
      eventMetrics: {
        ...mockDashboardData.eventMetrics,
        eventTypeBreakdown: [],
        budgetDistribution: []
      }
    };

    render(<ChartsSection {...defaultProps} dashboardData={incompleteData} />);

    expect(screen.getByText('Event Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
  });

  it('handles missing Facebook metrics gracefully', () => {
    const incompleteData = {
      ...mockDashboardData,
      facebookMetrics: {
        ...mockDashboardData.facebookMetrics,
        leads: 0,
        spend: 0
      }
    };

    render(<ChartsSection {...defaultProps} dashboardData={incompleteData} />);

    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles missing Google metrics gracefully', () => {
    const incompleteData = {
      ...mockDashboardData,
      googleMetrics: {
        ...mockDashboardData.googleMetrics,
        clicks: 0,
        cost: 0
      }
    };

    render(<ChartsSection {...defaultProps} dashboardData={incompleteData} />);

    expect(screen.getByText('Google Ads Performance')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders charts in correct order', () => {
    render(<ChartsSection {...defaultProps} />);

    const chartTitles = screen.getAllByRole('heading', { level: 3 });
    expect(chartTitles[0]).toHaveTextContent('Meta Ads Performance');
    expect(chartTitles[1]).toHaveTextContent('Google Ads Performance');
    expect(chartTitles[2]).toHaveTextContent('Event Type Distribution');
    expect(chartTitles[3]).toHaveTextContent('Budget Distribution');
  });

  it('applies correct CSS classes for styling', () => {
    render(<ChartsSection {...defaultProps} />);

    // Test that cards have the correct structure
    const cards = screen.getAllByRole('generic');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('handles different selected periods', () => {
    const props7d = { ...defaultProps, selectedPeriod: '7d' };
    const props90d = { ...defaultProps, selectedPeriod: '90d' };

    const { rerender } = render(<ChartsSection {...props7d} />);
    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();

    rerender(<ChartsSection {...props90d} />);
    expect(screen.getByText('Meta Ads Performance')).toBeInTheDocument();
  });

  it('renders all chart types correctly', () => {
    render(<ChartsSection {...defaultProps} />);

    // Should have 2 line charts (Meta Ads and Google Ads)
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(2);

    // Should have 1 pie chart (Event Type Distribution)
    const pieCharts = screen.getAllByTestId('pie-chart');
    expect(pieCharts).toHaveLength(1);

    // Should have 1 bar chart (Budget Distribution)
    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts).toHaveLength(1);
  });
});
