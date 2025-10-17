/**
 * NAMING CONVENTIONS FOR INTEGRATION DATA
 * 
 * This file defines clear naming conventions to prevent confusion
 * between agency-level and client-level integration data.
 */

// ============================================================================
// VARIABLE NAMING CONVENTIONS
// ============================================================================

/**
 * Agency-level variables should be prefixed with "agency" or "platform"
 * Examples:
 * - agencyIntegrationStatus
 * - platformConnectionStatus
 * - agencyFacebookConnected
 * - platformGoogleAdsEnabled
 */

/**
 * Client-level variables should be prefixed with "client" or "selected"
 * Examples:
 * - clientAccountNames
 * - selectedFacebookAccount
 * - clientGoogleSheetsConfig
 * - selectedAccountIds
 */

/**
 * Helper functions should clearly indicate their purpose
 * Examples:
 * - loadAgencyIntegrationStatus()
 * - loadClientAccountNames()
 * - validateClientAccountSelections()
 * - getIntegrationDisplayInfo()
 */

// ============================================================================
// FUNCTION NAMING CONVENTIONS
// ============================================================================

/**
 * Agency-level functions:
 * - loadAgency[Platform]Status()
 * - checkPlatformConnection()
 * - getAgencyIntegrationData()
 * - validateAgencySetup()
 */

/**
 * Client-level functions:
 * - loadClient[Platform]Account()
 * - getClientAccountNames()
 * - validateClientSelections()
 * - updateClientAccountSelection()
 */

/**
 * Validation functions:
 * - validate[Data]Consistency()
 * - check[Data]Integrity()
 * - ensure[Data]Separation()
 */

// ============================================================================
// TYPE NAMING CONVENTIONS
// ============================================================================

/**
 * Agency-level types:
 * - AgencyIntegrationStatus
 * - PlatformConnectionInfo
 * - AgencyIntegrationData
 */

/**
 * Client-level types:
 * - ClientAccountSelections
 * - ClientAccountNames
 * - ClientIntegrationConfig
 */

/**
 * Error types:
 * - IntegrationDataMixingError
 * - ClientContextMissingError
 * - AgencySetupError
 */

// ============================================================================
// COMPONENT NAMING CONVENTIONS
// ============================================================================

/**
 * Components that handle agency-level data:
 * - AgencyIntegrationSettings
 * - PlatformConnectionStatus
 * - AgencySetupWizard
 */

/**
 * Components that handle client-level data:
 * - ClientAccountSelector
 * - ClientIntegrationDisplay
 * - ClientAccountManager
 */

/**
 * Validation components:
 * - IntegrationDataErrorBoundary
 * - DataConsistencyChecker
 * - IntegrationValidator
 */

// ============================================================================
// FILE NAMING CONVENTIONS
// ============================================================================

/**
 * Agency-level files:
 * - agencyIntegrationService.ts
 * - platformConnectionManager.ts
 * - agencySetupHelpers.ts
 */

/**
 * Client-level files:
 * - clientAccountService.ts
 * - clientIntegrationManager.ts
 * - clientAccountHelpers.ts
 */

/**
 * Shared/validation files:
 * - integrationHelpers.ts
 * - integrationValidation.ts
 * - integrationTypes.ts
 */

// ============================================================================
// COMMENTS AND DOCUMENTATION CONVENTIONS
// ============================================================================

/**
 * Always include clear comments indicating data level:
 * 
 * @example
 * // AGENCY-LEVEL: Platform connection status
 * const agencyStatus = await loadAgencyIntegrationStatus();
 * 
 * // CLIENT-LEVEL: Specific account selections
 * const clientNames = await loadClientAccountNames(client.accounts);
 * 
 * // VALIDATION: Ensure data consistency
 * validateClientAccountSelections(client.accounts, agencyStatus);
 */

/**
 * Use JSDoc comments to clarify data sources:
 * 
 * @example
 * /**
 *  * Loads agency-level integration status from integrations table
 *  * @returns AgencyIntegrationStatus - Which platforms are connected
 *  * @throws IntegrationDataMixingError if data is invalid
 *  *\/
 * async function loadAgencyIntegrationStatus(): Promise<AgencyIntegrationStatus>
 */

// ============================================================================
// TEST NAMING CONVENTIONS
// ============================================================================

/**
 * Test files should clearly indicate what they're testing:
 * - agencyIntegrationService.test.ts
 * - clientAccountHelpers.test.ts
 * - integrationValidation.test.ts
 */

/**
 * Test descriptions should be clear about data level:
 * 
 * @example
 * describe('Agency Integration Status', () => {
 *   it('should load platform connection status', async () => {
 *     // Test agency-level data
 *   });
 * });
 * 
 * describe('Client Account Names', () => {
 *   it('should resolve account IDs to names', async () => {
 *     // Test client-level data
 *   });
 * });
 */

// ============================================================================
// ENFORCEMENT RULES
// ============================================================================

/**
 * 1. Never mix agency and client data in the same variable
 * 2. Always use descriptive prefixes (agency/client/platform)
 * 3. Include data level in function names
 * 4. Add clear comments indicating data source
 * 5. Use type guards to validate data at runtime
 * 6. Throw specific errors for data mixing violations
 */

/**
 * Example of GOOD naming:
 * 
 * const agencyFacebookStatus = await loadAgencyIntegrationStatus();
 * const clientFacebookAccount = await loadClientAccountNames(client.accounts);
 * const displayInfo = getIntegrationDisplayInfo('facebookAds', agencyFacebookStatus, clientFacebookAccount);
 */

/**
 * Example of BAD naming:
 * 
 * const integrationData = await loadIntegrationData(); // Too vague!
 * const facebookData = await loadFacebookData(); // Which level?
 * const data = await loadData(); // Completely unclear!
 */
