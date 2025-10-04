// API Response Types
export interface FacebookAdsResponse {
  data: FacebookAdData[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface GoogleAdsResponse {
  results: GoogleAdData[];
  fieldMask: string;
}

export interface FacebookAdData {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id: string;
  adset_id: string;
  created_time: string;
  updated_time: string;
  insights?: {
    data: FacebookInsightData[];
  };
}

export interface GoogleAdData {
  campaign: {
    resourceName: string;
    id: string;
    name: string;
    status: string;
  };
  metrics: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: string;
  };
}

export interface FacebookInsightData {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  cpm: string;
  cpc: string;
  ctr: string;
  date_start: string;
  date_stop: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: any;
}
