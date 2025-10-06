import axios, { AxiosInstance } from 'axios';
import {
    GHLCampaign,
    GHLContact,
    GHLError,
    GHLOpportunity,
    GHLPipeline,
    GHLResponse,
    GHLWebhook,
} from '../types/gohighlevel.js';

export class GoHighLevelClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://services.leadconnectorhq.com';

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const ghlError: GHLError = {
          message: error.response?.data?.message || error.message,
          code: error.response?.data?.code,
          details: error.response?.data,
        };
        throw ghlError;
      }
    );
  }

  // Contacts API (API 2.0)
  async getContacts(locationId: string, params?: {
    limit?: number;
    startAfterId?: string;
    query?: string;
  }): Promise<GHLResponse<GHLContact[]>> {
    const response = await this.client.get(`/contacts/location/${locationId}`, {
      params,
    });
    return response.data;
  }

  async getContact(contactId: string): Promise<GHLResponse<GHLContact>> {
    const response = await this.client.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(contact: Partial<GHLContact>, locationId: string): Promise<GHLResponse<GHLContact>> {
    const response = await this.client.post(`/contacts/location/${locationId}`, contact);
    return response.data;
  }

  async updateContact(contactId: string, contact: Partial<GHLContact>): Promise<GHLResponse<GHLContact>> {
    const response = await this.client.put(`/contacts/${contactId}`, contact);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<GHLResponse<void>> {
    const response = await this.client.delete(`/contacts/${contactId}`);
    return response.data;
  }

  // Campaigns API
  async getCampaigns(locationId: string, params?: {
    limit?: number;
    startAfterId?: string;
    status?: string;
  }): Promise<GHLResponse<GHLCampaign[]>> {
    const response = await this.client.get(`/campaigns/location/${locationId}`, {
      params,
    });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<GHLResponse<GHLCampaign>> {
    const response = await this.client.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(campaign: Partial<GHLCampaign>, locationId: string): Promise<GHLResponse<GHLCampaign>> {
    const response = await this.client.post(`/campaigns/location/${locationId}`, campaign);
    return response.data;
  }

  async updateCampaign(campaignId: string, campaign: Partial<GHLCampaign>): Promise<GHLResponse<GHLCampaign>> {
    const response = await this.client.put(`/campaigns/${campaignId}`, campaign);
    return response.data;
  }

  // Opportunities API
  async getOpportunities(locationId: string, params?: {
    limit?: number;
    startAfterId?: string;
    contactId?: string;
    pipelineId?: string;
  }): Promise<GHLResponse<GHLOpportunity[]>> {
    const response = await this.client.get(`/opportunities/location/${locationId}`, {
      params,
    });
    return response.data;
  }

  async getOpportunity(opportunityId: string): Promise<GHLResponse<GHLOpportunity>> {
    const response = await this.client.get(`/opportunities/${opportunityId}`);
    return response.data;
  }

  async createOpportunity(opportunity: Partial<GHLOpportunity>, locationId: string): Promise<GHLResponse<GHLOpportunity>> {
    const response = await this.client.post(`/opportunities/location/${locationId}`, opportunity);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, opportunity: Partial<GHLOpportunity>): Promise<GHLResponse<GHLOpportunity>> {
    const response = await this.client.put(`/opportunities/${opportunityId}`, opportunity);
    return response.data;
  }

  // Pipelines API
  async getPipelines(locationId: string): Promise<GHLResponse<GHLPipeline[]>> {
    const response = await this.client.get(`/pipelines/location/${locationId}`);
    return response.data;
  }

  async getPipeline(pipelineId: string): Promise<GHLResponse<GHLPipeline>> {
    const response = await this.client.get(`/pipelines/${pipelineId}`);
    return response.data;
  }

  // Webhooks API
  async getWebhooks(locationId: string): Promise<GHLResponse<GHLWebhook[]>> {
    const response = await this.client.get(`/webhooks/location/${locationId}`);
    return response.data;
  }

  async createWebhook(webhook: Partial<GHLWebhook>, locationId: string): Promise<GHLResponse<GHLWebhook>> {
    const response = await this.client.post(`/webhooks/location/${locationId}`, webhook);
    return response.data;
  }

  async updateWebhook(webhookId: string, webhook: Partial<GHLWebhook>): Promise<GHLResponse<GHLWebhook>> {
    const response = await this.client.put(`/webhooks/${webhookId}`, webhook);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<GHLResponse<void>> {
    const response = await this.client.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // Locations API
  async getLocations(): Promise<GHLResponse<any[]>> {
    const response = await this.client.get('/locations');
    return response.data;
  }

  async getLocation(locationId: string): Promise<GHLResponse<any>> {
    const response = await this.client.get(`/locations/${locationId}`);
    return response.data;
  }
}
