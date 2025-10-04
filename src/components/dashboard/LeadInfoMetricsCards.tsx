import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface LeadInfoMetricsCardsProps {
  data: EventDashboardData | null | undefined;
}

export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = ({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('LeadInfoMetricsCards: Starting to fetch lead data...');
        const data = await LeadDataService.fetchLeadData();
        console.log('LeadInfoMetricsCards: Received data:', data);
        setLeadData(data);
      } catch (error) {
        console.error('Failed to fetch lead data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTestAPI = async () => {
    console.log('Testing Google Sheets API...');
    try {
      const result = await LeadDataService.fetchLeadData();
      console.log('API Test Result:', result);
      if (result) {
        alert(`API Test Success! Found ${result.totalLeads} leads via local proxy server`);
      } else {
        alert('API Test Failed: No data returned');
      }
    } catch (error) {
      console.error('API Test Error:', error);
      alert(`API Test Error: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm p-5 h-24">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
        <div className="col-span-4 flex justify-center mt-4">
          <button 
            onClick={handleTestAPI}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Local Proxy Server
          </button>
        </div>
      </div>
    );
  }

  if (!leadData) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="text-center text-slate-500">Failed to load data</div>
        </Card>
      </div>
    );
  }

  // Calculate metrics from GoHighLevel data
  const landingPageViews = data?.ghlMetrics?.totalContacts || 0;
  const conversionRate = landingPageViews > 0 ? (leadData.totalLeads / landingPageViews) * 100 : 0;

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Landing Page Views</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{landingPageViews.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-blue-600 font-medium">GHL</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Leads</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{leadData.totalLeads.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600 font-medium">{conversionRate.toFixed(1)}% conv</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Guests</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{leadData.totalGuests.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">{leadData.averageGuestsPerLead.toFixed(1)} avg per lead</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Top Source</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-600">
                {leadData.facebookLeads > leadData.googleLeads ? 'FB' : 'GG'}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">
                  {leadData.facebookLeads > leadData.googleLeads 
                    ? `${leadData.facebookLeads} leads` 
                    : `${leadData.googleLeads} leads`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};