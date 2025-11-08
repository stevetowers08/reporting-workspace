import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import { FacebookAdsReportingTable } from '@/components/reporting/FacebookAdsReportingTable';
import { GoogleAdsReportingTable } from '@/components/reporting/GoogleAdsReportingTable';
import { UnifiedReportingTable } from '@/components/reporting/UnifiedReportingTable';
import { REPORTING_TABS, StandardizedTabs } from '@/components/ui/StandardizedTabs';
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
  const [googleLoading, setGoogleLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('meta');
  const [clients, setClients] = useState<Array<{id: string, name: string, logo_url?: string}>>([]);

  const periods = facebookAdsReportingService.getAvailablePeriods();

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setGoogleLoading(true);
      setReportingData([]); // Clear previous data
      setGoogleReportingData([]);
      
      // BEST PRACTICE: Load clients first (fast), then start progressive data loading
      try {
        await loadClients();
      } catch (error) {
        debugLogger.warn('FACEBOOK_REPORTING_PAGE', 'Clients fetch failed (non-critical)', error);
      }
      
      // BEST PRACTICE: Start progressive loading - data will stream in as it arrives
      // Don't wait for everything - show data as it loads
      const loadFacebookProgressive = async () => {
        try {
          setError(null);
          await facebookAdsReportingService.getFacebookAdsReportingDataProgressive(
            selectedPeriod,
            (clientData) => {
              // Update state as each client's data arrives
              setReportingData(prev => {
                // Avoid duplicates
                const exists = prev.find(d => d.clientId === clientData.clientId);
                if (exists) return prev;
                return [...prev, clientData];
              });
            }
          );
        } catch (err) {
          debugLogger.error('FACEBOOK_REPORTING_PAGE', 'Error in progressive Facebook loading', err);
          setError('Failed to load some Facebook Ads data. Some data may still be loading.');
        } finally {
          setLoading(false);
        }
      };
      
      const loadGoogleProgressive = async () => {
        try {
          setGoogleError(null);
          await googleAdsReportingService.getGoogleAdsReportingDataProgressive(
            selectedPeriod,
            (clientData) => {
              // Update state as each client's data arrives
              setGoogleReportingData(prev => {
                // Avoid duplicates
                const exists = prev.find(d => d.clientId === clientData.clientId);
                if (exists) return prev;
                return [...prev, clientData];
              });
            }
          );
        } catch (err) {
          debugLogger.error('FACEBOOK_REPORTING_PAGE', 'Error in progressive Google loading', err);
          setGoogleError('Failed to load some Google Ads data. Some data may still be loading.');
        } finally {
          setGoogleLoading(false);
        }
      };
      
      // Start both in parallel - they'll update state as data arrives
      loadFacebookProgressive();
      loadGoogleProgressive();
    };
    
    loadAllData();
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
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  const fetchReportingData = async () => {
    try {
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
    }
  };

  const fetchGoogleReportingData = async () => {
    try {
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
          <StandardizedTabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            tabs={REPORTING_TABS}
            className="w-auto"
          />

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
