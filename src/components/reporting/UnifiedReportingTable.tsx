import { LoadingState } from '@/components/ui/LoadingStates';
import { LogoManager } from '@/components/ui/LogoManager';
import { FacebookAdsReportingData } from '@/services/data/facebookAdsReportingService';
import { GoogleAdsReportingData } from '@/services/data/googleAdsReportingService';
import { BarChart3 } from 'lucide-react';
import React from 'react';
import { MetricTableCell } from './MetricTableCell';

interface UnifiedReportingTableProps {
  facebookData: FacebookAdsReportingData[];
  googleData: GoogleAdsReportingData[];
  loading: boolean;
  error: string | null;
}

interface VenueRowData {
  venueName: string;
  logoUrl?: string;
  platforms: {
    facebook?: {
      leads: number;
      costPerLead: number;
      conversionRate: number;
      spent: number;
      impressions: number;
      clicks: number;
      costPerClick: number;
      ctr: number;
      trends?: {
        leads: { direction: 'up' | 'down'; percentage: number };
        costPerLead: { direction: 'up' | 'down'; percentage: number };
        conversionRate: { direction: 'up' | 'down'; percentage: number };
        spent: { direction: 'up' | 'down'; percentage: number };
        impressions: { direction: 'up' | 'down'; percentage: number };
        clicks: { direction: 'up' | 'down'; percentage: number };
        costPerClick: { direction: 'up' | 'down'; percentage: number };
        ctr: { direction: 'up' | 'down'; percentage: number };
      };
    };
    google?: {
      leads: number;
      costPerLead: number;
      conversionRate: number;
      spent: number;
      impressions: number;
      clicks: number;
      costPerClick: number;
      ctr: number;
      trends?: {
        leads: { direction: 'up' | 'down'; percentage: number };
        costPerLead: { direction: 'up' | 'down'; percentage: number };
        conversionRate: { direction: 'up' | 'down'; percentage: number };
        spent: { direction: 'up' | 'down'; percentage: number };
        impressions: { direction: 'up' | 'down'; percentage: number };
        clicks: { direction: 'up' | 'down'; percentage: number };
        costPerClick: { direction: 'up' | 'down'; percentage: number };
        ctr: { direction: 'up' | 'down'; percentage: number };
      };
    };
    combined?: {
      leads: number;
      costPerLead: number;
      conversionRate: number;
      spent: number;
      impressions: number;
      clicks: number;
      costPerClick: number;
      ctr: number;
    };
  };
}

