import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import React, { useEffect, useMemo, useState } from 'react';

interface LeadQualityMetricsProps {
  data: {
    leadData?: any;
    clientAccounts?: {
      googleSheets?: string;
      googleSheetsConfig?: { spreadsheetId: string; sheetName: string };
    };
  } | null | undefined;
  dateRange?: { start: string; end: string };
}

interface LeadQualityMetric {
  source: string;
  totalLeads: number;
  totalGuests: number;
  avgGuestsPerLead: number;
  bookedEvents: number;
  conversionRate: number;
  avgEventValue: number;
  qualityScore: number;
}

export const LeadQualityMetrics: React.FC<LeadQualityMetricsProps> = React.memo(({ data, dateRange: _dateRange }) => {
  const [metrics, setMetrics] = useState<LeadQualityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Process raw data to calculate lead quality metrics
  const processLeadQualityMetrics = async (rawData: any) => {
    if (!rawData?.values || rawData.values.length < 2) {
      return [];
    }

    const headers = rawData.values[0];
    const rows = rawData.values.slice(1);
    
    // Find column indices
    const sourceIndex = headers.findIndex((h: string) => h.toLowerCase().includes('source'));
    const guestCountIndex = headers.findIndex((h: string) => h.toLowerCase().includes('guest'));
    const bookedIndex = headers.findIndex((h: string) => h.toLowerCase().includes('booked') || h.toLowerCase().includes('event booked'));
    const amountIndex = headers.findIndex((h: string) => h.toLowerCase().includes('amount') && !h.toLowerCase().includes('final'));
    
    if (sourceIndex === -1) {
      debugLogger.warn('LeadQualityMetrics', 'No source column found');
      return [];
    }

    const sourceData: { [key: string]: LeadQualityMetric } = {};

    rows.forEach((row: string[]) => {
      const source = row[sourceIndex]?.trim() || 'Unknown';
      const guestCountRaw = guestCountIndex >= 0 ? row[guestCountIndex] || '0' : '0';
      const guestCount = parseInt(guestCountRaw) || 0;
      const isBooked = bookedIndex >= 0 ? 
        (row[bookedIndex]?.toLowerCase().includes('yes') || row[bookedIndex]?.toLowerCase().includes('booked') || row[bookedIndex] === '1') : 
        false;
      const amountRaw = amountIndex >= 0 ? row[amountIndex] || '0' : '0';
      const amount = parseFloat(amountRaw.replace(/[^0-9.]/g, '')) || 0;

      if (!sourceData[source]) {
        sourceData[source] = {
          source,
          totalLeads: 0,
          totalGuests: 0,
          avgGuestsPerLead: 0,
          bookedEvents: 0,
          conversionRate: 0,
          avgEventValue: 0,
          qualityScore: 0
        };
      }

      sourceData[source].totalLeads++;
      sourceData[source].totalGuests += guestCount;
      
      if (isBooked) {
        sourceData[source].bookedEvents++;
      }
    });

    // Calculate derived metrics
    return Object.values(sourceData).map(data => {
      const avgGuestsPerLead = data.totalLeads > 0 ? data.totalGuests / data.totalLeads : 0;
      const conversionRate = data.totalLeads > 0 ? (data.bookedEvents / data.totalLeads) * 100 : 0;
      
      // Calculate quality score (0-100) based on multiple factors
      let qualityScore = 0;
      
      // Guest count factor (30% weight) - higher guest counts = higher quality
      if (avgGuestsPerLead > 0) {
        const guestScore = Math.min(avgGuestsPerLead / 100 * 30, 30); // Cap at 30 points
        qualityScore += guestScore;
      }
      
      // Conversion rate factor (50% weight) - higher conversion = higher quality
      qualityScore += conversionRate * 0.5; // Direct percentage to points
      
      // Volume factor (20% weight) - more leads = more reliable data
      const volumeScore = Math.min(data.totalLeads / 50 * 20, 20); // Cap at 20 points
      qualityScore += volumeScore;
      
      return {
        ...data,
        avgGuestsPerLead: Math.round(avgGuestsPerLead),
        conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
        avgEventValue: 0, // TODO: Calculate from amount data
        qualityScore: Math.round(qualityScore)
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        debugLogger.debug('LeadQualityMetrics', 'Starting to fetch lead quality metrics');
        
        // Use client-specific Google Sheets configuration if available
        let rawData;
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('LeadQualityMetrics', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
          rawData = await GoogleSheetsService.getSpreadsheetData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
          );
        } else if (data?.clientAccounts?.googleSheets) {
          debugLogger.debug('LeadQualityMetrics', 'Using client-specific Google Sheets config (legacy)', data.clientAccounts.googleSheets);
          const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
          rawData = await GoogleSheetsService.getSpreadsheetData(
            data.clientAccounts.googleSheets,
            'Event Leads'
          );
        } else {
          throw new Error('No Google Sheets configuration available');
        }
        
        debugLogger.debug('LeadQualityMetrics', 'Received raw data', rawData);
        
        if (rawData) {
          const processedData = await processLeadQualityMetrics(rawData);
          debugLogger.debug('LeadQualityMetrics', 'Processed lead quality metrics', processedData);
          setMetrics(processedData);
        } else {
          debugLogger.warn('LeadQualityMetrics', 'No data returned from GoogleSheetsService');
          setMetrics([]);
        }
      } catch (error) {
        debugLogger.error('LeadQualityMetrics', 'Failed to fetch lead quality metrics', error);
        setError('Failed to load lead quality metrics');
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data]);

  // Sort metrics by quality score
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => b.qualityScore - a.qualityScore);
  }, [metrics]);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Lead Quality Metrics</h3>
          <p className="text-sm text-slate-600">Quality analysis by lead source</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">{error}</div>
            <div className="text-xs text-slate-400">
              Check console for details. Proxy server may not be running.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (sortedMetrics.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Lead Quality Metrics</h3>
          <p className="text-sm text-slate-600">Quality analysis by lead source</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p>No lead quality data available</p>
            <p className="text-xs mt-1">Add 'source' and 'booked' columns to your Google Sheets to show quality analysis</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full overflow-hidden">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Lead Quality Metrics</h3>
        <p className="text-sm text-slate-600">Quality analysis by lead source</p>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedMetrics.map((metric, index) => (
          <div key={metric.source} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{metric.source}</span>
                {index === 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Best Quality
                  </span>
                )}
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(metric.qualityScore)}`}>
                {getQualityLabel(metric.qualityScore)} ({metric.qualityScore}/100)
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-slate-900">{metric.totalLeads}</div>
                <div className="text-slate-600">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-900">{metric.avgGuestsPerLead}</div>
                <div className="text-slate-600">Avg Guests</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-900">{metric.conversionRate}%</div>
                <div className="text-slate-600">Conversion</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-900">{metric.bookedEvents}</div>
                <div className="text-slate-600">Booked Events</div>
              </div>
            </div>
            
            {/* Quality score bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Quality Score</span>
                <span>{metric.qualityScore}/100</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metric.qualityScore >= 80 ? 'bg-green-500' :
                    metric.qualityScore >= 60 ? 'bg-yellow-500' :
                    metric.qualityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metric.qualityScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Overall summary */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {sortedMetrics.reduce((sum, m) => sum + m.totalLeads, 0)}
            </div>
            <div className="text-sm text-slate-600">Total Leads</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {Math.round(sortedMetrics.reduce((sum, m) => sum + m.avgGuestsPerLead * m.totalLeads, 0) / sortedMetrics.reduce((sum, m) => sum + m.totalLeads, 0))}
            </div>
            <div className="text-sm text-slate-600">Overall Avg Guests</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {Math.round(sortedMetrics.reduce((sum, m) => sum + m.conversionRate * m.totalLeads, 0) / sortedMetrics.reduce((sum, m) => sum + m.totalLeads, 0) * 10) / 10}%
            </div>
            <div className="text-sm text-slate-600">Overall Conversion</div>
          </div>
        </div>
      </div>
    </Card>
  );
});
