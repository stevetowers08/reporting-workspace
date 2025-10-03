import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Create a test query client with disabled retries
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Test wrapper component that provides all necessary context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function that includes all providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  });
};

// Mock data generators
export const mockClient = {
  id: 'client_123',
  name: 'Test Client',
  industry: 'Technology',
  status: 'active' as const,
  monthlySpend: 10000,
  lastReportSent: '2024-01-15T10:00:00Z',
  contactEmail: 'test@example.com',
  contactName: 'John Doe',
  contactPhone: '+1234567890',
  timezone: 'America/New_York',
  currency: 'USD',
      integrations: {
        facebookAds: {
      accessToken: 'test_token',
      adAccountId: 'test_account',
      connected: true,
      lastSync: '2024-01-15T10:00:00Z',
        },
        googleAds: {
      accessToken: 'test_token',
      customerId: 'test_customer',
      developerToken: 'test_dev_token',
      connected: true,
      lastSync: '2024-01-15T10:00:00Z',
        },
        goHighLevel: {
      apiKey: 'test_api_key',
      locationId: 'test_location',
      connected: true,
      lastSync: '2024-01-15T10:00:00Z',
        },
      },
      reportingSchedule: {
    weekly: true,
    monthly: true,
        customSchedules: [],
      },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

export const mockCampaign = {
  id: 'campaign_123',
  name: 'Test Campaign',
  platform: 'facebook' as const,
  status: 'active' as const,
  budget: 5000,
  spend: 2500,
  impressions: 100000,
  clicks: 5000,
  conversions: 100,
  ctr: 5.0,
  cpc: 0.5,
  cpm: 25.0,
  roas: 4.0,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  clientId: 'client_123',
};

export const mockAdAccount = {
  id: 'account_123',
  name: 'Test Ad Account',
  platform: 'facebook' as const,
  currency: 'USD',
  timezone: 'America/New_York',
  status: 'active' as const,
  clientId: 'client_123',
};

// Mock API responses
export const mockApiResponses = {
  clients: [mockClient],
  campaigns: [mockCampaign],
  adAccounts: [mockAdAccount],
};

// Utility functions for testing
export const waitForLoadingToFinish = async () => {
  // Wait for any loading indicators to disappear
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  
  return localStorageMock;
};

export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
  
  return sessionStorageMock;
};

// Mock fetch responses
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

// Mock fetch errors
export const mockFetchError = (message = 'Network error') => {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
};

// Clean up mocks
export const cleanupMocks = () => {
  jest.clearAllMocks();
  if (global.fetch) {
    (global.fetch as jest.Mock).mockRestore();
  }
};

// Test data factory
export const createMockClient = (overrides = {}) => ({
  ...mockClient,
  ...overrides,
});

export const createMockCampaign = (overrides = {}) => ({
  ...mockCampaign,
  ...overrides,
});

export const createMockAdAccount = (overrides = {}) => ({
  ...mockAdAccount,
  ...overrides,
});

// Export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';