export const UnifiedReportingTable: React.FC<UnifiedReportingTableProps> = ({
  facebookData,
  googleData,
  loading,
  error
}) => {
  // Combine data by venue
  const venueData: VenueRowData[] = React.useMemo(() => {
    const venueMap = new Map<string, VenueRowData>();

    // Add Facebook data
    facebookData.forEach(venue => {
      if (!venueMap.has(venue.venueName)) {
        venueMap.set(venue.venueName, {
          venueName: venue.venueName,
          logoUrl: venue.logoUrl,
          platforms: {}
        });
      }
      venueMap.get(venue.venueName)!.platforms.facebook = {
        ...venue.metrics,
        trends: venue.trends
      };
    });

    // Add Google data
    googleData.forEach(venue => {
      if (!venueMap.has(venue.venueName)) {
        venueMap.set(venue.venueName, {
          venueName: venue.venueName,
          logoUrl: venue.logoUrl,
          platforms: {}
        });
      }
      venueMap.get(venue.venueName)!.platforms.google = {
        ...venue.metrics,
        trends: venue.trends
      };
    });

    // Calculate combined metrics
    venueMap.forEach(venue => {
      const facebook = venue.platforms.facebook;
      const google = venue.platforms.google;
      
      if (facebook || google) {
        venue.platforms.combined = {
          leads: (facebook?.leads || 0) + (google?.leads || 0),
          spent: (facebook?.spent || 0) + (google?.spent || 0),
          impressions: (facebook?.impressions || 0) + (google?.impressions || 0),
          clicks: (facebook?.clicks || 0) + (google?.clicks || 0),
          costPerLead: 0,
          conversionRate: 0,
          costPerClick: 0,
          ctr: 0
        };

        // Calculate derived metrics
        if (venue.platforms.combined.leads > 0) {
          venue.platforms.combined.costPerLead = venue.platforms.combined.spent / venue.platforms.combined.leads;
        }
        if (venue.platforms.combined.clicks > 0) {
          venue.platforms.combined.conversionRate = (venue.platforms.combined.leads / venue.platforms.combined.clicks) * 100;
          venue.platforms.combined.costPerClick = venue.platforms.combined.spent / venue.platforms.combined.clicks;
        }
        if (venue.platforms.combined.impressions > 0) {
          venue.platforms.combined.ctr = (venue.platforms.combined.clicks / venue.platforms.combined.impressions) * 100;
        }
      }
    });

    return Array.from(venueMap.values()).sort((a, b) => a.venueName.localeCompare(b.venueName));
  }, [facebookData, googleData]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <LoadingState message="Loading combined reporting data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 shadow-sm rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <BarChart3 className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Data</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!venueData || venueData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            <BarChart3 className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No venues with advertising data found. Add Facebook Ads or Google Ads integration to venues to see reporting data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
           <table className="w-full border-collapse">
             <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Venue / Platform</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Leads</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Cost Per Lead</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Conversion Rate</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Spent</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Impressions</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Clicks</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700 border-r border-slate-200">Cost Per Click</th>
                 <th className="text-left py-2 px-2 text-xs font-medium text-slate-700">CTR</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
              {venueData.map((venue) => (
                <React.Fragment key={venue.venueName}>
                  {/* Venue Header Row */}
                  <tr className="bg-slate-100 hover:bg-slate-200 transition-colors">
                    <td className="px-2 py-2 border-l-4 border-blue-500 border-r border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">{venue.venueName}</span>
                      </div>
                    </td>
                    <td colSpan={8} className="px-2 py-2 border-r border-slate-200">
                      <span className="text-xs text-slate-600 font-medium">VENUE SUMMARY</span>
                    </td>
                  </tr>

                  {/* Facebook Ads Row */}
                  {venue.platforms.facebook && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 pl-6 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <LogoManager platform="meta" size={16} context="header" />
                          <span className="text-sm font-medium text-slate-700">Facebook Ads</span>
                        </div>
                      </td>
                       <MetricTableCell
                         label="Leads"
                         value={venue.platforms.facebook.leads}
                         trend={venue.platforms.facebook.trends?.leads}
                         format="number"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Cost Per Lead"
                         value={venue.platforms.facebook.costPerLead}
                         trend={venue.platforms.facebook.trends?.costPerLead}
                         format="currency"
                         colorCode={true}
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Conversion Rate"
                         value={venue.platforms.facebook.conversionRate}
                         trend={venue.platforms.facebook.trends?.conversionRate}
                         format="percentage"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Spent"
                         value={venue.platforms.facebook.spent}
                         trend={venue.platforms.facebook.trends?.spent}
                         format="currency"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Impressions"
                         value={venue.platforms.facebook.impressions}
                         trend={venue.platforms.facebook.trends?.impressions}
                         format="number"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Clicks"
                         value={venue.platforms.facebook.clicks}
                         trend={venue.platforms.facebook.trends?.clicks}
                         format="number"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="Cost Per Click"
                         value={venue.platforms.facebook.costPerClick}
                         trend={venue.platforms.facebook.trends?.costPerClick}
                         format="currency"
                         className="border-r border-slate-200"
                       />
                       <MetricTableCell
                         label="CTR"
                         value={venue.platforms.facebook.ctr}
                         trend={venue.platforms.facebook.trends?.ctr}
                         format="percentage"
                       />
                    </tr>
                  )}

                  {/* Google Ads Row */}
                  {venue.platforms.google && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 pl-6 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <LogoManager platform="googleAds" size={16} context="header" />
                          <span className="text-sm font-medium text-slate-700">Google Ads</span>
                        </div>
                      </td>
                      <MetricTableCell
                        label="Leads"
                        value={venue.platforms.google.leads}
                        trend={venue.platforms.google.trends?.leads}
                        format="number"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Cost Per Lead"
                        value={venue.platforms.google.costPerLead}
                        trend={venue.platforms.google.trends?.costPerLead}
                        format="currency"
                        colorCode={true}
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Conversion Rate"
                        value={venue.platforms.google.conversionRate}
                        trend={venue.platforms.google.trends?.conversionRate}
                        format="percentage"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Spent"
                        value={venue.platforms.google.spent}
                        trend={venue.platforms.google.trends?.spent}
                        format="currency"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Impressions"
                        value={venue.platforms.google.impressions}
                        trend={venue.platforms.google.trends?.impressions}
                        format="number"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Clicks"
                        value={venue.platforms.google.clicks}
                        trend={venue.platforms.google.trends?.clicks}
                        format="number"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Cost Per Click"
                        value={venue.platforms.google.costPerClick}
                        trend={venue.platforms.google.trends?.costPerClick}
                        format="currency"
                        className="border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="CTR"
                        value={venue.platforms.google.ctr}
                        trend={venue.platforms.google.trends?.ctr}
                        format="percentage"
                      />
                    </tr>
                  )}

                  {/* Combined Row */}
                  {venue.platforms.combined && (
                    <tr className="hover:bg-slate-50 transition-colors bg-blue-50/30">
                      <td className="px-4 py-2 pl-6 border-l-2 border-blue-300 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-700">Combined Total</span>
                        </div>
                      </td>
                      <MetricTableCell
                        label="Leads"
                        value={venue.platforms.combined.leads}
                        format="number"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Cost Per Lead"
                        value={venue.platforms.combined.costPerLead}
                        format="currency"
                        colorCode={true}
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Conversion Rate"
                        value={venue.platforms.combined.conversionRate}
                        format="percentage"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Spent"
                        value={venue.platforms.combined.spent}
                        format="currency"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Impressions"
                        value={venue.platforms.combined.impressions}
                        format="number"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Clicks"
                        value={venue.platforms.combined.clicks}
                        format="number"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="Cost Per Click"
                        value={venue.platforms.combined.costPerClick}
                        format="currency"
                        className="font-semibold text-blue-900 border-r border-slate-200"
                      />
                      <MetricTableCell
                        label="CTR"
                        value={venue.platforms.combined.ctr}
                        format="percentage"
                        className="font-semibold text-blue-900"
                      />
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
};
