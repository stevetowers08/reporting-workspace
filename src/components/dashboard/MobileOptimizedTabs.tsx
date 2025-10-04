import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Settings, Share2 } from 'lucide-react';
import React from 'react';

interface MobileOptimizedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  children: React.ReactNode;
}

export const MobileOptimizedTabs: React.FC<MobileOptimizedTabsProps> = ({
  activeTab,
  onTabChange,
  tabs,
  children
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      {/* Mobile-First Tab Navigation */}
      <div className="flex items-center justify-center">
        <TabsList className="w-full max-w-4xl bg-white rounded-lg p-0.5 h-10 border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.value}
              value={tab.value} 
              className="text-sm font-semibold px-3 py-2 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-1.5 border-r border-slate-200 last:border-r-0 h-full"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Content */}
      {children}
    </Tabs>
  );
};

// Mobile-optimized action buttons
interface MobileActionButtonsProps {
  onExportPDF: () => void;
  onShare: () => void;
  onSettings: () => void;
  exportingPDF: boolean;
  isShared?: boolean;
}

export const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  onExportPDF,
  onShare,
  onSettings,
  exportingPDF,
  isShared = false
}) => {
  if (isShared) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPDF}
        disabled={exportingPDF}
        className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 min-h-[44px]"
      >
        <FileDown className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">
          {exportingPDF ? 'Exporting...' : 'Export PDF'}
        </span>
        <span className="sm:hidden">
          {exportingPDF ? 'Exporting...' : 'Export'}
        </span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onShare}
        className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 min-h-[44px]"
      >
        <Share2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Share</span>
        <span className="sm:hidden">Share</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onSettings}
        className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 min-h-[44px]"
      >
        <Settings className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Settings</span>
        <span className="sm:hidden">Settings</span>
      </Button>
    </div>
  );
};
