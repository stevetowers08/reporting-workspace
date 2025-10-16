import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import { FacebookAdsReportingTable } from '@/components/reporting/FacebookAdsReportingTable';
import { GoogleAdsReportingTable } from '@/components/reporting/GoogleAdsReportingTable';
import { UnifiedReportingTable } from '@/components/reporting/UnifiedReportingTable';
import { LogoManager } from '@/components/ui/LogoManager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
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
  const [clients, setClients] = useState<Array<{id: string, name: string, logo_url?: string}>>([]);

  const periods = facebookAdsReportingService.getAvailablePeriods();

  useEffect(() => {
    fetchReportingData();
    fetchGoogleReportingData();
    loadClients();
  }, [selectedPeriod]);

  const loadClients = async () => {
    try {
      const allClients = await DatabaseService.getAllClients();
      setClients(allClients.map(client => ({
        id: client.id,
        name: client.name,
        logo_url: client.logo_url
      })));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

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

  const handleGoToAgency = () => {
    navigate('/agency');
  };

  const handleExportPDF = () => {
    debugLogger.info('FACEBOOK_REPORTING_PAGE', 'PDF export requested');
  };

  const handleShare = () => {
    debugLogger.info('FACEBOOK_REPORTING_PAGE', 'Share requested');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Agency Header */}
      <AgencyHeader
        clients={clients}
        selectedClientId={undefined}
        onClientSelect={handleClientSelect}
        onBackToDashboard={handleBackToDashboard}
        onGoToAgency={handleGoToAgency}
        onExportPDF={handleExportPDF}
        onShare={handleShare}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={true}
        isAgencyPanel={false}
      />

      <div className="px-6 py-6">
        {/* Tabs and Period Selector */}
        <div className="mb-8 flex items-center justify-between">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1 h-12 inline-flex gap-1">
              <TabsTrigger 
                value="meta" 
                className="text-sm font-medium px-6 py-3 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogoManager platform="meta" size={20} context="header" />
                <span>Meta Ads</span>
              </TabsTrigger>
              <TabsTrigger 
                value="google" 
                className="text-sm font-medium px-6 py-3 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogoManager platform="googleAds" size={20} context="header" />
                <span>Google Ads</span>
              </TabsTrigger>
              <TabsTrigger 
                value="combination" 
                className="text-sm font-medium px-6 py-3 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Combined</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-400 transition-colors"
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
            error={error}
          />
        )}
        
        {activeTab === 'google' && (
          <GoogleAdsReportingTable
            data={googleReportingData}
            loading={googleLoading}
            error={googleError}
          />
        )}
        
        {activeTab === 'combination' && (
          <UnifiedReportingTable
            facebookData={reportingData}
            googleData={googleReportingData}
            loading={loading || googleLoading}
            error={error || googleError}
          />
        )}
      </div>
    </div>
  );
};

export default FacebookAdsReporting;
