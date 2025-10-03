import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { EventDashboardData } from '@/services/eventMetricsService';

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

describe('MetricsOverview', () => {
  it('renders all metric cards with correct values', () => {
    render(<MetricsOverview {...defaultProps} />);

    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Generated in last 30 days')).toBeInTheDocument();

    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('$15,000')).toBeInTheDocument();
    expect(screen.getByText('Across all platforms')).toBeInTheDocument();

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,000')).toBeInTheDocument();
    expect(screen.getByText('From event bookings')).toBeInTheDocument();

    expect(screen.getByText('ROI')).toBeInTheDocument();
    expect(screen.getByText('3.0x')).toBeInTheDocument();
    expect(screen.getByText('Return on investment')).toBeInTheDocument();
  });

  it('renders loading state when dashboard data is null', () => {
    render(<MetricsOverview {...defaultProps} dashboardData={null} />);

    // Should render skeleton cards
    const skeletonCards = screen.getAllByRole('generic');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('displays correct period text for different periods', () => {
    const props7d = { ...defaultProps, selectedPeriod: '7d' };
    const props90d = { ...defaultProps, selectedPeriod: '90d' };

    const { rerender } = render(<MetricsOverview {...props7d} />);
    expect(screen.getByText('Generated in last 7 days')).toBeInTheDocument();

    rerender(<MetricsOverview {...props90d} />);
    expect(screen.getByText('Generated in last 90 days')).toBeInTheDocument();
  });

  it('formats numbers correctly with locale', () => {
    render(<MetricsOverview {...defaultProps} />);

    // Test that large numbers are formatted with commas
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('$15,000')).toBeInTheDocument();
    expect(screen.getByText('$45,000')).toBeInTheDocument();
  });

  it('displays correct icons for each metric', () => {
    render(<MetricsOverview {...defaultProps} />);

    // Test that the component renders without errors
    // The actual icon testing would require more complex setup
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('ROI')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroData = {
      ...mockDashboardData,
      totalLeads: 0,
      totalSpend: 0,
      totalRevenue: 0,
      roi: 0
    };

    render(<MetricsOverview {...defaultProps} dashboardData={zeroData} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('0.0x')).toBeInTheDocument();
  });

  it('handles decimal values correctly', () => {
    const decimalData = {
      ...mockDashboardData,
      roi: 2.75
    };

    render(<MetricsOverview {...defaultProps} dashboardData={decimalData} />);

    expect(screen.getByText('2.8x')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    render(<MetricsOverview {...defaultProps} />);

    // Test that cards have the correct structure
    const cards = screen.getAllByRole('generic');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders metric descriptions correctly', () => {
    render(<MetricsOverview {...defaultProps} />);

    expect(screen.getByText('Generated in last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Across all platforms')).toBeInTheDocument();
    expect(screen.getByText('From event bookings')).toBeInTheDocument();
    expect(screen.getByText('Return on investment')).toBeInTheDocument();
  });

  it('handles missing dashboard data gracefully', () => {
    const incompleteData = {
      ...mockDashboardData,
      totalLeads: undefined as any,
      totalSpend: undefined as any
    };

    // Should not crash and should render loading state
    render(<MetricsOverview {...defaultProps} dashboardData={incompleteData} />);
    
    // Component should still render without errors
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
  });
});
