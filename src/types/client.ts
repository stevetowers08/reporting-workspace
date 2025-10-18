// Centralized Client type definition
// This is the single source of truth for all Client interfaces

export interface Client {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'pending' | 'paused';
  location: string;
  logo_url?: string;
  services?: Record<string, any>;
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string | {
      locationId: string;
      locationName: string;
      locationToken?: string;
    };
    googleSheets?: string;
    googleSheetsConfig?: {
      spreadsheetId: string;
      sheetName: string;
      spreadsheetName?: string;
    };
  };
  conversion_actions?: {
    facebookAds?: string;
    googleAds?: string;
  };
  integration_enabled?: {
    facebookAds?: boolean;
    googleAds?: boolean;
    goHighLevel?: boolean;
    googleSheets?: boolean;
  };
  googleSheetsConfig?: {
    spreadsheetId: string;
    sheetName: string;
    spreadsheetName?: string;
  };
  shareable_link: string;
  created_at?: string;
  updated_at?: string;
}

// Input types for creating/updating clients
export interface CreateClientInput {
  name: string;
  type: string;
  status?: 'active' | 'inactive' | 'pending' | 'paused';
  location: string;
  logo_url?: string;
  services?: Record<string, any>;
  accounts: Client['accounts'];
  conversion_actions?: Client['conversion_actions'];
  integration_enabled?: Client['integration_enabled'];
  googleSheetsConfig?: Client['accounts']['googleSheetsConfig'];
  shareable_link: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string;
}

// Database-specific types (with timestamps)
export interface ClientRecord extends Client {
  created_at: string;
  updated_at: string;
}
