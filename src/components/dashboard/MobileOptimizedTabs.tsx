import { Button } from '@/components/ui/button';
import { StandardizedTabs } from '@/components/ui/StandardizedTabs';
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
    <div className="space-y-6">
      {/* Mobile-First Tab Navigation */}
      <div className="flex items-center justify-center">
        <StandardizedTabs 
          value={activeTab} 
          onValueChange={onTabChange} 
          tabs={tabs}
          className="w-full max-w-4xl"
        />
      </div>

      {/* Tab Content */}
      {children}
    </div>
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
  if (isShared) {return null;}

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
