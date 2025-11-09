import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';
import { 
  Bar, 
  BarChart, 
  CartesianGrid,
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
  
  // Timeout state - stop showing loading after 10 seconds
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);
  
  // Determine loading states for each chart
  // FIXED: Don't show loading forever - if breakdown is missing after timeout, show empty state
  const hasMainMetrics = !!data?.googleMetrics;
  const hasBreakdown = !!campaignBreakdown;
  const isLoadingCampaignTypes = isLoading && !loadingTimeout && (hasMainMetrics && !campaignBreakdown?.campaignTypes);
  const isLoadingAdFormats = isLoading && !loadingTimeout && (hasMainMetrics && !campaignBreakdown?.adFormats);

  React.useEffect(() => {
    if (!campaignBreakdown && data?.googleMetrics && !isLoading) {
      console.warn('⚠️ [GoogleAdsCampaignBreakdown] campaignBreakdown is missing');
    }
    // Debug: Log data structure when available
    if (campaignBreakdown) {
      const textAds = campaignBreakdown.adFormats?.textAds;
      const responsiveDisplay = campaignBreakdown.adFormats?.responsiveDisplay;
      const videoAds = campaignBreakdown.adFormats?.videoAds;
      
      const debugData = {
        hasCampaignTypes: !!campaignBreakdown.campaignTypes,
        hasAdFormats: !!campaignBreakdown.adFormats,
        campaignTypesKeys: campaignBreakdown.campaignTypes ? Object.keys(campaignBreakdown.campaignTypes) : [],
        adFormatsKeys: campaignBreakdown.adFormats ? Object.keys(campaignBreakdown.adFormats) : [],
        textAds: textAds ? { impressions: textAds.impressions, conversions: textAds.conversions, conversionRate: textAds.conversionRate } : null,
        responsiveDisplay: responsiveDisplay ? { impressions: responsiveDisplay.impressions, conversions: responsiveDisplay.conversions, conversionRate: responsiveDisplay.conversionRate } : null,
        videoAds: videoAds ? { impressions: videoAds.impressions, conversions: videoAds.conversions, conversionRate: videoAds.conversionRate } : null,
        networkBreakdown: campaignBreakdown.adFormats?.networkBreakdown ? Object.keys(campaignBreakdown.adFormats.networkBreakdown) : [],
        assetTypes: campaignBreakdown.adFormats?.assetTypes ? Object.keys(campaignBreakdown.adFormats.assetTypes) : [],
        individualAssets: campaignBreakdown.adFormats?.individualAssets ? Object.keys(campaignBreakdown.adFormats.individualAssets).length : 0,
        fullAdFormatsObject: campaignBreakdown.adFormats
      };
      
      console.log('📊 [GoogleAdsCampaignBreakdown] Data available:', JSON.stringify(debugData, null, 2));
      console.log('📊 [GoogleAdsCampaignBreakdown] Raw campaignBreakdown:', campaignBreakdown);
      console.log('📊 [GoogleAdsCampaignBreakdown] Raw adFormats:', campaignBreakdown.adFormats);
    } else if (data?.googleMetrics && !isLoading) {
      console.warn('⚠️ [GoogleAdsCampaignBreakdown] campaignBreakdown is missing but googleMetrics exists:', {
        hasGoogleMetrics: !!data.googleMetrics,
        googleMetricsKeys: data.googleMetrics ? Object.keys(data.googleMetrics) : [],
        campaignBreakdown: data.googleMetrics?.campaignBreakdown
      });
    }
  }, [campaignBreakdown, data, isLoading]);

  // Prepare campaign types data for distribution charts
  // Only show Search and Performance Max
  const searchData = {
    name: 'Search',
    spend: campaignBreakdown?.campaignTypes?.search?.cost || 0,
    conversions: campaignBreakdown?.campaignTypes?.search?.conversions || 0,
    impressions: campaignBreakdown?.campaignTypes?.search?.impressions || 0,
    conversionRate: campaignBreakdown?.campaignTypes?.search?.conversionRate || 0
  };
  
  const performanceMaxData = {
    name: 'Performance Max',
    spend: campaignBreakdown?.campaignTypes?.performanceMax?.cost || 0,
    conversions: campaignBreakdown?.campaignTypes?.performanceMax?.conversions || 0,
    impressions: campaignBreakdown?.campaignTypes?.performanceMax?.impressions || 0,
    conversionRate: campaignBreakdown?.campaignTypes?.performanceMax?.conversionRate || 0
  };
  
  const totalSpend = searchData.spend + performanceMaxData.spend;
  const totalConversions = searchData.conversions + performanceMaxData.conversions;
  
  const searchSpendPercent = totalSpend > 0 ? (searchData.spend / totalSpend) * 100 : 0;
  const performanceMaxSpendPercent = totalSpend > 0 ? (performanceMaxData.spend / totalSpend) * 100 : 0;
  
  const searchConversionsPercent = totalConversions > 0 ? (searchData.conversions / totalConversions) * 100 : 0;
  const performanceMaxConversionsPercent = totalConversions > 0 ? (performanceMaxData.conversions / totalConversions) * 100 : 0;

  // Calculate total conversions and cost from all campaign types for cost per lead calculation
  const allCampaignTypesConversions = (campaignBreakdown?.campaignTypes?.search?.conversions || 0) +
    (campaignBreakdown?.campaignTypes?.performanceMax?.conversions || 0) +
    (campaignBreakdown?.campaignTypes?.display?.conversions || 0) +
    (campaignBreakdown?.campaignTypes?.youtube?.conversions || 0);
  
  const allCampaignTypesCost = (campaignBreakdown?.campaignTypes?.search?.cost || 0) +
    (campaignBreakdown?.campaignTypes?.performanceMax?.cost || 0) +
    (campaignBreakdown?.campaignTypes?.display?.cost || 0) +
    (campaignBreakdown?.campaignTypes?.youtube?.cost || 0);
  
  const overallCostPerLead = allCampaignTypesConversions > 0 ? allCampaignTypesCost / allCampaignTypesConversions : 0;

  // Prepare ad formats data for distribution charts
  // NOTE: This chart shows ONLY traditional ad formats from Search/Display/YouTube campaigns
  // Performance Max assets are NOT included here - they have their own dedicated breakdown
  // This prevents double-counting and confusion, since Performance Max data is "non-summable"
  // Prepare ad formats data with all 4 metrics
  // Calculate cost per lead for each ad format based on its conversions and overall cost distribution
  const textAdsData = campaignBreakdown?.adFormats?.textAds || { conversions: 0, impressions: 0, conversionRate: 0 };
  const responsiveDisplayData = campaignBreakdown?.adFormats?.responsiveDisplay || { conversions: 0, impressions: 0, conversionRate: 0 };
  const videoAdsData = campaignBreakdown?.adFormats?.videoAds || { conversions: 0, impressions: 0, conversionRate: 0 };
  
  // Calculate cost per lead: distribute total cost proportionally based on conversions
  const totalAdFormatConversions = textAdsData.conversions + responsiveDisplayData.conversions + videoAdsData.conversions;
  const textAdsCostPerLead = textAdsData.conversions > 0 && totalAdFormatConversions > 0 
    ? (allCampaignTypesCost * (textAdsData.conversions / totalAdFormatConversions)) / textAdsData.conversions 
    : 0;
  const responsiveDisplayCostPerLead = responsiveDisplayData.conversions > 0 && totalAdFormatConversions > 0
    ? (allCampaignTypesCost * (responsiveDisplayData.conversions / totalAdFormatConversions)) / responsiveDisplayData.conversions
    : 0;
  const videoAdsCostPerLead = videoAdsData.conversions > 0 && totalAdFormatConversions > 0
    ? (allCampaignTypesCost * (videoAdsData.conversions / totalAdFormatConversions)) / videoAdsData.conversions
    : 0;
  
  const adFormatsData = [
    {
      name: 'Text Ads',
      impressions: textAdsData.impressions || 0,
      conversions: textAdsData.conversions || 0,
      conversionRate: textAdsData.conversionRate || 0,
      costPerLead: textAdsCostPerLead
    },
    {
      name: 'Responsive Display',
      impressions: responsiveDisplayData.impressions || 0,
      conversions: responsiveDisplayData.conversions || 0,
      conversionRate: responsiveDisplayData.conversionRate || 0,
      costPerLead: responsiveDisplayCostPerLead
    },
    {
      name: 'Video Ads',
      impressions: videoAdsData.impressions || 0,
      conversions: videoAdsData.conversions || 0,
      conversionRate: videoAdsData.conversionRate || 0,
      costPerLead: videoAdsCostPerLead
    }
  ];

  // Check if we have breakdown data
  // Always show chart if the structure exists, even if values are 0
  const hasCampaignTypesData = !!campaignBreakdown?.campaignTypes;
  // Check if adFormats exists - the service always returns adFormats object, so check if campaignBreakdown exists
  // Show chart even if all values are 0 - the structure is what matters
  const hasAdFormatData = !!campaignBreakdown?.adFormats;
  
  // Debug: Log the check result
  React.useEffect(() => {
    if (campaignBreakdown) {
      console.log('🔍 [GoogleAdsCampaignBreakdown] Data check:', {
        hasAdFormatData,
        hasCampaignTypesData,
        isLoadingAdFormats,
        isLoading,
        loadingTimeout,
        adFormatsExists: !!campaignBreakdown?.adFormats,
        adFormatsDataLength: adFormatsData.length
      });
    }
  }, [hasAdFormatData, hasCampaignTypesData, isLoadingAdFormats, isLoading, loadingTimeout, campaignBreakdown, adFormatsData.length]);
  
  // Show empty state if we've timed out or if breakdown is explicitly missing
  const shouldShowEmptyState = !isLoading || loadingTimeout || (!hasBreakdown && !isLoading);


  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 w-full col-span-2">
      {/* Campaign Types Card - Pie Chart */}
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
            <div className="h-64 p-4">
              <div className="space-y-6">
                {/* Spend Distribution */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">Spend Distribution</h4>
                    <span className="text-xs text-slate-500">${totalSpend.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                    {searchSpendPercent > 0 && (
                      <div 
                        className="bg-blue-600 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" 
                        style={{ width: `${searchSpendPercent}%` }}
                      >
                        {searchSpendPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Search ({searchSpendPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {performanceMaxSpendPercent > 0 && (
                      <div 
                        className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" 
                        style={{ 
                          width: `${performanceMaxSpendPercent}%`, 
                          left: `${searchSpendPercent}%`,
                          borderRadius: searchSpendPercent === 0 ? '0.5rem' : '0 0.5rem 0.5rem 0'
                        }}
                      >
                        {performanceMaxSpendPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Performance Max ({performanceMaxSpendPercent.toFixed(1)}%)
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
                    <span className="text-xs text-slate-500">{totalConversions.toLocaleString()} conversions</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                    {searchConversionsPercent > 0 && (
                      <div 
                        className="bg-blue-600 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" 
                        style={{ width: `${searchConversionsPercent}%` }}
                      >
                        {searchConversionsPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Search ({searchConversionsPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {performanceMaxConversionsPercent > 0 && (
                      <div 
                        className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" 
                        style={{ 
                          width: `${performanceMaxConversionsPercent}%`, 
                          left: `${searchConversionsPercent}%`,
                          borderRadius: searchConversionsPercent === 0 ? '0.5rem' : '0 0.5rem 0.5rem 0'
                        }}
                      >
                        {performanceMaxConversionsPercent > 20 && (
                          <span className="text-xs font-normal text-white">
                            Performance Max ({performanceMaxConversionsPercent.toFixed(1)}%)
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
              {shouldShowEmptyState ? 'No campaign type data available for this period' : 'Loading campaign type breakdown data...'}
            </div>
          )}
        </div>
      </Card>

      {/* Ad Formats Card */}
      <Card className="h-full flex flex-col">
        <div className="pb-2 min-h-[50px]">
          <h3 className="text-lg font-semibold text-slate-900">Ad Formats</h3>
          {!hasAdFormatData && !isLoadingAdFormats && (
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
            <div className="h-72 p-1">
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
                      if (name === 'impressions') {
                        return [
                          `${value.toLocaleString()}\nConversion Rate: ${(payload.conversionRate || 0).toFixed(2)}%\nCost/Lead: $${(payload.costPerLead || 0).toFixed(2)}`,
                          'Impressions'
                        ];
                      } else if (name === 'conversions') {
                        return [
                          `${value.toLocaleString()}\nConversion Rate: ${(payload.conversionRate || 0).toFixed(2)}%\nCost/Lead: $${(payload.costPerLead || 0).toFixed(2)}`,
                          'Conversions'
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
              {shouldShowEmptyState ? 'No ad format data available for this period' : 'Loading ad format breakdown data...'}                                    
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
