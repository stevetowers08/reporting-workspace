import { AdminHeader } from '@/components/dashboard/AdminHeader';
import { FacebookAdsReportingTable } from '@/components/reporting/FacebookAdsReportingTable';
import { GoogleAdsReportingTable } from '@/components/reporting/GoogleAdsReportingTable';
import { LogoManager } from '@/components/ui/LogoManager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { debugLogger } from '@/lib/debug';
import { FacebookAdsReportingData, facebookAdsReportingService } from '@/services/data/facebookAdsReportingService';
import { GoogleAdsReportingData, googleAdsReportingService } from '@/services/data/googleAdsReportingService';
import { Calendar } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FacebookAdsReporting: React.FC = () => {
  const navigate = useNavigate();
  const [reportingData, setReportingData] = useState<FacebookAdsReportingData[]>([]);
  const [googleReportingData, setGoogleReportingData] = useState<GoogleAdsReportingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('meta');

  const periods = facebookAdsReportingService.getAvailablePeriods();

  useEffect(() => {
    fetchReportingData();
    fetchGoogleReportingData();
  }, [selectedPeriod]);

  const fetchReportingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      debugLogger.info('FACEBOOK_REPORTING_PAGE', 'Fetching reporting data', { period: selectedPeriod });
      
      const response = await facebookAdsReportingService.getFacebookAdsReportingData(selectedPeriod);
      
      setReportingData(response.data);
      
      debugLogger.info('FACEBOOK_REPORTING_PAGE', 'Reporting data loaded successfully', {
        totalClients: response.totalClients,
        activeAccounts: response.activeAccounts
      });
    } catch (err) {
      debugLogger.error('FACEBOOK_REPORTING_PAGE', 'Error fetching reporting data', err);
      setError('Failed to load Facebook Ads reporting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleReportingData = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      
      debugLogger.info('GOOGLE_REPORTING_PAGE', 'Fetching Google reporting data', { period: selectedPeriod });
      
      const response = await googleAdsReportingService.getGoogleAdsReportingData(selectedPeriod);
      
      setGoogleReportingData(response.data);
      
      debugLogger.info('GOOGLE_REPORTING_PAGE', 'Google reporting data loaded successfully', {
        totalClients: response.totalClients,
        activeAccounts: response.activeAccounts
      });
    } catch (err) {
      debugLogger.error('GOOGLE_REPORTING_PAGE', 'Error fetching Google reporting data', err);
      setGoogleError('Failed to load Google Ads reporting data. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  const handleExportPDF = () => {
    debugLogger.info('FACEBOOK_REPORTING_PAGE', 'PDF export requested');
  };

  const handleShare = () => {
    debugLogger.info('FACEBOOK_REPORTING_PAGE', 'Share requested');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Admin Header */}
      <AdminHeader
        clients={[]}
        selectedClientId={undefined}
        onClientSelect={() => {}}
        onBackToDashboard={handleBackToDashboard}
        onGoToAdmin={handleGoToAdmin}
        onExportPDF={handleExportPDF}
        onShare={handleShare}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={false}
        isAdminPanel={false}
      />

      <div className="px-20 py-6">
        {/* Tabs and Period Selector */}
        <div className="mb-6 flex items-center justify-between">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-0.5 h-10 inline-flex gap-0.5">
              <TabsTrigger 
                value="meta" 
                className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <LogoManager platform="meta" size={20} context="header" />
                <span>Meta Ads</span>
              </TabsTrigger>
              <TabsTrigger 
                value="google" 
                className="text-sm font-medium px-4 py-2 rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <LogoManager platform="googleAds" size={20} context="header" />
                <span>Google Ads</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'meta' && (
          <FacebookAdsReportingTable
            data={reportingData}
            loading={loading}
            error={error || undefined}
          />
        )}
        
        {activeTab === 'google' && (
          <GoogleAdsReportingTable
            data={googleReportingData}
            loading={googleLoading}
            error={googleError}
          />
        )}
      </div>
    </div>
  );
};

export default FacebookAdsReporting;
