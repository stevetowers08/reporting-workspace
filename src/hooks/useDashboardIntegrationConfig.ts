import { EventDashboardData } from '@/services/data/eventMetricsService';
import { useMemo } from 'react';

export interface IntegrationStatus {
  facebookAds: boolean;
  googleAds: boolean;
  goHighLevel: boolean;
  googleSheets: boolean;
}

export interface DashboardIntegrationConfig {
  // Which integrations are connected at agency level AND enabled at client level
  connectedIntegrations: IntegrationStatus;
  
  // Tab visibility rules
  visibleTabs: {
    summary: boolean;
    meta: boolean;
    google: boolean;
    leads: boolean;
  };
  
  // Chart configuration for each tab
  chartConfig: {
    summary: {
      showWonChart: boolean;
      showPlatformPerformance: boolean;
      showLeadsByDay: boolean;
      showKeyInsights: boolean;
    };
    leads: {
      showExtraCharts: boolean;
    };
  };
}

/**
 * Hook to determine dashboard configuration based on connected integrations
 * This implements the business rules for tab visibility and chart content
 */
export const useDashboardIntegrationConfig = (
  dashboardData: EventDashboardData | null | undefined,
  clientIntegrationEnabled?: { facebookAds?: boolean; googleAds?: boolean; goHighLevel?: boolean; googleSheets?: boolean }
): DashboardIntegrationConfig => {
  
  return useMemo(() => {
    // Create a stable fallback configuration that prevents tabs from disappearing
    const createFallbackConfig = (): DashboardIntegrationConfig => ({
      connectedIntegrations: {
        facebookAds: false,
        googleAds: false,
        goHighLevel: false,
        googleSheets: false,
      },
      visibleTabs: {
        summary: true, // Always show summary tab as fallback
        meta: false,
        google: false,
        leads: false,
      },
      chartConfig: {
        summary: {
          showWonChart: false,
          showPlatformPerformance: false,
          showLeadsByDay: false,
          showKeyInsights: false,
        },
        leads: {
          showExtraCharts: false,
        },
      },
    });

    // ✅ FIX: Show tabs immediately based on client integration settings, not data availability
    // This prevents tabs from disappearing during data loading
    if (!dashboardData || !dashboardData.clientAccounts) {
      console.log('🔧 useDashboardIntegrationConfig: No dashboard data, showing tabs based on client config');
      
      // Show tabs immediately if client has integrations enabled, even without data
      const immediateConfig = createFallbackConfig();
      if (clientIntegrationEnabled) {
        immediateConfig.visibleTabs = {
          summary: true, // Always show summary
          meta: clientIntegrationEnabled.facebookAds !== false, // Show if not explicitly disabled
          google: clientIntegrationEnabled.googleAds !== false, // Show if not explicitly disabled
          leads: clientIntegrationEnabled.goHighLevel !== false || clientIntegrationEnabled.googleSheets !== false, // Show if either is enabled
        };
      }
      return immediateConfig;
    }

    // Check which integrations are connected (have account data) AND enabled by client
    const facebookAdsConnected = !!(
      dashboardData.clientAccounts?.facebookAds && 
      dashboardData.clientAccounts.facebookAds !== 'none' &&
      (clientIntegrationEnabled?.facebookAds !== false)
    );

    const googleAdsConnected = !!(
      dashboardData.clientAccounts?.googleAds && 
      dashboardData.clientAccounts.googleAds !== 'none' &&
      (clientIntegrationEnabled?.googleAds !== false)
    );

    const goHighLevelConnected = !!(
      dashboardData.clientAccounts?.goHighLevel && 
      dashboardData.clientAccounts.goHighLevel !== 'none' &&
      (clientIntegrationEnabled?.goHighLevel !== false)
    );

    const googleSheetsConnected = !!(
      dashboardData.clientAccounts?.googleSheets &&
      (clientIntegrationEnabled?.googleSheets !== false)
    );

    const connectedIntegrations: IntegrationStatus = {
      facebookAds: facebookAdsConnected,
      googleAds: googleAdsConnected,
      goHighLevel: goHighLevelConnected,
      googleSheets: googleSheetsConnected,
    };

    // Business Rules for Tab Visibility
    const visibleTabs = {
      // Summary tab: Always show for testing
      summary: true,
      
      // Meta tab: Show if Facebook Ads is connected OR for testing
      meta: facebookAdsConnected || true, // TEMPORARY: Always show for testing
      
      // Google tab: Show if Google Ads is connected OR for testing
      google: googleAdsConnected || true, // TEMPORARY: Always show for testing
      
      // Leads tab: Show if Google Sheets OR GoHighLevel is connected OR for testing
      leads: googleSheetsConnected || goHighLevelConnected || true, // TEMPORARY: Always show for testing
    };

    // Business Rules for Chart Configuration
    const chartConfig = {
      summary: {
        // WON chart: Hide if Google Sheets is connected (rule: remove WON chart when Google Sheets is connected)
        showWonChart: !googleSheetsConnected,
        
        // Platform Performance: Always show if any integration is connected
        showPlatformPerformance: facebookAdsConnected || googleAdsConnected || goHighLevelConnected || googleSheetsConnected,
        
        // Leads by Day: Always show if any integration is connected
        showLeadsByDay: facebookAdsConnected || googleAdsConnected || goHighLevelConnected || googleSheetsConnected,
        
        // Key Insights: Always show if any integration is connected
        showKeyInsights: facebookAdsConnected || googleAdsConnected || goHighLevelConnected || googleSheetsConnected,
      },
      leads: {
        // Extra charts: Show if GoHighLevel is connected (rule: extra charts in Lead Info when GHL is connected)
        showExtraCharts: goHighLevelConnected,
      },
    };

    // Ensure we always have at least the summary tab visible (following React best practices for stable UI)
    const stableVisibleTabs = {
      summary: true, // Always show summary tab for stable UI
      meta: visibleTabs.meta,
      google: visibleTabs.google,
      leads: visibleTabs.leads,
    };

    console.log('🔧 useDashboardIntegrationConfig: Final config', {
      connectedIntegrations,
      visibleTabs: stableVisibleTabs,
      hasData: !!dashboardData
    });

    return {
      connectedIntegrations,
      visibleTabs: stableVisibleTabs,
      chartConfig,
    };
  }, [dashboardData, clientIntegrationEnabled]);
};
