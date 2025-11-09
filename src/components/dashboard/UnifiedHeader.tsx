import { DASHBOARD_TABS, StandardizedTabs } from '@/components/ui/StandardizedTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-simple';
import { ArrowLeft, BarChart3, FileDown, Settings, Share2, Users } from 'lucide-react';
import React from 'react';

interface InternalAgencyHeaderProps {
  clientData?: {
    name: string;
    logo_url?: string;
  };
  onBackToDashboard: () => void;
  onGoToAgency: () => void;
  onExportPDF: () => void;
  onShare: () => void;
  onSettings: () => void;
  exportingPDF: boolean;
  isShared?: boolean;
}

export const InternalAgencyHeader: React.FC<InternalAgencyHeaderProps> = ({
  clientData,
  onBackToDashboard,
  onGoToAgency,
  onExportPDF,
  onShare,
  exportingPDF,
  isShared = false
}) => {
  if (isShared) {return null;} // Don't show internal header for shared views

  return (
    <header className="bg-slate-800 text-white border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBackToDashboard}
              className="border-slate-600 text-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Clients
            </Button>
            
            <div className="flex items-center gap-2">
              <img
                src="/logos/tulen-favicon-32x32.png"
                alt="Tulen Agency logo"
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="text-sm font-semibold text-white">Tulen Agency</h1>
                <p className="text-xs text-slate-400">Internal Dashboard</p>
              </div>
            </div>
          </div>

          {/* Center: Client Info */}
          <div className="flex items-center gap-3">
            {clientData?.logo_url ? (
              <img
                src={clientData.logo_url}
                alt={`${clientData.name} logo`}
                className="w-8 h-8 object-cover rounded-lg border border-slate-600"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-slate-400" />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-white">{clientData?.name || 'Client Dashboard'}</p>
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                Internal View
              </Badge>
            </div>
          </div>

          {/* Right: Agency Actions */}
          <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={onExportPDF}
                     disabled={exportingPDF}
                     className="border-white/30 text-white bg-white/10"
                   >
                     <FileDown className="h-4 w-4 mr-2" />
                     {exportingPDF ? 'Exporting...' : 'Export'}
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={onShare}
                     className="border-white/30 text-white bg-white/10"
                   >
                     <Share2 className="h-4 w-4 mr-2" />
                     Share Link
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={onGoToAgency}
                     className="border-blue-400 text-blue-200 bg-blue-500/20"
                   >
                     <Settings className="h-4 w-4 mr-2" />
                     Agency
                   </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

interface ClientFacingHeaderProps {
  clientData?: {
    name: string;
    logo_url?: string;
  };
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabSettings?: {
    summary?: boolean;
    meta?: boolean;
    google?: boolean;
    leads?: boolean;
  };
  className?: string;
}

export const ClientFacingHeader: React.FC<ClientFacingHeaderProps> = ({
  clientData,
  selectedPeriod,
  onPeriodChange,
  activeTab,
  onTabChange,
  tabSettings,
  className = ''
}) => {
  // Helper function to get actual date range
  const getDateRange = (period: string) => {
    const formatDate = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                    day === 2 || day === 22 ? 'nd' : 
                    day === 3 || day === 23 ? 'rd' : 'th';
      return `${month} ${day}${suffix}`;
    };

    const now = new Date();
    let startDate: Date = new Date(now); // Initialize with current date
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '14d':
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'lastMonth': {
        // Last month: e.g., if today is Oct 10th, show Sep 1st to Sep 30th
        const startDate = new Date();
        const endDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        startDate.setDate(1);
        endDate.setDate(0); // Last day of previous month
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      }
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return `${formatDate(startDate)} - ${formatDate(now)}`;
  };

  return (
    <header className={`bg-white border-b border-slate-200 px-20 ${className}`}>
      <div className="py-6">
        <div className="flex items-center justify-between">
          {/* Left: Client Branding with Date Range Text */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {clientData?.logo_url ? (
                <img
                  src={clientData.logo_url}
                  alt={`${clientData.name} logo`}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {clientData?.name || 'Dashboard'}
                </h2>
                <p className="text-sm text-slate-600">
                  {getDateRange(selectedPeriod)}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Tabs */}
          <div className="flex-1 max-w-2xl mx-8">
            <StandardizedTabs 
              value={activeTab} 
              onValueChange={onTabChange} 
              tabs={DASHBOARD_TABS.filter(tab => {
                // Filter tabs based on tabSettings
                if (!tabSettings) return true; // Show all if no settings
                const tabValue = tab.value;
                // Auto-disable summary if both meta and google are disabled
                if (tabValue === 'summary') {
                  const metaEnabled = tabSettings.meta !== false;
                  const googleEnabled = tabSettings.google !== false;
                  return metaEnabled || googleEnabled;
                }
                return tabSettings[tabValue as keyof typeof tabSettings] !== false;
              })}
            />
          </div>

          {/* Right: Period Selector Dropdown */}
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium w-40"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="lastMonth">Last month</option>
              <option value="90d">Last 90 days</option>
              <option value="3m">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
            
            {/* Tulen Agency branding */}
            <div className="flex items-center gap-2 opacity-60">
              <img
                src="/logos/tulen-favicon-32x32.png"
                alt="Tulen Agency"
                className="w-6 h-6 object-contain"
              />
              <span className="text-xs text-slate-500 font-medium">Tulen Agency</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
