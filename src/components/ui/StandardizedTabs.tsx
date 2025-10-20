import { LogoManager } from '@/components/ui/LogoManager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs-simple';
import { BarChart3, Users } from 'lucide-react';
import React from 'react';

interface TabItem {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  platform?: 'meta' | 'googleAds';
}

interface StandardizedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: TabItem[];
  className?: string;
}

export const StandardizedTabs: React.FC<StandardizedTabsProps> = ({
  value,
  onValueChange,
  tabs,
  className = ""
}) => {
  const renderIcon = (tab: TabItem) => {
    if (tab.icon) {
      return tab.icon;
    }
    
    if (tab.platform) {
      return <LogoManager platform={tab.platform} size={20} context="header" />;
    }
    
    // Default icons based on common tab values
    switch (tab.value) {
      case 'summary':
        return <BarChart3 size={14} />;
      case 'leads':
        return <Users size={14} />;
      default:
        return null;
    }
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className={`w-full ${className}`}>
      <TabsList className="w-full bg-slate-50 border border-slate-200 rounded-lg p-0.5 h-10 inline-flex gap-0.5">
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.value}
            value={tab.value} 
            className="text-sm font-medium px-3 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:border data-[state=active]:border-slate-200 text-slate-600 transition-all duration-200 flex items-center justify-center gap-1.5 flex-1"
          >
            {renderIcon(tab)}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.shortLabel || tab.label.charAt(0)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

// Predefined tab configurations for common use cases
export const DASHBOARD_TABS: TabItem[] = [
  {
    value: 'summary',
    label: 'Summary',
    shortLabel: 'S',
    icon: <BarChart3 size={14} />
  },
  {
    value: 'meta',
    label: 'Meta',
    shortLabel: 'M',
    platform: 'meta'
  },
  {
    value: 'google',
    label: 'Google',
    shortLabel: 'G',
    platform: 'googleAds'
  },
  {
    value: 'leads',
    label: 'Lead Info',
    shortLabel: 'L',
    icon: <Users size={14} />
  }
];

export const REPORTING_TABS: TabItem[] = [
  {
    value: 'meta',
    label: 'Meta Ads',
    platform: 'meta'
  },
  {
    value: 'google',
    label: 'Google Ads',
    platform: 'googleAds'
  },
  {
    value: 'combination',
    label: 'Combined'
  }
];

export const AGENCY_TABS: TabItem[] = [
  {
    value: 'clients',
    label: 'Venue Management',
    shortLabel: 'V',
    icon: <Users size={16} />
  },
  {
    value: 'integrations',
    label: 'Service Integrations',
    shortLabel: 'I',
    icon: <div className="h-4 w-4 flex items-center justify-center">⚙️</div>
  },
  {
    value: 'ai-insights',
    label: 'AI Insights',
    shortLabel: 'A',
    icon: <div className="h-4 w-4 flex items-center justify-center">🤖</div>
  }
];
