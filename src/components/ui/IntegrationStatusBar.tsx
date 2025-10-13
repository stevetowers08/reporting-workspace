import { LogoManager } from '@/components/ui/LogoManager';
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface IntegrationStatusBarProps {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

interface IntegrationStatus {
  platform: string;
  name: string;
  connected: boolean;
  loading?: boolean;
}

export const IntegrationStatusBar: React.FC<IntegrationStatusBarProps> = ({
  className = '',
  showLabels = false,
  compact = false
}) => {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIntegrationStatuses = async () => {
      try {
        const { TokenManager } = await import('@/services/auth/TokenManager');
        const { GoogleSheetsOAuthService } = await import('@/services/auth/googleSheetsOAuthService');
        
        const platforms = [
          { platform: 'facebookAds', name: 'Facebook Ads', logo: 'meta' },
          { platform: 'googleAds', name: 'Google Ads', logo: 'googleAds' },
          { platform: 'googleSheets', name: 'Google Sheets', logo: 'googleSheets' },
          { platform: 'google-ai', name: 'Google AI Studio', logo: 'google-ai' }
        ];

        // Simple approach: Check database directly
        const { data: integrations } = await supabase
          .from('integrations')
          .select('platform')
          .eq('connected', true);

        const connectedPlatforms = new Set(integrations?.map(i => i.platform) || []);

        const statusPromises = platforms.map(async (platform) => {
          const connected = connectedPlatforms.has(platform.platform);
          
          return {
            platform: platform.platform,
            name: platform.name,
            connected,
            loading: false
          };
        });

        const results = await Promise.all(statusPromises);
        setStatuses(results);
      } catch (error) {
        debugLogger.error('IntegrationStatusBar', 'Failed to load integration statuses', error);
        setStatuses([]);
      } finally {
        setLoading(false);
      }
    };

    loadIntegrationStatuses();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        <span className="text-sm text-slate-600">Loading integrations...</span>
      </div>
    );
  }

  const connectedCount = statuses.filter(s => s.connected).length;
  const totalCount = statuses.length;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {statuses.map((status) => (
          <div
            key={status.platform}
            className={`p-1 rounded ${status.connected ? 'bg-green-100' : 'bg-slate-100'}`}
            title={`${status.name}: ${status.connected ? 'Connected' : 'Not Connected'}`}
          >
            <LogoManager 
              platform={status.platform as any} 
              size={16} 
              className={status.connected ? 'opacity-100' : 'opacity-40'}
            />
          </div>
        ))}
        <div className="text-xs text-slate-500 ml-1">
          {connectedCount}/{totalCount}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Integrations:</span>
        <div className="flex items-center gap-1">
          {statuses.map((status) => (
            <div
              key={status.platform}
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                status.connected 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              <LogoManager 
                platform={status.platform as any} 
                size={16} 
                className={status.connected ? 'opacity-100' : 'opacity-60'}
              />
              {showLabels && (
                <span className="text-xs font-medium">{status.name}</span>
              )}
              {status.connected ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertCircle className="h-3 w-3 text-slate-400" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${connectedCount === totalCount ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span className="text-slate-600">
          {connectedCount === totalCount 
            ? 'All connected' 
            : `${connectedCount}/${totalCount} connected`
          }
        </span>
      </div>
    </div>
  );
};
