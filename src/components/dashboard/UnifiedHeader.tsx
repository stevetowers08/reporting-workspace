import { LogoManager } from '@/components/ui/LogoManager';
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
    <header className="bg-slate-800 text-white border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-full mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBackToDashboard}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Clients
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Internal Dashboard</h1>
                <p className="text-xs text-slate-400">Agency View</p>
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
                     className="border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 bg-white/10"
                   >
                     <FileDown className="h-4 w-4 mr-2" />
                     {exportingPDF ? 'Exporting...' : 'Export'}
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={onShare}
                     className="border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 bg-white/10"
                   >
                     <Share2 className="h-4 w-4 mr-2" />
                     Share Link
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={onGoToAgency}
                     className="border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-400 bg-blue-500/20"
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
  visibleTabs?: {
    summary: boolean;
    meta: boolean;
    google: boolean;
    leads: boolean;
  };
  className?: string;
}

export const ClientFacingHeader: React.FC<ClientFacingHeaderProps> = ({
  clientData,
  selectedPeriod,
  onPeriodChange,
  activeTab,
  onTabChange,
  visibleTabs = {
    summary: true,
    meta: true,
    google: true,
    leads: true,
  },
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
    let startDate: Date;
    
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
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return `${formatDate(lastMonth)} - ${formatDate(lastMonthEnd)}`;
      }
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
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
    <header className={`bg-white border-b border-slate-200 px-20 sticky top-[73px] z-[60] ${className}`}>
      <div className="py-3">
        <div className="flex items-center justify-between">
          {/* Left: Client Branding with Date Range Text */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {clientData?.logo_url ? (
                <img
                  src={clientData.logo_url}
                  alt={`${clientData.name} logo`}
                  className="w-6 h-6 object-cover rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {clientData?.name || 'Dashboard'}
                </h2>
                <p className="text-xs text-slate-600">
                  {getDateRange(selectedPeriod)}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Minimal Tabs */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="flex items-center justify-center space-x-8">
              {visibleTabs.summary && (
                <button
                  onClick={() => onTabChange('summary')}
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 pb-2 border-b-2 px-1 ${
                    activeTab === 'summary'
                      ? 'text-slate-500 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <BarChart3 size={16} />
                  Summary
                </button>
              )}
              {visibleTabs.meta && (
                <button
                  onClick={() => onTabChange('meta')}
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 pb-2 border-b-2 px-1 ${
                    activeTab === 'meta'
                      ? 'text-slate-500 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <LogoManager platform="meta" size={16} context="header" />
                  Meta
                </button>
              )}
              {visibleTabs.google && (
                <button
                  onClick={() => onTabChange('google')}
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 pb-2 border-b-2 px-1 ${
                    activeTab === 'google'
                      ? 'text-slate-500 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <LogoManager platform="googleAds" size={16} context="header" />
                  Google
                </button>
              )}
              {visibleTabs.leads && (
                <button
                  onClick={() => onTabChange('leads')}
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 pb-2 border-b-2 px-1 ${
                    activeTab === 'leads'
                      ? 'text-slate-500 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Users size={16} />
                  Lead Info
                </button>
              )}
            </div>
          </div>

          {/* Right: Period Selector Dropdown */}
          <div className="flex items-center">
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium w-40"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="lastMonth">Last month</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
