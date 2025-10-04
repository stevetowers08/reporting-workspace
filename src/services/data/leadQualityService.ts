import { LeadQualityMetrics, LeadRecord } from '@/types/dashboard';

export class LeadQualityService {
  /**
   * Parse lead data from CSV format
   * Format: Date, Source, Name, Email, Phone, Event Date, Event Time, Event Type, Budget
   */
  static parseLeadData(csvData: string): LeadRecord[] {
    const lines = csvData.trim().split('\n');
    const leads: LeadRecord[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t'); // Assuming tab-separated
      if (columns.length < 9) continue;

      const lead: LeadRecord = {
        id: `lead_${i + 1}`,
        date: columns[0] || '',
        source: this.mapSource(columns[1] || ''),
        name: columns[2] || '',
        email: columns[3] || '',
        phone: columns[4] || '',
        eventDate: columns[5] || '',
        eventTime: columns[6] || '',
        eventType: columns[7] || '',
        budget: parseFloat(columns[8] || '0'),
        status: 'New',
        qualityScore: this.calculateQualityScore(columns),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      leads.push(lead);
    }

    return leads;
  }

  /**
   * Map source string to our defined source types
   */
  private static mapSource(source: string): LeadRecord['source'] {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('facebook') || sourceLower.includes('meta')) {
      return 'Facebook Ads';
    }
    if (sourceLower.includes('google')) {
      return 'Google Ads';
    }
    if (sourceLower.includes('organic')) {
      return 'Organic';
    }
    if (sourceLower.includes('direct')) {
      return 'Direct';
    }
    if (sourceLower.includes('referral')) {
      return 'Referral';
    }
    return 'Facebook Ads'; // Default fallback
  }

  /**
   * Calculate quality score based on lead data
   */
  private static calculateQualityScore(columns: string[]): number {
    let score = 5; // Base score

    // Email quality
    const email = columns[3] || '';
    if (email.includes('@') && !email.includes('yahoo.com')) {
      score += 1; // Non-yahoo emails get bonus
    }

    // Phone quality
    const phone = columns[4] || '';
    if (phone.length >= 10) {
      score += 1; // Valid phone number
    }

    // Budget quality
    const budget = parseFloat(columns[8] || '0');
    if (budget >= 1000) {
      score += 2; // High budget
    } else if (budget >= 500) {
      score += 1; // Medium budget
    }

    // Event type quality
    const eventType = columns[7] || '';
    if (eventType.toLowerCase().includes('wedding') || eventType.toLowerCase().includes('corporate')) {
      score += 1; // Premium event types
    }

    return Math.min(10, Math.max(1, score)); // Clamp between 1-10
  }

  /**
   * Generate comprehensive lead quality metrics
   */
  static generateLeadQualityMetrics(leads: LeadRecord[]): LeadQualityMetrics {
    const totalLeads = leads.length;
    
    if (totalLeads === 0) {
      return {
        totalLeads: 0,
        averageQualityScore: 0,
        conversionRate: 0,
        sourceBreakdown: [],
        statusBreakdown: [],
        qualityScoreDistribution: [],
        topPerformingSources: [],
        recentLeads: [],
      };
    }

    // Calculate average quality score
    const averageQualityScore = leads.reduce((sum, lead) => sum + lead.qualityScore, 0) / totalLeads;

    // Calculate conversion rate (assuming 'Converted' status)
    const convertedLeads = leads.filter(lead => lead.status === 'Converted').length;
    const conversionRate = (convertedLeads / totalLeads) * 100;

    // Source breakdown
    const sourceMap = new Map<string, { count: number; totalScore: number; converted: number; totalBudget: number }>();
    leads.forEach(lead => {
      const existing = sourceMap.get(lead.source) || { count: 0, totalScore: 0, converted: 0, totalBudget: 0 };
      existing.count++;
      existing.totalScore += lead.qualityScore;
      existing.totalBudget += lead.budget;
      if (lead.status === 'Converted') existing.converted++;
      sourceMap.set(lead.source, existing);
    });

    const sourceBreakdown = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      count: data.count,
      percentage: (data.count / totalLeads) * 100,
      avgQualityScore: data.totalScore / data.count,
      conversionRate: (data.converted / data.count) * 100,
    }));

    // Status breakdown
    const statusMap = new Map<string, number>();
    leads.forEach(lead => {
      statusMap.set(lead.status, (statusMap.get(lead.status) || 0) + 1);
    });

    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalLeads) * 100,
    }));

    // Quality score distribution
    const scoreRanges = [
      { range: '1-3', min: 1, max: 3 },
      { range: '4-6', min: 4, max: 6 },
      { range: '7-8', min: 7, max: 8 },
      { range: '9-10', min: 9, max: 10 },
    ];

    const qualityScoreDistribution = scoreRanges.map(range => {
      const count = leads.filter(lead => lead.qualityScore >= range.min && lead.qualityScore <= range.max).length;
      return {
        range: range.range,
        count,
        percentage: (count / totalLeads) * 100,
      };
    });

    // Top performing sources
    const topPerformingSources = sourceBreakdown
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5)
      .map(source => {
        const sourceData = sourceMap.get(source.source)!;
        return {
          source: source.source,
          leads: source.count,
          conversionRate: source.conversionRate,
          avgBudget: sourceData.totalBudget / sourceData.count,
        };
      });

    // Recent leads (last 10)
    const recentLeads = leads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalLeads,
      averageQualityScore,
      conversionRate,
      sourceBreakdown,
      statusBreakdown,
      qualityScoreDistribution,
      topPerformingSources,
      recentLeads,
    };
  }

}
