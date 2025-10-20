import { debugDatabase, debugLogger } from '@/lib/debug';
import type { Database } from '@/lib/supabase';
import { supabaseHelpers } from '@/lib/supabase';

// Types
export type Client = Database['public']['Tables']['clients']['Row'];
export type Integration = Database['public']['Tables']['integrations']['Row'];
export type Metrics = Database['public']['Tables']['metrics']['Row'];

export interface ClientWithAccounts extends Client {
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
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
        type: 'Client',
        location: 'N/A',
        logo_url: clientData.logo_url,
        status: 'active' as const,
        services: {
          facebookAds: !!clientData.accounts.facebookAds,
          googleAds: !!clientData.accounts.googleAds,
          crm: !!clientData.accounts.goHighLevel,
          revenue: !!clientData.accounts.googleSheets,
        },
        accounts: clientData.accounts,
        conversion_actions: clientData.conversionActions || {},
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
    try {
      return await supabaseHelpers.getIntegrations();
    } catch (error) {
      // Fallback to localStorage
      return this.getIntegrationsFromLocalStorage();
    }
  }

  static async getIntegration(platform: string): Promise<Integration | null> {
    try {
      return await supabaseHelpers.getIntegration(platform);
    } catch (error) {
      // Fallback to localStorage
      return this.getIntegrationFromLocalStorage(platform);
    }
  }

  static async saveIntegration(platform: string, integrationData: {
    connected: boolean;
    accountName?: string;
    accountId?: string;
    lastSync?: string;
    config: Record<string, any>;
  }): Promise<Integration> {
    debugDatabase.query('UPSERT', 'integrations', { platform, ...integrationData });
    try {
      const integration = await supabaseHelpers.upsertIntegration({
        platform: platform as any,
        connected: integrationData.connected,
        account_name: integrationData.accountName,
        account_id: integrationData.accountId,
        last_sync: integrationData.lastSync,
        config: integrationData.config
      });

      debugDatabase.success('UPSERT', 'integrations', integration);

      // Also save to localStorage
      this.saveIntegrationToLocalStorage(platform, integrationData);

      return integration;
    } catch (error) {
      debugDatabase.error('UPSERT', 'integrations', error);
      // Fallback to localStorage
      return this.saveIntegrationToLocalStorage(platform, integrationData);
    }
  }

  static async deleteIntegration(platform: string): Promise<void> {
    try {
      await supabaseHelpers.deleteIntegration(platform);

      // Also remove from localStorage
      this.deleteIntegrationFromLocalStorage(platform);
    } catch (error) {
      // Fallback to localStorage
      this.deleteIntegrationFromLocalStorage(platform);
    }
  }

  // Metrics operations
  static async getMetrics(clientId: string, platform?: string, dateRange?: { start: string; end: string }): Promise<Metrics[]> {
    try {
      return await supabaseHelpers.getMetrics(clientId, platform, dateRange);
    } catch (error) {
      return [];
    }
  }

  static async saveMetrics(clientId: string, platform: string, date: string, metrics: Record<string, any>): Promise<Metrics> {
    try {
      return await supabaseHelpers.saveMetrics({
        client_id: clientId,
        platform: platform as any,
        date,
        metrics
      });
    } catch (error) {
      throw error;
    }
  }

  // Health check
  static async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      return await supabaseHelpers.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // LocalStorage fallback methods
  private static getClientsFromLocalStorage(): Client[] {
    try {
      const clients = localStorage.getItem('clients');
      return clients ? JSON.parse(clients) : [];
    } catch (error) {
      return [];
    }
  }

  private static getClientFromLocalStorage(id: string): Client | null {
    const clients = this.getClientsFromLocalStorage();
    return clients.find(client => client.id === id) || null;
  }

  private static createClientInLocalStorage(clientData: any): Client {
    const newClient: Client = {
      id: `client${Date.now()}`,
      name: clientData.name,
      type: clientData.type,
      location: clientData.location,
      logo_url: clientData.logo_url,
      status: 'active',
      services: clientData.services,
      accounts: clientData.accounts || {},
      shareable_link: `https://eventmetrics.com/share/${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const clients = this.getClientsFromLocalStorage();
    clients.push(newClient);
    localStorage.setItem('clients', JSON.stringify(clients));

    return newClient;
  }

  private static updateClientInLocalStorage(id: string, updates: Partial<Client>): Client {
    const clients = this.getClientsFromLocalStorage();
    const clientIndex = clients.findIndex(client => client.id === id);

    if (clientIndex !== -1) {
      clients[clientIndex] = {
        ...clients[clientIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('clients', JSON.stringify(clients));
      return clients[clientIndex];
    }

    throw new Error('Client not found');
  }

  private static deleteClientFromLocalStorage(id: string): void {
    const clients = this.getClientsFromLocalStorage();
    const filteredClients = clients.filter(client => client.id !== id);
    localStorage.setItem('clients', JSON.stringify(filteredClients));
  }

  private static saveClientToLocalStorage(client: Client): void {
    const clients = this.getClientsFromLocalStorage();
    const existingIndex = clients.findIndex(c => c.id === client.id);

    if (existingIndex !== -1) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }

    localStorage.setItem('clients', JSON.stringify(clients));
  }

  private static getIntegrationsFromLocalStorage(): Integration[] {
    try {
      const config = localStorage.getItem('integrationConfig');
      if (!config) {return [];}

      const parsed = JSON.parse(config);
      return Object.entries(parsed).map(([platform, data]: [string, any]) => ({
        id: `${platform}_integration`,
        platform: platform as any,
        connected: data.connected || false,
        account_name: data.accountName,
        account_id: data.accountId,
        last_sync: data.lastSync,
        config: data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      return [];
    }
  }

  private static getIntegrationFromLocalStorage(platform: string): Integration | null {
    const integrations = this.getIntegrationsFromLocalStorage();
    return integrations.find(integration => integration.platform === platform) || null;
  }

  private static saveIntegrationToLocalStorage(platform: string, data: any): Integration {
    const integration: Integration = {
      id: `${platform}_integration`,
      platform: platform as any,
      connected: data.connected || false,
      account_name: data.accountName,
      account_id: data.accountId,
      last_sync: data.lastSync,
      config: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update localStorage integrationConfig
    try {
      const existingConfig = JSON.parse(localStorage.getItem('integrationConfig') || '{}');
      existingConfig[platform] = data;
      localStorage.setItem('integrationConfig', JSON.stringify(existingConfig));
    } catch (error) {
    }

    return integration;
  }

  private static deleteIntegrationFromLocalStorage(platform: string): void {
    try {
      const existingConfig = JSON.parse(localStorage.getItem('integrationConfig') || '{}');
      delete existingConfig[platform];
      localStorage.setItem('integrationConfig', JSON.stringify(existingConfig));
    } catch (error) {
    }
  }

  // Google Ads Configuration methods
  static async getGoogleAdsConfigs(): Promise<any[]> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('google_ads_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {throw error;}
      return data || [];
    } catch (error) {
      return this.getGoogleAdsConfigsFromLocalStorage();
    }
  }

  static async saveGoogleAdsConfig(config: {
    developerToken: string;
    clientId: string;
    clientSecret: string;
    isActive: boolean;
  }): Promise<any> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('google_ads_configs')
        .insert({
          developer_token: config.developerToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          is_active: config.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return this.saveGoogleAdsConfigToLocalStorage(config);
    }
  }

  static async updateGoogleAdsConfig(id: string, updates: Partial<{
    developerToken: string;
    clientId: string;
    clientSecret: string;
    isActive: boolean;
  }>): Promise<any> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.developerToken !== undefined) {updateData.developer_token = updates.developerToken;}
      if (updates.clientId !== undefined) {updateData.client_id = updates.clientId;}
      if (updates.clientSecret !== undefined) {updateData.client_secret = updates.clientSecret;}
      if (updates.isActive !== undefined) {updateData.is_active = updates.isActive;}

      const { data, error } = await supabaseHelpers.supabase
        .from('google_ads_configs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return this.updateGoogleAdsConfigInLocalStorage(id, updates);
    }
  }

  static async deactivateAllGoogleAdsConfigs(): Promise<void> {
    try {
      await supabaseHelpers.supabase
        .from('google_ads_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all records
    } catch (error) {
      this.deactivateAllGoogleAdsConfigsInLocalStorage();
    }
  }

  static async deleteGoogleAdsConfig(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseHelpers.supabase
        .from('google_ads_configs')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      return true;
    } catch (error) {
      return this.deleteGoogleAdsConfigFromLocalStorage(id);
    }
  }

  // LocalStorage fallback methods for Google Ads configs
  private static getGoogleAdsConfigsFromLocalStorage(): any[] {
    try {
      const configs = localStorage.getItem('googleAdsConfigs');
      return configs ? JSON.parse(configs) : [];
    } catch (error) {
      return [];
    }
  }

  private static saveGoogleAdsConfigToLocalStorage(config: any): any {
    const configs = this.getGoogleAdsConfigsFromLocalStorage();
    const newConfig = {
      id: `config_${Date.now()}`,
      ...config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    configs.push(newConfig);
    localStorage.setItem('googleAdsConfigs', JSON.stringify(configs));
    return newConfig;
  }

  private static updateGoogleAdsConfigInLocalStorage(id: string, updates: any): any {
    const configs = this.getGoogleAdsConfigsFromLocalStorage();
    const index = configs.findIndex((config: any) => config.id === id);
    
    if (index !== -1) {
      configs[index] = { ...configs[index], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('googleAdsConfigs', JSON.stringify(configs));
      return configs[index];
    }
    
    return null;
  }

  private static deactivateAllGoogleAdsConfigsInLocalStorage(): void {
    const configs = this.getGoogleAdsConfigsFromLocalStorage();
    configs.forEach((config: any) => {
      config.isActive = false;
      config.updated_at = new Date().toISOString();
    });
    localStorage.setItem('googleAdsConfigs', JSON.stringify(configs));
  }

  // User Google Ads Authentication methods
  static async getUserGoogleAdsAuth(userId: string): Promise<any> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('user_google_ads_auth')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return this.getUserGoogleAdsAuthFromLocalStorage(userId);
    }
  }

  static async saveUserGoogleAdsAuth(userAuth: {
    userId: string;
    googleUserId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string;
    scope: string[];
    connectedAt: string;
    lastUsedAt?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('user_google_ads_auth')
        .upsert({
          user_id: userAuth.userId,
          google_user_id: userAuth.googleUserId,
          access_token: userAuth.accessToken,
          refresh_token: userAuth.refreshToken,
          token_expires_at: userAuth.tokenExpiresAt,
          scope: userAuth.scope,
          connected_at: userAuth.connectedAt,
          last_used_at: userAuth.lastUsedAt || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return this.saveUserGoogleAdsAuthToLocalStorage(userAuth);
    }
  }

  static async updateUserGoogleAdsAuth(userAuth: {
    userId: string;
    googleUserId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string;
    scope: string[];
    connectedAt: string;
    lastUsedAt?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('user_google_ads_auth')
        .update({
          access_token: userAuth.accessToken,
          refresh_token: userAuth.refreshToken,
          token_expires_at: userAuth.tokenExpiresAt,
          last_used_at: userAuth.lastUsedAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userAuth.userId)
        .select()
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return this.updateUserGoogleAdsAuthInLocalStorage(userAuth);
    }
  }

  static async deleteUserGoogleAdsAuth(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseHelpers.supabase
        .from('user_google_ads_auth')
        .delete()
        .eq('user_id', userId);

      if (error) {throw error;}
      return true;
    } catch (error) {
      return this.deleteUserGoogleAdsAuthFromLocalStorage(userId);
    }
  }

  static async getActiveGoogleAdsConfig(): Promise<any> {
    try {
      const { data, error } = await supabaseHelpers.supabase
        .from('google_ads_configs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {throw error;}
      return data;
    } catch (error) {
      return null;
    }
  }

  // LocalStorage fallback methods for user Google Ads auth
  private static getUserGoogleAdsAuthFromLocalStorage(userId: string): any {
    try {
      const auths = localStorage.getItem('userGoogleAdsAuths');
      const authList = auths ? JSON.parse(auths) : [];
      return authList.find((auth: any) => auth.userId === userId) || null;
    } catch (error) {
      return null;
    }
  }

  private static saveUserGoogleAdsAuthToLocalStorage(userAuth: any): any {
    try {
      const auths = localStorage.getItem('userGoogleAdsAuths');
      const authList = auths ? JSON.parse(auths) : [];
      
      const existingIndex = authList.findIndex((auth: any) => auth.userId === userAuth.userId);
      const authData = {
        ...userAuth,
        id: `auth_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        authList[existingIndex] = authData;
      } else {
        authList.push(authData);
      }

      localStorage.setItem('userGoogleAdsAuths', JSON.stringify(authList));
      return authData;
    } catch (error) {
      return null;
    }
  }

  private static updateUserGoogleAdsAuthInLocalStorage(userAuth: any): any {
    try {
      const auths = localStorage.getItem('userGoogleAdsAuths');
      const authList = auths ? JSON.parse(auths) : [];
      
      const existingIndex = authList.findIndex((auth: any) => auth.userId === userAuth.userId);
      if (existingIndex >= 0) {
        authList[existingIndex] = {
          ...authList[existingIndex],
          ...userAuth,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('userGoogleAdsAuths', JSON.stringify(authList));
        return authList[existingIndex];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private static deleteUserGoogleAdsAuthFromLocalStorage(userId: string): boolean {
    try {
      const auths = localStorage.getItem('userGoogleAdsAuths');
      const authList = auths ? JSON.parse(auths) : [];
      
      const filteredList = authList.filter((auth: any) => auth.userId !== userId);
      localStorage.setItem('userGoogleAdsAuths', JSON.stringify(filteredList));
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default DatabaseService;
