export interface PlatformConfig {
  key: string;
  name: string;
  platform: string;
  icon: string;
  color: string;
  credentials: string[];
  usesOAuth: boolean;
  defaultCredentials?: Record<string, string>;
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  facebookAds: {
    key: 'facebook',
    name: 'Facebook Ads',
    platform: 'facebookAds',
    icon: 'meta',
    color: 'blue',
    credentials: ['developerToken'],
    usesOAuth: false,
    defaultCredentials: {}
  },
  googleAds: {
    key: 'google',
    name: 'Google Ads',
    platform: 'googleAds',
    icon: 'googleAds',
    color: 'red',
    credentials: ['clientId', 'clientSecret'],
    usesOAuth: true,
    defaultCredentials: {}
  },
  googleSheets: {
    key: 'google',
    name: 'Google Sheets',
    platform: 'googleSheets',
    icon: 'googleSheets',
    color: 'green',
    credentials: [],
    usesOAuth: true,
    // Uses Google Ads credentials
    defaultCredentials: {}
  },
  'google-ai': {
    key: 'google-ai',
    name: 'Google AI Studio',
    platform: 'google-ai',
    icon: 'googleAI',
    color: 'purple',
    credentials: ['apiKey'],
    usesOAuth: false,
    defaultCredentials: {}
  }
};

export const OAUTH_PLATFORM_MAP: Record<string, string> = {
  'googleAds': 'googleAds',
  'googleSheets': 'googleSheets'
};

export const getPlatformConfig = (platform: string): PlatformConfig | undefined => {
  return PLATFORM_CONFIGS[platform];
};

export const getOAuthPlatform = (platform: string): string => {
  return OAUTH_PLATFORM_MAP[platform] || platform;
};
