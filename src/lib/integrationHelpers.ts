/**
 * INTEGRATION DATA HELPERS
 * 
 * These helper functions provide clear APIs that prevent mixing agency-level
 * and client-level integration data. Use these instead of direct data access.
 */

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { FacebookAdsService } from '@/services/api/facebookAdsService';
import { GoogleAdsService } from '@/services/api/googleAdsService';
import {
    AgencyIntegrationStatus,
    ClientAccountNames,
    ClientAccountSelections,
    IntegrationDataMixingError,
    PlatformAccount
} from '@/types/integrations';

// ============================================================================
// AGENCY-LEVEL HELPERS
// ============================================================================

/**
 * Loads agency-level integration status (platform connection status)
 * 
 * @returns Promise<AgencyIntegrationStatus> - Which platforms are connected at agency level
 * 
 * @example
 * const status = await loadAgencyIntegrationStatus();
 * if (status.facebookAds) {
 *   // Facebook Ads is connected at agency level
 * }
 */
export async function loadAgencyIntegrationStatus(): Promise<AgencyIntegrationStatus> {
  try {
    const { data: integrations } = await supabase
      .from('integrations')
      .select('platform, connected')
      .eq('connected', true);

    const status: AgencyIntegrationStatus = {
      facebookAds: false,
      googleAds: false,
      googleSheets: false,
      goHighLevel: false
    };

    integrations?.forEach(integration => {
      if (integration.platform in status) {
        status[integration.platform as keyof AgencyIntegrationStatus] = true;
      }
    });

    debugLogger.info('IntegrationHelpers', 'Loaded agency integration status:', status);
    return status;
  } catch (error) {
    debugLogger.error('IntegrationHelpers', 'Error loading agency integration status:', error);
    throw new Error('Failed to load agency integration status');
  }
}

// ============================================================================
// CLIENT-LEVEL HELPERS
// ============================================================================

/**
 * Loads client-specific account names by resolving account IDs to actual names
 * 
 * @param clientAccounts - Client's selected account IDs
 * @returns Promise<ClientAccountNames> - Actual names of selected accounts
 * 
 * @example
 * const names = await loadClientAccountNames(client.accounts);
 * console.log(names.facebookAds); // "Magnolia Terrace Facebook Account"
 */
export async function loadClientAccountNames(
  clientAccounts: ClientAccountSelections
): Promise<ClientAccountNames> {
  const accountNames: ClientAccountNames = {
    facebookAds: '',
    googleAds: '',
    goHighLevel: '',
    googleSheets: ''
  };

  // Load Facebook Ads account name
  if (clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none') {
    try {
      const facebookAccounts = await FacebookAdsService.getAdAccounts();
      const selectedAccount = facebookAccounts.find(acc => acc.id === clientAccounts.facebookAds);
      if (selectedAccount) {
        accountNames.facebookAds = selectedAccount.name || `Facebook Account (${clientAccounts.facebookAds})`;
      }
    } catch (error) {
      debugLogger.error('IntegrationHelpers', 'Error loading Facebook account name:', error);
      accountNames.facebookAds = `Facebook Account (${clientAccounts.facebookAds})`;
    }
  }

  // Load Google Ads account name
  if (clientAccounts.googleAds && clientAccounts.googleAds !== 'none') {
    try {
      const googleAccounts = await GoogleAdsService.getAdAccounts();
      const selectedAccount = googleAccounts.find(acc => acc.id === clientAccounts.googleAds);
      if (selectedAccount) {
        accountNames.googleAds = selectedAccount.name || `Google Ads Account (${clientAccounts.googleAds})`;
      }
    } catch (error) {
      debugLogger.error('IntegrationHelpers', 'Error loading Google Ads account name:', error);
      accountNames.googleAds = `Google Ads Account (${clientAccounts.googleAds})`;
    }
  }

  // Load GoHighLevel account name (if service exists)
  if (clientAccounts.goHighLevel && clientAccounts.goHighLevel !== 'none') {
    accountNames.goHighLevel = `GoHighLevel Account (${clientAccounts.goHighLevel})`;
  }

  // Load Google Sheets account name
  if (clientAccounts.googleSheets && clientAccounts.googleSheets !== 'none') {
    accountNames.googleSheets = `Google Sheets Account (${clientAccounts.googleSheets})`;
  }

  debugLogger.info('IntegrationHelpers', 'Loaded client account names:', accountNames);
  return accountNames;
}

