export interface EventDashboardData {
    // Summary metrics
    totalLeads: number;
    totalSpend: number;
    totalRevenue: number;
    roi: number;

    // Platform-specific data
    facebookMetrics: FacebookAdsMetrics & { costPerLead: number };
    googleMetrics: GoogleAdsMetrics & { costPerLead: number };
    ghlMetrics: GoHighLevelMetrics;
    eventMetrics: EventMetrics;

    // Combined insights
    leadMetrics: EventLeadMetrics;

    // Time period
    dateRange: {
        start: string;
        end: string;
    };
}

export interface FacebookAdsMetrics {
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
    reach: number;
    frequency: number;
}

export interface GoogleAdsMetrics {
    impressions: number;
    clicks: number;
    cost: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    conversionRate: number;
    costPerConversion: number;
    searchImpressionShare: number;
    qualityScore: number;
}

export interface GoHighLevelMetrics {
    totalContacts: number;
    newContacts: number;
    totalOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    pipelineValue: number;
    avgDealSize: number;
    conversionRate: number;
    responseTime: number;
}

export interface EventMetrics {
    totalEvents: number;
    averageGuests: number;
    totalSubmissions: number;
    eventTypeBreakdown: Array<{
        type: string;
        count: number;
        percentage: number;
        avgGuests: number;
    }>;
    budgetDistribution: Array<{
        range: string;
        count: number;
        percentage: number;
    }>;
}

export interface EventLeadMetrics {
    // Cost per lead metrics
    facebookCostPerLead: number;
    googleCostPerLead: number;
    overallCostPerLead: number;

    // Lead quality metrics
    leadToOpportunityRate: number;
    opportunityToWinRate: number;
    averageEventValue: number;

    // Event-specific metrics
    averageGuestsPerEvent: number;
    mostPopularEventType: string;
    seasonalTrends: Array<{
        month: string;
        leads: number;
        events: number;
        revenue: number;
    }>;

    // Landing page performance
    landingPageConversionRate: number;
    formCompletionRate: number;

    // Attribution metrics
    leadSourceBreakdown: Array<{
        source: string;
        leads: number;
        percentage: number;
        costPerLead: number;
        conversionRate: number;
    }>;
}

// Lead Quality specific interfaces
export interface LeadRecord {
    id: string;
    date: string;
    source: 'Facebook Ads' | 'Google Ads' | 'Organic' | 'Direct' | 'Referral';
    name: string;
    email: string;
    phone: string;
    eventDate: string;
    eventTime: string;
    eventType: string;
    budget: number;
    status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
    qualityScore: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LeadQualityMetrics {
    totalLeads: number;
    averageQualityScore: number;
    conversionRate: number;
    sourceBreakdown: Array<{
        source: string;
        count: number;
        percentage: number;
        avgQualityScore: number;
        conversionRate: number;
    }>;
    statusBreakdown: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    qualityScoreDistribution: Array<{
        range: string;
        count: number;
        percentage: number;
    }>;
    topPerformingSources: Array<{
        source: string;
        leads: number;
        conversionRate: number;
        avgBudget: number;
    }>;
    recentLeads: LeadRecord[];
}