import { debugDatabase } from '@/lib/debug';
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
      return clients;
    } catch (error) {
      debugDatabase.error('SELECT', 'clients', error);
      console.error('Error fetching clients:', error);
      // Fallback to localStorage
      return this.getClientsFromLocalStorage();
    }
  }

  static async getClientById(id: string): Promise<Client | null> {
    try {
      return await supabaseHelpers.getClient(id);
    } catch (error) {
      console.error('Error fetching client:', error);
      // Fallback to localStorage
      return this.getClientFromLocalStorage(id);
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

      // Also save to localStorage as backup
      this.saveClientToLocalStorage(client);

      return client;
    } catch (error) {
      console.error('Error creating client:', error);
      // Fallback to localStorage
      return this.createClientInLocalStorage(clientData);
    }
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    try {
      const client = await supabaseHelpers.updateClient(id, updates);

      // Also update localStorage
      this.updateClientInLocalStorage(id, updates);

      return client;
    } catch (error) {
      console.error('Error updating client:', error);
      // Fallback to localStorage
      return this.updateClientInLocalStorage(id, updates);
    }
  }

  static async deleteClient(id: string): Promise<void> {
    try {
      await supabaseHelpers.deleteClient(id);

      // Also remove from localStorage
      this.deleteClientFromLocalStorage(id);
    } catch (error) {
      console.error('Error deleting client:', error);
      // Fallback to localStorage
      this.deleteClientFromLocalStorage(id);
    }
  }

  // Integration operations
  static async getIntegrations(): Promise<Integration[]> {
    try {
      return await supabaseHelpers.getIntegrations();
    } catch (error) {
      console.error('Error fetching integrations:', error);
      // Fallback to localStorage
      return this.getIntegrationsFromLocalStorage();
    }
  }

  static async getIntegration(platform: string): Promise<Integration | null> {
    try {
      return await supabaseHelpers.getIntegration(platform);
    } catch (error) {
      console.error('Error fetching integration:', error);
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
      console.error('Error saving integration:', error);
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
      console.error('Error deleting integration:', error);
      // Fallback to localStorage
      this.deleteIntegrationFromLocalStorage(platform);
    }
  }

  // Metrics operations
  static async getMetrics(clientId: string, platform?: string, dateRange?: { start: string; end: string }): Promise<Metrics[]> {
    try {
      return await supabaseHelpers.getMetrics(clientId, platform, dateRange);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

  static async saveMetrics(clientId: string, platform: string, date: string, metrics: Record<string, any>): Promise<Metrics> {
    try {
      return await supabaseHelpers.saveMetrics({
        clientId,
        platform: platform as any,
        date,
        metrics
      });
    } catch (error) {
      console.error('Error saving metrics:', error);
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
      console.error('Error reading clients from localStorage:', error);
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
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
      if (!config) return [];

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
      console.error('Error reading integrations from localStorage:', error);
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
      console.error('Error updating integration config in localStorage:', error);
    }

    return integration;
  }

  private static deleteIntegrationFromLocalStorage(platform: string): void {
    try {
      const existingConfig = JSON.parse(localStorage.getItem('integrationConfig') || '{}');
      delete existingConfig[platform];
      localStorage.setItem('integrationConfig', JSON.stringify(existingConfig));
    } catch (error) {
      console.error('Error deleting integration from localStorage:', error);
    }
  }
}
