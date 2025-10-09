import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { ClientCreateSchema, ClientUpdateSchema, validateInput } from '@/lib/validation';

// Debug helper for database operations
const debugDatabase = {
  query: (operation: string, table: string) => {
    debugLogger.debug('DatabaseService', `${operation} query on ${table}`);
  },
  success: (operation: string, table: string, data: any) => {
    debugLogger.debug('DatabaseService', `${operation} success on ${table}`, { count: Array.isArray(data) ? data.length : 1 });
  },
  error: (operation: string, table: string, error: any) => {
    debugLogger.error('DatabaseService', `${operation} error on ${table}`, error);
  }
};

// Supabase helper functions
const supabaseHelpers = {
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getIntegrations(): Promise<Integration[]> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getIntegration(platform: string): Promise<Integration | null> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async saveIntegration(platform: string, integrationData: any): Promise<Integration> {
    const { data, error } = await supabase
      .from('integrations')
      .upsert({
        platform,
        ...integrationData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'platform' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteIntegration(platform: string): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('platform', platform);
    
    if (error) throw error;
  },

  async getMetrics(clientId: string, platform?: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('client_id', clientId);
    
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async saveMetrics(clientId: string, platform: string, date: string, metrics: Record<string, any>): Promise<any> {
    const { data, error } = await supabase
      .from('metrics')
      .upsert({
        client_id: clientId,
        platform,
        date,
        metrics,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,platform,date' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await supabase.from('clients').select('id').limit(1);
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Database health check failed');
    }
  }
};

export interface Client {
  id: string;
  name: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'inactive';
  conversion_actions?: {
    facebookAds?: string;
    googleAds?: string;
  };
  accounts?: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
    googleSheetsConfig?: {
      spreadsheetId: string;
      sheetName: string;
    };
  };
  shareable_link: string;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  platform: string;
  connected: boolean;
  account_name?: string;
  account_id?: string;
  last_sync?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  // Client operations
  static async getAllClients(): Promise<Client[]> {
    debugDatabase.query('SELECT', 'clients');
    try {
      const clients = await supabaseHelpers.getClients();
      debugDatabase.success('SELECT', 'clients', clients);
      debugLogger.info('DatabaseService', 'Clients fetched successfully from database', { count: clients.length });
      return clients;
    } catch (error) {
      debugDatabase.error('SELECT', 'clients', error);
      debugLogger.error('DatabaseService', 'Error fetching clients from database', error);
      throw error;
    }
  }

  static async getClient(id: string): Promise<Client | null> {
    try {
      const client = await supabaseHelpers.getClient(id);
      debugLogger.info('DatabaseService', 'Client fetched successfully from database', { id });
      return client;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error fetching client from database', error);
      throw error;
    }
  }

  static async getClientById(id: string): Promise<Client | null> {
    try {
      const client = await supabaseHelpers.getClient(id);
      debugLogger.info('DatabaseService', 'Client fetched successfully from database', { id });
      return client;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error fetching client from database', error);
      throw error;
    }
  }

  static async createClient(clientData: {
    name: string;
    logo_url?: string;
    accounts: {
      facebookAds?: string;
      googleAds?: string;
      goHighLevel?: string | {
        locationId: string;
        locationName: string;
        locationToken?: string;
      };
      googleSheets?: string;
    };
    conversionActions?: {
      facebookAds?: string;
      googleAds?: string;
    };
    googleSheetsConfig?: {
      spreadsheetId: string;
      sheetName: string;
    };
  }): Promise<Client> {
    try {
      // Validate input data
      const validatedData = validateInput(ClientCreateSchema, {
        name: clientData.name,
        logo_url: clientData.logo_url || '',
        type: 'venue', // Default type
        location: 'Unknown', // Default location
        status: 'active',
        services: {
          facebookAds: !!clientData.accounts.facebookAds,
          googleAds: !!clientData.accounts.googleAds,
          crm: !!clientData.accounts.goHighLevel && (
            typeof clientData.accounts.goHighLevel === 'string' 
              ? clientData.accounts.goHighLevel !== 'none'
              : !!clientData.accounts.goHighLevel.locationId
          ),
          revenue: !!clientData.accounts.googleSheets,
        },
        accounts: clientData.accounts,
        conversion_actions: clientData.conversionActions,
      });

      // Include Google Sheets config in the accounts object
      const accountsWithSheetsConfig = {
        ...clientData.accounts,
        ...(clientData.googleSheetsConfig && {
          googleSheetsConfig: clientData.googleSheetsConfig
        })
      };

      const newClient = {
        name: validatedData.name,
        logo_url: validatedData.logo_url,
        status: 'active' as const,
        conversion_actions: clientData.conversionActions || {},
        accounts: accountsWithSheetsConfig,
        shareable_link: `https://eventmetrics.com/share/${Date.now()}`
      };

      const client = await supabaseHelpers.createClient(newClient);
      debugLogger.info('DatabaseService', 'Client created successfully in database', { id: client.id, name: client.name });
      return client;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error creating client in database', error);
      throw error;
    }
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    try {
      // Validate input data
      const validatedUpdates = validateInput(ClientUpdateSchema, updates);
      
      const client = await supabaseHelpers.updateClient(id, validatedUpdates);
      debugLogger.info('DatabaseService', 'Client updated successfully in database', { id, updates: validatedUpdates });
      return client;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error updating client in database', error);
      throw error;
    }
  }

  static async deleteClient(id: string): Promise<void> {
    try {
      await supabaseHelpers.deleteClient(id);
      debugLogger.info('DatabaseService', 'Client deleted successfully from database', { id });
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error deleting client from database', error);
      throw error;
    }
  }

  // Integration operations
  static async getIntegrations(): Promise<Integration[]> {
    debugDatabase.query('SELECT', 'integrations');
    try {
      const integrations = await supabaseHelpers.getIntegrations();
      debugDatabase.success('SELECT', 'integrations', integrations);
      debugLogger.info('DatabaseService', 'Integrations fetched successfully from database', { count: integrations.length });
      return integrations;
    } catch (error) {
      debugDatabase.error('SELECT', 'integrations', error);
      debugLogger.error('DatabaseService', 'Error fetching integrations from database', error);
      throw error;
    }
  }

  static async getIntegration(platform: string): Promise<Integration | null> {
    try {
      const integration = await supabaseHelpers.getIntegration(platform);
      debugLogger.info('DatabaseService', 'Integration fetched successfully from database', { platform });
      return integration;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error fetching integration from database', error);
      throw error;
    }
  }

  static async saveIntegration(platform: string, integrationData: any): Promise<Integration> {
    try {
      const integration = await supabaseHelpers.saveIntegration(platform, integrationData);
      debugLogger.info('DatabaseService', 'Integration saved successfully in database', { platform });
      return integration;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error saving integration in database', error);
      throw error;
    }
  }

  static async deleteIntegration(platform: string): Promise<void> {
    try {
      await supabaseHelpers.deleteIntegration(platform);
      debugLogger.info('DatabaseService', 'Integration deleted successfully from database', { platform });
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error deleting integration from database', error);
      throw error;
    }
  }

  // Metrics operations
  static async getMetrics(
    clientId: string, 
    platform?: string, 
    dateRange?: { start: string; end: string }
  ): Promise<any[]> {
    debugDatabase.query('SELECT', 'metrics');
    try {
      const metrics = await supabaseHelpers.getMetrics(clientId, platform, dateRange);
      debugDatabase.success('SELECT', 'metrics', metrics);
      debugLogger.info('DatabaseService', 'Metrics fetched successfully from database', { 
        clientId, 
        platform, 
        count: metrics.length 
      });
      return metrics;
    } catch (error) {
      debugDatabase.error('SELECT', 'metrics', error);
      debugLogger.error('DatabaseService', 'Error fetching metrics from database', error);
      throw error;
    }
  }

  static async saveMetrics(
    clientId: string, 
    platform: string, 
    date: string, 
    metrics: Record<string, any>
  ): Promise<any> {
    try {
      const savedMetrics = await supabaseHelpers.saveMetrics(clientId, platform, date, metrics);
      debugLogger.info('DatabaseService', 'Metrics saved successfully in database', { 
        clientId, 
        platform, 
        date 
      });
      return savedMetrics;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error saving metrics in database', error);
      throw error;
    }
  }

  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const result = await supabaseHelpers.healthCheck();
      debugLogger.info('DatabaseService', 'Health check successful');
      return result;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Health check failed', error);
      throw error;
    }
  }

  // Google Ads User Authentication Methods
  static async getUserGoogleAdsAuth(userId: string): Promise<any> {
    try {
      debugDatabase.query('getUserGoogleAdsAuth', 'user_google_ads_auth');
      const { data, error } = await supabase
        .from('user_google_ads_auth')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // Handle "no record found" case gracefully
        if (error.code === 'PGRST116') {
          debugDatabase.info('getUserGoogleAdsAuth', 'user_google_ads_auth', 'No user auth record found');
          return null;
        }
        debugDatabase.error('getUserGoogleAdsAuth', 'user_google_ads_auth', error);
        throw error;
      }
      
      debugDatabase.success('getUserGoogleAdsAuth', 'user_google_ads_auth', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error getting user Google Ads auth', error);
      throw error;
    }
  }

  static async saveUserGoogleAdsAuth(userAuth: any): Promise<any> {
    try {
      debugDatabase.query('saveUserGoogleAdsAuth', 'user_google_ads_auth');
      const { data, error } = await supabase
        .from('user_google_ads_auth')
        .insert(userAuth)
        .select()
        .single();
      
      if (error) {
        debugDatabase.error('saveUserGoogleAdsAuth', 'user_google_ads_auth', error);
        throw error;
      }
      
      debugDatabase.success('saveUserGoogleAdsAuth', 'user_google_ads_auth', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error saving user Google Ads auth', error);
      throw error;
    }
  }

  static async updateUserGoogleAdsAuth(userAuth: any): Promise<any> {
    try {
      debugDatabase.query('updateUserGoogleAdsAuth', 'user_google_ads_auth');
      const { data, error } = await supabase
        .from('user_google_ads_auth')
        .update(userAuth)
        .eq('user_id', userAuth.user_id)
        .select()
        .single();
      
      if (error) {
        debugDatabase.error('updateUserGoogleAdsAuth', 'user_google_ads_auth', error);
        throw error;
      }
      
      debugDatabase.success('updateUserGoogleAdsAuth', 'user_google_ads_auth', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error updating user Google Ads auth', error);
      throw error;
    }
  }

  static async deleteUserGoogleAdsAuth(userId: string): Promise<boolean> {
    try {
      debugDatabase.query('deleteUserGoogleAdsAuth', 'user_google_ads_auth');
      const { error } = await supabase
        .from('user_google_ads_auth')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        debugDatabase.error('deleteUserGoogleAdsAuth', 'user_google_ads_auth', error);
        throw error;
      }
      
      debugDatabase.success('deleteUserGoogleAdsAuth', 'user_google_ads_auth', { deleted: true });
      return true;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error deleting user Google Ads auth', error);
      throw error;
    }
  }

  static async getActiveGoogleAdsConfig(): Promise<any> {
    try {
      debugDatabase.query('getActiveGoogleAdsConfig', 'google_ads_configs');
      const { data, error } = await supabase
        .from('google_ads_configs')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) {
        debugDatabase.error('getActiveGoogleAdsConfig', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('getActiveGoogleAdsConfig', 'google_ads_configs', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error getting active Google Ads config', error);
      throw error;
    }
  }

  // Go High Level Methods
  static async saveGHLConnection(connectionData: {
    accessToken: string;
    refreshToken?: string;
    locationId: string;
    expiresIn?: number;
  }): Promise<void> {
    try {
      debugDatabase.query('saveGHLConnection', 'integrations');
      
      // Update or create GHL integration
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          connected: true,
          account_id: connectionData.locationId,
          config: {
            tokens: {
              accessToken: connectionData.accessToken,
              refreshToken: connectionData.refreshToken,
              expiresIn: connectionData.expiresIn,
              expiresAt: connectionData.expiresIn ? new Date(Date.now() + connectionData.expiresIn * 1000).toISOString() : null,
              tokenType: 'Bearer'
            },
            accountInfo: {
              id: connectionData.locationId,
              name: 'GoHighLevel Location'
            },
            locationId: connectionData.locationId,
            lastSync: new Date().toISOString(),
            syncStatus: 'idle',
            connectedAt: new Date().toISOString()
          },
          last_sync: new Date().toISOString()
        }, {
          onConflict: 'platform,account_id'
        });

      if (error) {
        debugDatabase.error('saveGHLConnection', 'integrations', error);
        throw error;
      }

      debugDatabase.success('saveGHLConnection', 'integrations', 'GHL connection saved');
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error saving GHL connection', error);
      throw error;
    }
  }

  static async getGHLConnection(): Promise<any | null> {
    try {
      debugDatabase.query('getGHLConnection', 'integrations');
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'goHighLevel')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        debugDatabase.error('getGHLConnection', 'integrations', error);
        throw error;
      }

      debugDatabase.success('getGHLConnection', 'integrations', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error getting GHL connection', error);
      throw error;
    }
  }

  // Google Ads Config Methods
  static async getGoogleAdsConfigs(): Promise<any[]> {
    try {
      debugDatabase.query('getGoogleAdsConfigs', 'google_ads_configs');
      const { data, error } = await supabase
        .from('google_ads_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        debugDatabase.error('getGoogleAdsConfigs', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('getGoogleAdsConfigs', 'google_ads_configs', data);
      return data || [];
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error getting Google Ads configs', error);
      throw error;
    }
  }

  static async saveGoogleAdsConfig(config: any): Promise<any> {
    try {
      debugDatabase.query('saveGoogleAdsConfig', 'google_ads_configs');
      const { data, error } = await supabase
        .from('google_ads_configs')
        .insert(config)
        .select()
        .single();
      
      if (error) {
        debugDatabase.error('saveGoogleAdsConfig', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('saveGoogleAdsConfig', 'google_ads_configs', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error saving Google Ads config', error);
      throw error;
    }
  }

  static async updateGoogleAdsConfig(id: string, updates: any): Promise<any> {
    try {
      debugDatabase.query('updateGoogleAdsConfig', 'google_ads_configs');
      const { data, error } = await supabase
        .from('google_ads_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        debugDatabase.error('updateGoogleAdsConfig', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('updateGoogleAdsConfig', 'google_ads_configs', data);
      return data;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error updating Google Ads config', error);
      throw error;
    }
  }

  static async deleteGoogleAdsConfig(id: string): Promise<boolean> {
    try {
      debugDatabase.query('deleteGoogleAdsConfig', 'google_ads_configs');
      const { error } = await supabase
        .from('google_ads_configs')
        .delete()
        .eq('id', id);
      
      if (error) {
        debugDatabase.error('deleteGoogleAdsConfig', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('deleteGoogleAdsConfig', 'google_ads_configs', { deleted: true });
      return true;
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error deleting Google Ads config', error);
      throw error;
    }
  }

  static async deactivateAllGoogleAdsConfigs(): Promise<void> {
    try {
      debugDatabase.query('deactivateAllGoogleAdsConfigs', 'google_ads_configs');
      const { error } = await supabase
        .from('google_ads_configs')
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (error) {
        debugDatabase.error('deactivateAllGoogleAdsConfigs', 'google_ads_configs', error);
        throw error;
      }
      
      debugDatabase.success('deactivateAllGoogleAdsConfigs', 'google_ads_configs', { updated: true });
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error deactivating all Google Ads configs', error);
      throw error;
    }
  }

  // Disconnect integration
  static async disconnectIntegration(platform: string): Promise<void> {
    try {
      debugDatabase.query('disconnectIntegration', 'integrations');
      
      // Update integration table
      const { error: integrationError } = await supabase
        .from('integrations')
        .update({ 
          connected: false,
          config: {},
          last_sync: null
        })
        .eq('platform', platform);

      if (integrationError) {
        debugDatabase.error('disconnectIntegration', 'integrations', integrationError);
        throw integrationError;
      }

      // Clear client account references for this platform
      // Get all clients that have this platform in their accounts
      const { data: clients, error: fetchError } = await supabase
        .from('clients')
        .select('id, accounts')
        .not('accounts', 'is', null);

      if (!fetchError && clients) {
        // Update each client to remove the platform reference
        for (const client of clients) {
          if (client.accounts && client.accounts[platform]) {
            const updatedAccounts = { ...client.accounts };
            delete updatedAccounts[platform];
            
            const { error: updateError } = await supabase
              .from('clients')
              .update({ accounts: updatedAccounts })
              .eq('id', client.id);

            if (updateError) {
              console.warn(`Failed to clear ${platform} reference for client ${client.id}:`, updateError);
            }
          }
        }
      }

      debugDatabase.success('disconnectIntegration', 'integrations', { platform });
    } catch (error) {
      debugLogger.error('DatabaseService', 'Error disconnecting integration', error);
      throw error;
    }
  }
}
