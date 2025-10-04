import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

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
  facebook_ads_account_id?: string;
  google_ads_account_id?: string;
  gohighlevel_account_id?: string;
  google_sheets_account_id?: string;
  conversion_actions?: {
    facebookAds?: string;
    googleAds?: string;
  };
  accounts?: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
  shareable_link?: string;
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
      goHighLevel?: string;
      googleSheets?: string;
    };
    conversionActions?: {
      facebookAds?: string;
      googleAds?: string;
    };
  }): Promise<Client> {
    try {
      const newClient = {
        name: clientData.name,
        logo_url: clientData.logo_url,
        status: 'active' as const,
        facebook_ads_account_id: clientData.accounts.facebookAds,
        google_ads_account_id: clientData.accounts.googleAds,
        gohighlevel_account_id: clientData.accounts.goHighLevel,
        google_sheets_account_id: clientData.accounts.googleSheets,
        conversion_actions: clientData.conversionActions || {},
        accounts: clientData.accounts,
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
      const client = await supabaseHelpers.updateClient(id, updates);
      debugLogger.info('DatabaseService', 'Client updated successfully in database', { id, updates });
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
}
