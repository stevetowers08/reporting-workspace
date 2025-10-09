// GoHighLevel API Types and Interfaces

export interface GHLAccount {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  status?: string;
  companyId?: string;
  email?: string;
}

export interface GHLContactCustomField {
  id: string;
  key?: string;
  fieldType?: string;
  value: string;
}

export interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  customFields?: GHLContactCustomField[];
  dateAdded?: string;
  dateUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GHLCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  costPerClick?: number;
  costPerConversion?: number;
  clickThroughRate?: number;
  conversionRate?: number;
}

export interface GHLFunnel {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLFunnelPage {
  _id: string;
  funnelId: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLFunnelAnalytics {
  id: string;
  name: string;
  views: number;
  uniqueViews: number;
  conversions: number;
  conversionRate: number;
  pages: GHLPageAnalytics[];
}

export interface GHLPageAnalytics {
  id: string;
  name: string;
  views: number;
  uniqueViews: number;
  conversions: number;
  conversionRate: number;
}

export interface GHLOpportunity {
  _id: string;
  title: string;
  status: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface GHLOpportunityAnalytics {
  totalOpportunities: number;
  totalValue: number;
  opportunitiesByStatus: Record<string, number>;
  valueByStatus: Record<string, number>;
  averageDealSize: number;
  conversionRate: number;
}

export interface GHLCalendarEvent {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLCalendarAnalytics {
  totalEvents: number;
  eventsByStatus: Record<string, number>;
  averageEventDuration: number;
  eventsByMonth: Record<string, number>;
}

export interface GHLMetrics {
  contacts: {
    total: number;
    newThisMonth: number;
    growthRate: number;
  };
  campaigns: {
    total: number;
    active: number;
    totalSpent: number;
    totalConversions: number;
  };
  funnels: GHLFunnelAnalytics[];
  pages: GHLPageAnalytics[];
  opportunities: GHLOpportunityAnalytics;
  calendars: GHLCalendarAnalytics;
}

export interface GHLTokenData {
  access_token: string;
  refresh_token: string;
  locationId: string;
  expires_in: number;
  scope: string;
  userType: string;
  locationName?: string;
}

export interface GHLWebhookEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface GHLRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface GHLConfig {
  apiKey?: {
    apiKey: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  };
  accountInfo?: {
    id: string;
    name: string;
  };
  locationId?: string;
  userType?: string;
  lastSync?: string;
  syncStatus?: string;
  connectedAt?: string;
}
