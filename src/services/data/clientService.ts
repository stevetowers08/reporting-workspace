import { debugLogger } from '@/lib/debug';

export interface ClientIntegrations {
  facebookAds?: {
    accessToken: string;
    adAccountId: string;
    connected: boolean;
    lastSync?: string;
  };
  googleAds?: {
    accessToken: string;
    customerId: string;
    developerToken: string;
    connected: boolean;
    lastSync?: string;
  };
  goHighLevel?: {
    apiKey: string;
    locationId: string;
    connected: boolean;
    lastSync?: string;
  };
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  logo?: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'inactive';
  monthlySpend: number;
  lastReportSent: string;
  contactEmail: string;
  contactName: string;
  contactPhone?: string;
  timezone: string;
  currency: string;
  integrations: ClientIntegrations;
  reportingSchedule: {
    weekly: boolean;
    monthly: boolean;
    customSchedules: Array<{
      id: string;
      name: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
      time: string; // HH:mm format
      enabled: boolean;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export class ClientService {
  private static clients: Client[] = [];

  static async getAllClients(): Promise<Client[]> {
    // In a real app, this would fetch from a database
    return [...this.clients];
  }

  static async getClientById(id: string): Promise<Client | null> {
    return this.clients.find(client => client.id === id) || null;
  }

  static async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const newClient: Client = {
      ...clientData,
      id: `client_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.push(newClient);
    return newClient;
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    const clientIndex = this.clients.findIndex(client => client.id === id);

    if (clientIndex === -1) {
      return null;
    }

    this.clients[clientIndex] = {
      ...this.clients[clientIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.clients[clientIndex];
  }

  static async deleteClient(id: string): Promise<boolean> {
    const clientIndex = this.clients.findIndex(client => client.id === id);

    if (clientIndex === -1) {
      return false;
    }

    this.clients.splice(clientIndex, 1);
    return true;
  }

  static async updateIntegrations(clientId: string, integrations: Partial<ClientIntegrations>): Promise<Client | null> {
    const client = await this.getClientById(clientId);

    if (!client) {
      return null;
    }

    const updatedClient = await this.updateClient(clientId, {
      integrations: {
        ...client.integrations,
        ...integrations
      }
    });

    return updatedClient;
  }

  static async testIntegrations(clientId: string): Promise<{
    facebookAds: boolean;
    googleAds: boolean;
    goHighLevel: boolean;
  }> {
    const client = await this.getClientById(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    const results = {
      facebookAds: false,
      googleAds: false,
      goHighLevel: false
    };

    // Test Facebook Ads connection
    if (client.integrations.facebookAds?.accessToken && client.integrations.facebookAds?.adAccountId) {
      try {
        const { FacebookAdsService } = await import('../api/facebookAdsService');
        results.facebookAds = await FacebookAdsService.authenticate(
          client.integrations.facebookAds.accessToken,
          client.integrations.facebookAds.adAccountId
        );
      } catch (error) {
        debugLogger.error('ClientService', 'Facebook Ads test failed', error);
      }
    }

    // Test Google Ads connection
    if (client.integrations.googleAds?.accessToken &&
      client.integrations.googleAds?.customerId &&
      client.integrations.googleAds?.developerToken) {
      try {
        const { GoogleAdsService } = await import('../api/googleAdsService');
        results.googleAds = await GoogleAdsService.authenticate(
          client.integrations.googleAds.accessToken,
          client.integrations.googleAds.customerId,
          client.integrations.googleAds.developerToken
        );
      } catch (error) {
        debugLogger.error('ClientService', 'Google Ads test failed', error);
      }
    }

    // Test Go High Level connection
    if (client.integrations.goHighLevel?.apiKey && client.integrations.goHighLevel?.locationId) {
      try {
        const { GoHighLevelService } = await import('../api/goHighLevelService');
        results.goHighLevel = await GoHighLevelService.authenticate(
          client.integrations.goHighLevel.apiKey,
          client.integrations.goHighLevel.locationId
        );
      } catch (error) {
        debugLogger.error('ClientService', 'Go High Level test failed', error);
      }
    }

    // Update connection status
    await this.updateIntegrations(clientId, {
      facebookAds: client.integrations.facebookAds ? {
        ...client.integrations.facebookAds,
        connected: results.facebookAds,
        lastSync: results.facebookAds ? new Date().toISOString() : undefined
      } : undefined,
      googleAds: client.integrations.googleAds ? {
        ...client.integrations.googleAds,
        connected: results.googleAds,
        lastSync: results.googleAds ? new Date().toISOString() : undefined
      } : undefined,
      goHighLevel: client.integrations.goHighLevel ? {
        ...client.integrations.goHighLevel,
        connected: results.goHighLevel,
        lastSync: results.goHighLevel ? new Date().toISOString() : undefined
      } : undefined
    });

    return results;
  }
}
