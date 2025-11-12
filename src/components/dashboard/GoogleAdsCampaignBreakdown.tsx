import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';
import { 
  Bar, 
  BarChart, 
  Legend, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis
} from 'recharts';

interface GoogleAdsCampaignBreakdownProps {
  data: EventDashboardData | null | undefined;
  isLoading?: boolean;
}

export const GoogleAdsCampaignBreakdown: React.FC<GoogleAdsCampaignBreakdownProps> = ({ data, isLoading = false }) => {
  const campaignBreakdown = data?.googleMetrics?.campaignBreakdown;
  
  // Simple data preparation
  const campaignTypesData = React.useMemo(() => {
    if (!campaignBreakdown?.campaignTypes) {
      return {
        searchSpend: 0,
        performanceMaxSpend: 0,
        totalSpend: 0,
        searchConversions: 0,
        performanceMaxConversions: 0,
        totalConversions: 0
      };
    }

    const searchSpend = campaignBreakdown.campaignTypes.search?.cost || 0;
    const performanceMaxSpend = campaignBreakdown.campaignTypes.performanceMax?.cost || 0;
    const totalSpend = searchSpend + performanceMaxSpend;
    
    const searchConversions = campaignBreakdown.campaignTypes.search?.conversions || 0;
    const performanceMaxConversions = campaignBreakdown.campaignTypes.performanceMax?.conversions || 0;
    const totalConversions = searchConversions + performanceMaxConversions;
    
    return {
      searchSpend,
      performanceMaxSpend,
      totalSpend,
      searchConversions,
      performanceMaxConversions,
      totalConversions,
      searchSpendPercent: totalSpend > 0 ? (searchSpend / totalSpend) * 100 : 0,
      performanceMaxSpendPercent: totalSpend > 0 ? (performanceMaxSpend / totalSpend) * 100 : 0,
      searchConversionsPercent: totalConversions > 0 ? (searchConversions / totalConversions) * 100 : 0,
      performanceMaxConversionsPercent: totalConversions > 0 ? (performanceMaxConversions / totalConversions) * 100 : 0
    };
  }, [campaignBreakdown?.campaignTypes]);

  const adFormatsData = React.useMemo(() => {
    if (!campaignBreakdown?.adFormats) {
      return [];
    }

    return [
      {
        name: 'Text Ads',
        impressions: campaignBreakdown.adFormats.textAds?.impressions || 0,
        conversions: campaignBreakdown.adFormats.textAds?.conversions || 0,
        conversionRate: campaignBreakdown.adFormats.textAds?.conversionRate || 0,
        costPerLead: 0
      },
      {
        name: 'Responsive Display',
        impressions: campaignBreakdown.adFormats.responsiveDisplay?.impressions || 0,
        conversions: campaignBreakdown.adFormats.responsiveDisplay?.conversions || 0,
        conversionRate: campaignBreakdown.adFormats.responsiveDisplay?.conversionRate || 0,
        costPerLead: 0
      },
      {
        name: 'Video Ads',
        impressions: campaignBreakdown.adFormats.videoAds?.impressions || 0,
        conversions: campaignBreakdown.adFormats.videoAds?.conversions || 0,
        conversionRate: campaignBreakdown.adFormats.videoAds?.conversionRate || 0,
        costPerLead: 0
      }
    ];
  }, [campaignBreakdown?.adFormats]);

  const hasCampaignTypesData = !!campaignBreakdown?.campaignTypes;
  const hasAdFormatData = !!campaignBreakdown?.adFormats;

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 w-full col-span-2">
      {/* Campaign Types Card */}
      <Card className="h-full flex flex-col">
        <div className="pb-3 sm:pb-4 min-h-[50px] sm:min-h-[60px]">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Campaign Types</h3>
        </div>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            </div>
          ) : hasCampaignTypesData ? (
            <div className="h-56 sm:h-64 p-3 sm:p-4">
              <div className="space-y-6">
                {/* Spend Distribution */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">Spend Distribution</h4>
                    <span className="text-xs text-slate-500">${campaignTypesData.totalSpend.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                    {campaignTypesData.searchSpendPercent > 0 && (
                      <div 
                        className="bg-blue-600 h-8 rounded-l-full flex items-center justify-center" 
                        style={{ width: `${campaignTypesData.searchSpendPercent}%` }}
                      >
                        {campaignTypesData.searchSpendPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Search ({campaignTypesData.searchSpendPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {campaignTypesData.performanceMaxSpendPercent > 0 && (
                      <div 
                        className="bg-green-500 h-8 rounded-r-full absolute top-0 flex items-center justify-center" 
                        style={{ 
                          width: `${campaignTypesData.performanceMaxSpendPercent}%`, 
                          left: `${campaignTypesData.searchSpendPercent}%`,
                          borderRadius: campaignTypesData.searchSpendPercent === 0 ? '0.5rem' : '0 0.5rem 0.5rem 0'
                        }}
                      >
                        {campaignTypesData.performanceMaxSpendPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Performance Max ({campaignTypesData.performanceMaxSpendPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span className="text-xs font-medium text-slate-700">Search</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium text-slate-700">Performance Max</span>
                    </div>
                  </div>
                </div>

                {/* Conversions Distribution */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">Conversions Distribution</h4>
                    <span className="text-xs text-slate-500">{campaignTypesData.totalConversions.toLocaleString()} conversions</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                    {campaignTypesData.searchConversionsPercent > 0 && (
                      <div 
                        className="bg-blue-600 h-8 rounded-l-full flex items-center justify-center" 
                        style={{ width: `${campaignTypesData.searchConversionsPercent}%` }}
                      >
                        {campaignTypesData.searchConversionsPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Search ({campaignTypesData.searchConversionsPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {campaignTypesData.performanceMaxConversionsPercent > 0 && (
                      <div 
                        className="bg-green-500 h-8 rounded-r-full absolute top-0 flex items-center justify-center" 
                        style={{ 
                          width: `${campaignTypesData.performanceMaxConversionsPercent}%`, 
                          left: `${campaignTypesData.searchConversionsPercent}%`,
                          borderRadius: campaignTypesData.searchConversionsPercent === 0 ? '0.5rem' : '0 0.5rem 0.5rem 0'
                        }}
                      >
                        {campaignTypesData.performanceMaxConversionsPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Performance Max ({campaignTypesData.performanceMaxConversionsPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span className="text-xs font-medium text-slate-700">Search</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium text-slate-700">Performance Max</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">
              No campaign type data available
            </div>
          )}
        </div>
      </Card>

      {/* Ad Formats Card */}
      <Card className="h-full flex flex-col">
        <div className="pb-2 min-h-[50px]">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Ad Formats</h3>
        </div>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            </div>
          ) : hasAdFormatData ? (
            <div className="h-64 sm:h-72 p-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adFormatsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 45, bottom: 30 }}
                  barCategoryGap="8%"
                  barGap={4}
                >
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={40}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const payload = props.payload;
                      if (name === 'impressions' || name === 'conversions') {
                        return [
                          `${value.toLocaleString()}\nConversion Rate: ${(payload.conversionRate || 0).toFixed(2)}%\nCost/Lead: $${(payload.costPerLead || 0).toFixed(2)}`,
                          name === 'impressions' ? 'Impressions' : 'Conversions'
                        ];
                      }
                      return [value, name];
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 500 }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      whiteSpace: 'pre-line'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                    iconType="square"
                    iconSize={10}
                    fontSize={11}
                  />
                  <Bar 
                    dataKey="impressions" 
                    fill="#3B82F6" 
                    name="Impressions"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="conversions" 
                    fill="#10B981" 
                    name="Conversions"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">
              No ad format data available
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
