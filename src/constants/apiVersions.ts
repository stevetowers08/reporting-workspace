/**
 * API Version Constants
 * Centralized location for all API versions to make updates easier
 */

export const API_VERSIONS = {
  FACEBOOK: 'v22.0', // Updated to latest 2025 version
  GOOGLE_ADS: 'v21', // Updated to latest 2025 version
  GOOGLE_SHEETS: 'v4',
  GOOGLE_OAUTH: 'v2',
  GOHIGHLEVEL: '2021-07-28' // API 2.0 version header
} as const;

export const API_BASE_URLS = {
  FACEBOOK: `https://graph.facebook.com/${API_VERSIONS.FACEBOOK}`,
  GOOGLE_ADS: `https://googleads.googleapis.com/${API_VERSIONS.GOOGLE_ADS}`,
  GOOGLE_SHEETS: `https://sheets.googleapis.com/${API_VERSIONS.GOOGLE_SHEETS}`,
  GOOGLE_OAUTH: `https://oauth2.googleapis.com/${API_VERSIONS.GOOGLE_OAUTH}`,
  GOHIGHLEVEL: 'https://services.leadconnectorhq.com'
} as const;

export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];
export type ApiBaseUrl = typeof API_BASE_URLS[keyof typeof API_BASE_URLS];
