// API Response Types for better type safety
// This file contains interfaces for all API responses to replace 'any' types

// ============================================================================
// FACEBOOK ADS API RESPONSE TYPES
// ============================================================================

export interface FacebookApiResponse<T = unknown> {
  data: T[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface FacebookAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  business?: {
    id: string;
    name: string;
  };
}

export interface FacebookBusiness {
  id: string;
  name: string;
  owned_ad_accounts?: {
    data: FacebookAdAccount[];
  };
  client_ad_accounts?: {
    data: FacebookAdAccount[];
  };
}

export interface FacebookSystemUser {
  id: string;
  name: string;
  adaccounts?: {
    data: FacebookAdAccount[];
  };
}

export interface FacebookInsightData {
  impressions: string;
  clicks: string;
  spend: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  reach?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  roas?: string;
  date_start: string;
  date_stop: string;
  age?: string;
  gender?: string;
  publisher_platform?: string;
  placement?: string;
}

export interface FacebookConversionAction {
  id: string;
  name: string;
  status: string;
  type: string;
  category: string;
}

export interface FacebookErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

// ============================================================================
// GOOGLE ADS API RESPONSE TYPES
// ============================================================================

export interface GoogleAdsApiResponse<T = unknown> {
  results: T[];
  fieldMask?: string;
  requestId?: string;
}

export interface GoogleAdsCustomerClient {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  testAccount: boolean;
  manager: boolean;
  status: string;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget: string;
  biddingStrategyType: string;
}

export interface GoogleAdsMetrics {
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  ctr: string;
  averageCpc: string;
  costPerConversion: string;
  conversionRate: string;
}

export interface GoogleAdsErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      type: string;
      detail: string;
    }>;
  };
}

// ============================================================================
// GOHIGHLEVEL API RESPONSE TYPES
// ============================================================================

export interface GHLApiResponse<T = unknown> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface GHLLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  website: string;
  timezone: string;
  currency: string;
  status: string;
}

export interface GHLCampaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GHLErrorResponse {
  error: {
    message: string;
    code: string;
    details?: string;
  };
}

// ============================================================================
// GOOGLE SHEETS API RESPONSE TYPES
// ============================================================================

export interface GoogleSheetsApiResponse {
  range: string;
  majorDimension: string;
  values: string[][];
}

export interface GoogleSheetsSpreadsheet {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    autoRecalc: string;
    timeZone: string;
  };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      index: number;
      sheetType: string;
      gridProperties: {
        rowCount: number;
        columnCount: number;
      };
    };
  }>;
}

export interface GoogleSheetsErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      type: string;
      detail: string;
    }>;
  };
}

// ============================================================================
// GENERIC API RESPONSE TYPES
// ============================================================================

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string | number;
    status?: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
}

// ============================================================================
// CACHE AND REQUEST TYPES
// ============================================================================

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

export interface RequestCache {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T): void;
  clear(): void;
}

export interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// ============================================================================
// METRICS AND ANALYTICS TYPES
// ============================================================================

export interface MetricsData {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach?: number;
  frequency?: number;
}

export interface DemographicsData {
  ageGroups: Record<string, number>;
  gender: Record<string, number>;
}

export interface PlatformBreakdown {
  facebookVsInstagram: Record<string, number>;
  adPlacements: Record<string, number>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ApiResponse<T> = T | ApiErrorResponse;
export type AsyncApiResponse<T> = Promise<ApiResponse<T>>;

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}
