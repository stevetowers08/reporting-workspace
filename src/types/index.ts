// Re-export all types for easy importing
export * from './api';
export * from './components';
export * from './dashboard';
export * from './services';

// Re-export common types with specific names to avoid conflicts
export type {
    AccountFetchResult, ButtonRef, GoogleAdsAccount as CommonGoogleAdsAccount,
    GoogleAdsCustomerClient as CommonGoogleAdsCustomerClient, DivRef, FacebookMetricsWithTrends, GoogleAdsApiRow, GoogleMetricsWithTrends, InputRef, LogContext, MetricsBase, PerformanceEntry,
    PerformanceObserverEntry, Ref, TrendResult, TroubleshootingCheck, TroubleshootingDetails
} from './common';