/**
 * Validates that client account selections are valid
 * 
 * @param clientAccounts - Client's selected account IDs
 * @param agencyStatus - Agency-level integration status
 * @throws IntegrationDataMixingError if validation fails
 */
export function validateClientAccountSelections(
  clientAccounts: ClientAccountSelections,
  agencyStatus: AgencyIntegrationStatus
): void {
  // Check Facebook Ads
  if (clientAccounts.facebookAds !== 'none' && !agencyStatus.facebookAds) {
    throw new IntegrationDataMixingError(
      'Client selected Facebook Ads account but Facebook Ads is not connected at agency level'
    );
  }

  // Check Google Ads
  if (clientAccounts.googleAds !== 'none' && !agencyStatus.googleAds) {
    throw new IntegrationDataMixingError(
      'Client selected Google Ads account but Google Ads is not connected at agency level'
    );
  }

  // Check Google Sheets
  if (clientAccounts.googleSheets !== 'none' && !agencyStatus.googleSheets) {
    throw new IntegrationDataMixingError(
      'Client selected Google Sheets account but Google Sheets is not connected at agency level'
    );
  }

  // Check GoHighLevel
  if (clientAccounts.goHighLevel !== 'none' && !agencyStatus.goHighLevel) {
    throw new IntegrationDataMixingError(
      'Client selected GoHighLevel account but GoHighLevel is not connected at agency level'
    );
  }
}

// ============================================================================
// PLATFORM ACCOUNT HELPERS
// ============================================================================

/**
 * Gets available accounts for a specific platform
 * 
 * @param platform - Platform name ('facebookAds', 'googleAds', etc.)
 * @returns Promise<PlatformAccount[]> - Available accounts for selection
 */
export async function getAvailablePlatformAccounts(platform: string): Promise<PlatformAccount[]> {
  switch (platform) {
    case 'facebookAds':
      const facebookAccounts = await FacebookAdsService.getAdAccounts();
      return facebookAccounts.map(acc => ({
        id: acc.id,
        name: acc.name.replace(/\s*\([^)]*\)$/, ''), // Remove account ID in brackets
        platform: 'facebookAds'
      }));

    case 'googleAds':
      const googleAccounts = await GoogleAdsService.getAdAccounts();
      return googleAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        platform: 'googleAds'
      }));

    default:
      debugLogger.warn('IntegrationHelpers', `Unknown platform: ${platform}`);
      return [];
  }
}

// ============================================================================
// UI DISPLAY HELPERS
// ============================================================================

/**
 * Determines what to display for a client's integration
 * 
 * @param platform - Platform name
 * @param agencyStatus - Agency-level integration status
 * @param clientAccountNames - Client-specific account names
 * @returns Display information for the UI
 */
export function getIntegrationDisplayInfo(
  platform: keyof AgencyIntegrationStatus,
  agencyStatus: AgencyIntegrationStatus,
  clientAccountNames: ClientAccountNames
) {
  const isConnected = agencyStatus[platform];
  const accountName = clientAccountNames[platform];

  return {
    isConnected,
    hasSelectedAccount: accountName !== '',
    accountName,
    displayText: accountName || 'Not configured',
    canEdit: isConnected
  };
}

// ============================================================================
// ERROR BOUNDARIES AND VALIDATION
// ============================================================================

/**
 * Wrapper function that ensures proper data separation
 * 
 * @param operation - Operation name for error messages
 * @param agencyOperation - Function that works with agency-level data
 * @param clientOperation - Function that works with client-level data
 */
export async function withDataSeparation<T, U>(
  operation: string,
  agencyOperation: () => Promise<T>,
  clientOperation: (agencyData: T) => Promise<U>
): Promise<U> {
  try {
    const agencyData = await agencyOperation();
    return await clientOperation(agencyData);
  } catch (error) {
    debugLogger.error('IntegrationHelpers', `Error in ${operation}:`, error);
    throw new IntegrationDataMixingError(`Failed to complete ${operation}: ${error.message}`);
  }
}
