import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GoogleAdsCampaignBreakdownProps {
  data: EventDashboardData | null | undefined;
  isLoading?: boolean;
}

export const GoogleAdsCampaignBreakdown: React.FC<GoogleAdsCampaignBreakdownProps> = ({ data, isLoading = false }) => {
  const campaignBreakdown = data?.googleMetrics?.campaignBreakdown;
  
  // Determine loading states for each chart
  const hasMainMetrics = !!data?.googleMetrics;
  const isLoadingCampaignTypes = isLoading || (hasMainMetrics && !campaignBreakdown?.campaignTypes);
  const isLoadingAdFormats = isLoading || (hasMainMetrics && !campaignBreakdown?.adFormats);

  React.useEffect(() => {
    if (!campaignBreakdown && data?.googleMetrics) {
      console.warn('⚠️ [GoogleAdsCampaignBreakdown] campaignBreakdown is missing');
    }
  }, [data, campaignBreakdown]);

  // Prepare campaign types data for stacked bar chart
  // Only show Search and Performance Max
  const campaignTypesChartData = [
    {
      name: 'Search',
      impressions: campaignBreakdown?.campaignTypes?.search?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.search?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.search?.conversionRate || 0
    },
    {
      name: 'Performance Max',
      impressions: campaignBreakdown?.campaignTypes?.performanceMax?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.performanceMax?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.performanceMax?.conversionRate || 0
    }
  ];

  // Prepare ad formats data for stacked bar chart
  // NOTE: This chart shows ONLY traditional ad formats from Search/Display/YouTube campaigns
  // Performance Max assets are NOT included here - they have their own dedicated breakdown
  // This prevents double-counting and confusion, since Performance Max data is "non-summable"
  const adFormatsChartData = [
    {
      name: 'Text Ads',
      impressions: campaignBreakdown?.adFormats?.textAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.textAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.textAds?.conversionRate || 0
    },
    {
      name: 'Responsive Display',
      impressions: campaignBreakdown?.adFormats?.responsiveDisplay?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.responsiveDisplay?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.responsiveDisplay?.conversionRate || 0
    },
    {
      name: 'Video Ads',
      impressions: campaignBreakdown?.adFormats?.videoAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.videoAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.videoAds?.conversionRate || 0
    }
  ];

  // Check if we have breakdown data - show charts if data exists (even if some values are 0)
  const hasCampaignTypesData = !!campaignBreakdown && !!campaignBreakdown.campaignTypes;
  const hasAdFormatData = !!campaignBreakdown && !!campaignBreakdown.adFormats;


  return (
    <>
      {/* Campaign Types Card - Stacked Bar Chart */}
      <Card className="h-full flex flex-col">
        <div className="pb-4 min-h-[60px]">
          <h3 className="text-lg font-semibold text-slate-900">Campaign Types</h3>
          {!hasCampaignTypesData && campaignBreakdown && !isLoadingCampaignTypes && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ No campaign type data found for this period
            </p>
          )}
          {isLoadingCampaignTypes && (
            <p className="text-xs text-slate-500 mt-1">
              Loading campaign type breakdown data...
            </p>
          )}
        </div>
        
        <div className="flex-1 min-h-0">
          {isLoadingCampaignTypes ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Loading campaign types...</p>
              </div>
            </div>
          ) : hasCampaignTypesData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={campaignTypesChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
                      const label = name === 'impressions' ? 'Impressions' : 'Conversions';
                      const payload = props.payload;
                      
                      if (name === 'conversions' && payload) {
                        const conversionRate = payload.conversionRate || 0;
                        return [
                          `${formattedValue} ${label} • ${conversionRate.toFixed(2)}% rate`,
                          label
                        ];
                      }
                      return [formattedValue, label];
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '6px',
                      fontSize: '13px'
                    }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                    iconType="square"
                    iconSize={12}
                    formatter={(value) => {
                      return value === 'impressions' ? 'Impressions' : 'Conversions';
                    }}
                  />
                  <Bar 
                    dataKey="impressions" 
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={600}
                    stackId="1"
                  />
                  <Bar 
                    dataKey="conversions" 
                    fill="#10B981"
                    radius={[0, 0, 4, 4]}
                    animationDuration={600}
                    stackId="1"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">
              {campaignBreakdown ? 'No campaign type data for this period' : 'Loading campaign type breakdown data...'}
            </div>
          )}
        </div>
      </Card>

      {/* Ad Formats Card - Stacked Bar Chart */}
      {/* NOTE: Includes both traditional ad formats (Search/Display/YouTube) and Performance Max assets */}
      {/* Performance Max assets are mapped: TEXT→textAds, IMAGE→responsiveDisplay, YOUTUBE_VIDEO→videoAds */}
      {/* Totals may be higher than campaign metrics due to non-summable nature - this is expected */}
      <Card className="h-full flex flex-col">
        <div className="pb-4 min-h-[60px]">
          <h3 className="text-lg font-semibold text-slate-900">Ad Formats</h3>
          {!hasAdFormatData && campaignBreakdown && !isLoadingAdFormats && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ No ad format data found for this period
            </p>
          )}
          {isLoadingAdFormats && (
            <p className="text-xs text-slate-500 mt-1">
              Loading ad format breakdown data...
            </p>
          )}
        </div>
        
        <div className="flex-1 min-h-0">
          {isLoadingAdFormats ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Loading ad formats...</p>
              </div>
            </div>
          ) : hasAdFormatData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adFormatsChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
                      const label = name === 'impressions' ? 'Impressions' : 'Conversions';
                      const payload = props.payload;
                      
                      if (name === 'conversions' && payload) {
                        const conversionRate = payload.conversionRate || 0;
                        return [
                          `${formattedValue} ${label} • ${conversionRate.toFixed(2)}% rate`,
                          label
                        ];
                      }
                      return [formattedValue, label];
                    }}
                    labelStyle={{ 
                      color: '#111827', 
                      fontWeight: 600, 
                      marginBottom: '6px',
                      fontSize: '13px'
                    }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                    iconType="square"
                    iconSize={12}
                    formatter={(value) => {
                      return value === 'impressions' ? 'Impressions' : 'Conversions';
                    }}
                  />
                  <Bar 
                    dataKey="impressions" 
                    fill="#6366F1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={600}
                    stackId="1"
                  />
                  <Bar 
                    dataKey="conversions" 
                    fill="#10B981"
                    radius={[0, 0, 4, 4]}
                    animationDuration={600}
                    stackId="1"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">
              {campaignBreakdown ? 'No ad format data for this period' : 'Loading ad format breakdown data...'}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};
