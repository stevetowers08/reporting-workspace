// Additional TypeScript interfaces for better type safety
// This file contains interfaces to replace 'any' types throughout the application

import React from 'react';

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  resourceName: string;
  currencyCode: string;
  timeZone: string;
  descriptiveName: string;
}

// Google Ads Customer Client (from API response)
export interface GoogleAdsCustomerClient {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  testAccount: boolean;
  payPerConversionEligibilityFailureReasons: string[];
  status: string;
  clientCustomer: string; // e.g., "customers/1234567890"
  level: number;
}

// Google Ads API Row Response
export interface GoogleAdsApiRow {
  customerClient: GoogleAdsCustomerClient;
}

// Base Metrics Interface
export interface MetricsBase {
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
}

// Metrics Types for Trend Calculations
export interface MetricsWithTrends {
  leads: number;
  spend?: number;
  cost?: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  previousPeriod?: MetricsWithTrends;
}

// Facebook Ads Metrics for Trend Calculations
export interface FacebookMetricsWithTrends {
  leads: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  previousPeriod?: FacebookMetricsWithTrends;
}

// Google Ads Metrics for Trend Calculations
export interface GoogleMetricsWithTrends {
  leads: number;
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  demographics?: {
    ageGroups: {
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
    gender: {
      female: number;
      male: number;
    };
  };
  campaignBreakdown?: {
    campaignTypes: {
      search: number;
      display: number;
      youtube: number;
    };
    adFormats: {
      textAds: number;
      responsiveDisplay: number;
      videoAds: number;
    };
  };
  previousPeriod?: GoogleMetricsWithTrends;
}

// Trend Calculation Result
export interface TrendResult {
  leads: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  costPerLead: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  conversionRate: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  spent: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  impressions: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  clicks: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  costPerClick: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
  ctr: {
    direction: 'up' | 'down';
    percentage: number;
    change: number;
  };
}

// Google Ads Troubleshooting Types
export interface TroubleshootingCheck {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: TroubleshootingDetails;
}

export interface TroubleshootingDetails {
  [key: string]: unknown;
}

export interface TroubleshootingResult {
  success: boolean;
  checks: TroubleshootingCheck[];
}

export interface AccountFetchResult {
  success: boolean;
  accounts: GoogleAdsAccount[];
  error?: string;
}

// Performance Monitoring Types
export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  detail?: unknown;
}

export interface PerformanceObserverEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  detail?: unknown;
}

// DOM Types for better type safety
export interface DOMElement extends React.ElementType {
  [key: string]: unknown;
}

export interface DOMButtonElement extends React.ElementType {
  [key: string]: unknown;
}

export interface DOMDivElement extends React.ElementType {
  [key: string]: unknown;
}

// Error Event Types
export interface ErrorEventDetail {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

export interface PromiseRejectionEventDetail {
  reason: unknown;
  promise: Promise<unknown>;
}

// Logger Types
export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  timestamp: string;
}

// Component Props Types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

// React Ref Types
export type Ref<T extends React.ElementType> = React.Ref<T>;
export type ButtonRef = Ref<'button'>;
export type DivRef = Ref<'div'>;
export type InputRef = Ref<'input'>;

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Database Service Types
export interface DatabaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Service Response Types
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}
