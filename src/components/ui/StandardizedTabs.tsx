import { LogoManager } from '@/components/ui/LogoManager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs-simple';
import { BarChart3, Users, FolderOpen } from 'lucide-react';
import React, { useRef } from 'react';

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
  const tabsListRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

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
      <TabsList 
        ref={tabsListRef}
        className="!h-auto sm:!h-11 bg-slate-50/80 backdrop-blur-sm border border-slate-200/80 rounded-xl sm:rounded-2xl !p-1.5 sm:!p-1 w-full flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-1 shadow-sm"
      >
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.value}
            ref={value === tab.value ? activeTabRef : undefined}
            value={tab.value} 
            className="!px-3 sm:!px-4 !py-2 sm:!py-2 rounded-lg sm:rounded-xl hover:bg-slate-100/50 transition-all duration-200 ease-in-out flex items-center justify-center gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 whitespace-nowrap flex-1 sm:flex-1 min-w-[calc(50%-6px)] sm:min-w-0"
            style={{ 
              color: value === tab.value ? '#0f172a' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {renderIcon(tab)}
            <span style={{ 
              display: 'inline',
              color: value === tab.value ? '#0f172a' : '#475569',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>{tab.label}</span>
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
    value: 'groups',
    label: 'Groups',
    shortLabel: 'G',
    icon: <FolderOpen size={16} />
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
