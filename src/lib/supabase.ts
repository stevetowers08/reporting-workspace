import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          type: string;
          location: string;
          logo_url?: string;
          status: 'active' | 'paused' | 'inactive';
          services: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          location: string;
          logo_url?: string;
          status?: 'active' | 'paused' | 'inactive';
          services: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts?: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          location?: string;
          logo_url?: string;
          status?: 'active' | 'paused' | 'inactive';
          services?: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts?: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link?: string;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          platform?: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected?: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config?: Record<string, any>;
          updated_at?: string;
        };
      };
      metrics: {
        Row: {
          id: string;
          client_id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date: string;
          metrics: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date: string;
          metrics: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          platform?: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date?: string;
          metrics?: Record<string, any>;
        };
      };
    };
  };
}

// Helper functions
export const supabaseHelpers = {
  // Client operations
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getClient(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createClient(client: Database['public']['Tables']['clients']['Insert']) {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClient(id: string, updates: Database['public']['Tables']['clients']['Update']) {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteClient(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Integration operations
  async getIntegrations() {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getIntegration(platform: string) {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertIntegration(integration: Database['public']['Tables']['integrations']['Insert']) {
    const { data, error } = await supabase
      .from('integrations')
      .upsert({ ...integration, updated_at: new Date().toISOString() }, { onConflict: 'platform' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteIntegration(platform: string) {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('platform', platform);

    if (error) throw error;
  },

  // Metrics operations
  async getMetrics(clientId: string, platform?: string, dateRange?: { start: string; end: string }) {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async saveMetrics(metrics: Database['public']['Tables']['metrics']['Insert']) {
    const { data, error } = await supabase
      .from('metrics')
      .insert(metrics)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMetrics(id: string, updates: Database['public']['Tables']['metrics']['Update']) {
    const { data, error } = await supabase
      .from('metrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Utility functions
  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('count')
        .limit(1);

      return { healthy: !error, error: error?.message };
    } catch (error) {
      return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default supabase;
