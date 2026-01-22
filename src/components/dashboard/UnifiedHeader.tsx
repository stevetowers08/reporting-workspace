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
                src="/logos/tulen-favicon-192x192.png"
                alt="Tulen Agency logo"
                className="h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p className="text-xs text-slate-400">Internal Dashboard</p>
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
  isDateLocked?: boolean; // When true, hide date selector (for lastMonth share links)
}

export const ClientFacingHeader: React.FC<ClientFacingHeaderProps> = ({
  clientData,
  selectedPeriod,
  onPeriodChange,
  activeTab,
  onTabChange,
  tabSettings,
  className = '',
  isDateLocked = false
}) => {
  // Get the month name for locked date display
  const getLockedMonthLabel = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
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
    <header className={`bg-white border-b border-slate-200/60 shadow-sm sticky top-0 z-40 ${className}`}>
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-4 md:py-5">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 md:hidden">
          {/* Top Row: Logo and Venue/Date (Top Right) */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <img
                src="/logos/tulen-favicon-192x192.png"
                alt="Tulen Agency"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {/* Venue Logo and Date - Top Right */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              {clientData?.logo_url ? (
                <img
                  src={clientData.logo_url}
                  alt={`${clientData.name} logo`}
                  className="w-7 h-7 flex-shrink-0 object-cover rounded-lg border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className="flex flex-col items-end min-w-0">
                <h2 className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px] sm:max-w-[150px]">
                  {clientData?.name || 'Dashboard'}
                </h2>
                <p className="text-[10px] text-slate-500 leading-tight whitespace-nowrap">
                  {getDateRange(selectedPeriod)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Tabs Row */}
          <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <StandardizedTabs 
              value={activeTab} 
              onValueChange={onTabChange} 
              tabs={DASHBOARD_TABS.filter(tab => {
                if (!tabSettings) return true;
                const tabValue = tab.value;
                if (tabValue === 'summary') {
                  const metaEnabled = tabSettings.meta !== false;
                  const googleEnabled = tabSettings.google !== false;
                  return metaEnabled || googleEnabled;
                }
                return tabSettings[tabValue as keyof typeof tabSettings] !== false;
              })}
            />
          </div>
          
          {/* Date Selector Row - Below Tabs */}
          <div className="flex justify-center w-full">
            {isDateLocked ? (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 w-full max-w-[200px] shadow-sm text-center">
                {getLockedMonthLabel()} Report
              </div>
            ) : (
              <select
                value={selectedPeriod}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-900 w-full max-w-[200px] shadow-sm appearance-none cursor-pointer"
                style={{ color: '#0f172a' }}
              >
                <option value="7d" style={{ color: '#0f172a' }}>Last 7 days</option>
                <option value="14d" style={{ color: '#0f172a' }}>Last 14 days</option>
                <option value="30d" style={{ color: '#0f172a' }}>Last 30 days</option>
                <option value="lastMonth" style={{ color: '#0f172a' }}>Last month</option>
                <option value="90d" style={{ color: '#0f172a' }}>Last 90 days</option>
                <option value="3m" style={{ color: '#0f172a' }}>Last 3 months</option>
                <option value="1y" style={{ color: '#0f172a' }}>Last year</option>
              </select>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          {/* Left: Tulen Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src="/logos/tulen-favicon-192x192.png"
              alt="Tulen Agency"
              className="h-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Center: Tabs - Full width */}
          <div className="flex-1 mx-4 lg:mx-8">
            <StandardizedTabs 
              value={activeTab} 
              onValueChange={onTabChange} 
              tabs={DASHBOARD_TABS.filter(tab => {
                if (!tabSettings) return true;
                const tabValue = tab.value;
                if (tabValue === 'summary') {
                  const metaEnabled = tabSettings.meta !== false;
                  const googleEnabled = tabSettings.google !== false;
                  return metaEnabled || googleEnabled;
                }
                return tabSettings[tabValue as keyof typeof tabSettings] !== false;
              })}
            />
          </div>

          {/* Right: Period Selector and Client Branding */}
          <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0 ml-auto">
            <div className="flex flex-col gap-1">
              {isDateLocked ? (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 w-28 lg:w-36 shadow-sm text-center">
                  {getLockedMonthLabel()} Report
                </div>
              ) : (
                <select
                  value={selectedPeriod}
                  onChange={(e) => onPeriodChange(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-900 hover:border-slate-400 transition-colors w-28 lg:w-32 shadow-sm appearance-none cursor-pointer"
                  style={{ color: '#0f172a' }}
                >
                  <option value="7d" style={{ color: '#0f172a' }}>Last 7 days</option>
                  <option value="14d" style={{ color: '#0f172a' }}>Last 14 days</option>
                  <option value="30d" style={{ color: '#0f172a' }}>Last 30 days</option>
                  <option value="lastMonth" style={{ color: '#0f172a' }}>Last month</option>
                  <option value="90d" style={{ color: '#0f172a' }}>Last 90 days</option>
                  <option value="3m" style={{ color: '#0f172a' }}>Last 3 months</option>
                  <option value="1y" style={{ color: '#0f172a' }}>Last year</option>
                </select>
              )}
            </div>
            
            {/* Client Branding */}
            <div className="flex items-center gap-2 lg:gap-3 pl-3 lg:pl-4 border-l border-slate-200">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 lg:gap-2.5">
                  {clientData?.logo_url ? (
                    <img
                      src={clientData.logo_url}
                      alt={`${clientData.name} logo`}
                      className="w-9 h-9 lg:w-11 lg:h-11 object-cover rounded-lg border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 lg:w-11 lg:h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                      <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <h2 className="text-sm lg:text-base font-semibold text-slate-900 leading-tight whitespace-nowrap">
                      {clientData?.name || 'Dashboard'}
                    </h2>
                    <p className="text-xs text-slate-500 leading-tight whitespace-nowrap">
                      {getDateRange(selectedPeriod)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
