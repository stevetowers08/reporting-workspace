/**
 * INTEGRATION DATA ARCHITECTURE
 * 
 * This file defines clear types to prevent mixing agency-level and client-level data.
 * 
 * AGENCY-LEVEL: Platform connection status (is Facebook Ads connected?)
 * CLIENT-LEVEL: Specific account selections (which Facebook account did this client choose?)
 */

// ============================================================================
// AGENCY-LEVEL INTEGRATION DATA
// ============================================================================

/**
 * Agency-level integration status - answers "Is this platform connected?"
 * This comes from the `integrations` table and applies to the entire agency.
 */
export interface AgencyIntegrationStatus {
  facebookAds: boolean;
  googleAds: boolean;
  googleSheets: boolean;
  goHighLevel: boolean;
}

/**
 * Agency-level integration details - general platform information
 * This is NOT client-specific account information.
 */
export interface AgencyIntegrationData {
  platform: string;
  connected: boolean;
  account_name?: string; // Generic platform name, NOT client-specific
  account_id?: string;   // Generic platform ID, NOT client-specific
  config?: Record<string, unknown>;
}

// ============================================================================
// CLIENT-LEVEL INTEGRATION DATA
// ============================================================================

/**
 * Client-specific account selections - answers "Which specific accounts did this client choose?"
 * This comes from the `clients.accounts` field and is unique per client.
 */
export interface ClientAccountSelections {
  facebookAds: string; // Specific Facebook account ID this client selected
  googleAds: string;   // Specific Google Ads account ID this client selected
  goHighLevel: string; // Specific GoHighLevel account ID this client selected
  googleSheets: string; // Specific Google Sheets account ID this client selected
  googleSheetsConfig?: {
    spreadsheetId: string;
    sheetName: string;
    spreadsheetName?: string;
  };
}

/**
 * Client-specific account names - the actual names of selected accounts
 * This is resolved by looking up the account IDs in the platform's account list.
 */
export interface ClientAccountNames {
  facebookAds: string; // "Magnolia Terrace Facebook Account"
  googleAds: string;   // "Fire House Loft Google Ads"
  goHighLevel: string; // "Magnolia Terrace GHL Account"
  googleSheets: string; // "Magnolia Terrace Spreadsheet"
}

// ============================================================================
// PLATFORM ACCOUNT DATA
// ============================================================================

/**
 * Available account from a platform (Facebook, Google, etc.)
 * This is what gets loaded when fetching available accounts for selection.
 */
export interface PlatformAccount {
  id: string;
  name: string;
  platform: string;
}

// ============================================================================
// TYPE GUARDS AND VALIDATION
// ============================================================================

/**
 * Type guard to check if data is agency-level integration status
 */
export function isAgencyIntegrationStatus(data: unknown): data is AgencyIntegrationStatus {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).facebookAds === 'boolean' &&
    typeof (data as any).googleAds === 'boolean' &&
    typeof (data as any).googleSheets === 'boolean' &&
    typeof (data as any).goHighLevel === 'boolean'
  );
}

/**
 * Type guard to check if data is client account selections
 */
export function isClientAccountSelections(data: unknown): data is ClientAccountSelections {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).facebookAds === 'string' &&
    typeof (data as any).googleAds === 'string' &&
    typeof (data as any).goHighLevel === 'string' &&
    typeof (data as any).googleSheets === 'string'
  );
}

/**
 * Type guard to check if data is client account names
 */
export function isClientAccountNames(data: unknown): data is ClientAccountNames {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).facebookAds === 'string' &&
    typeof (data as any).googleAds === 'string' &&
    typeof (data as any).goHighLevel === 'string' &&
    typeof (data as any).googleSheets === 'string'
  );
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error thrown when agency and client data are incorrectly mixed
 */
export class IntegrationDataMixingError extends Error {
  constructor(message: string) {
    super(`INTEGRATION DATA MIXING ERROR: ${message}`);
    this.name = 'IntegrationDataMixingError';
  }
}

/**
 * Error thrown when trying to access client-specific data without proper context
 */
export class ClientContextMissingError extends Error {
  constructor(operation: string) {
    super(`CLIENT CONTEXT MISSING: Cannot perform ${operation} without client context`);
    this.name = 'ClientContextMissingError';
  }
}
